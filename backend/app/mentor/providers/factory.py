import logging
from typing import Optional
from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI, AzureChatOpenAI
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI

from app.mentor.config.settings import Settings, get_settings
from app.mentor.providers.base import (
    LLMProvider,
    OpenAIConfig,
    AzureOpenAIConfig,
    MentorLLM,
)

logger = logging.getLogger("mentor.providers.factory")


class ProviderFactory:
    """
    Factory class for creating LLM and MentorLLM instances.
    Primary provider is always determined by LLM_PROVIDER in .env.
    If the primary provider is not reachable, the factory automatically
    wires the next available provider as a fallback.
    """

    # ─────────────────────────────────────────────────────────────────────────
    # Internal builder helpers
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _build_openai(settings: Settings) -> BaseChatModel:
        """Build a ChatOpenAI model from settings. Raises if key is missing."""
        if not settings.is_openai_configured:
            raise ValueError(
                "LLM_PROVIDER is 'openai' but OPENAI_API_KEY is not set in .env. "
                "Please add: OPENAI_API_KEY=sk-..."
            )
        logger.info(
            f"[MENTOR PRIMARY PROVIDER: OpenAI] MODEL: {settings.openai_model}"
        )
        return ChatOpenAI(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            temperature=settings.openai_temperature,
            max_tokens=settings.openai_max_tokens,
            max_retries=2,
            timeout=60,
        )

    @staticmethod
    def _build_azure(settings: Settings) -> BaseChatModel:
        """Build an AzureChatOpenAI model from settings. Raises if config is incomplete."""
        if not settings.is_azure_configured:
            raise ValueError(
                "LLM_PROVIDER is 'azure' but Azure OpenAI is not fully configured. "
                "Please set: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, "
                "AZURE_OPENAI_CHAT_DEPLOYMENT_NAME in .env."
            )
        if not settings.azure_openai_deployment:
            raise ValueError(
                "AZURE_OPENAI_CHAT_DEPLOYMENT_NAME is missing or empty in .env. "
                "Go to Azure AI Foundry -> Deployments to find your deployment name."
            )

        # ── Startup validation banner ─────────────────────────────────────────
        logger.info("=" * 60)
        logger.info("AZURE ENDPOINT       : %s", settings.azure_openai_endpoint)
        logger.info("AZURE API VERSION    : %s", settings.azure_openai_api_version)
        logger.info("AZURE DEPLOYMENT NAME: %s", settings.azure_openai_deployment)
        logger.info("AZURE API KEY set    : %s (len=%d)",
                    bool(settings.azure_openai_api_key), len(settings.azure_openai_api_key))
        logger.info("=" * 60)

        return AzureChatOpenAI(
            api_key=settings.azure_openai_api_key,
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
            azure_deployment=settings.azure_openai_deployment,
            temperature=settings.openai_temperature,
            max_tokens=settings.openai_max_tokens,
            max_retries=2,
            timeout=60,
        )

    @staticmethod
    def _build_groq(settings: Settings) -> BaseChatModel:
        """Build a ChatGroq model. Raises if key is missing."""
        groq_key = getattr(settings, "GROQ_API_KEY", "")
        if not groq_key:
            raise ValueError(
                "LLM_PROVIDER is 'groq' but GROQ_API_KEY is not set in .env."
            )
        model = "llama-3.1-70b-versatile"
        logger.info(f"[MENTOR PRIMARY PROVIDER: Groq] MODEL: {model}")
        return ChatGroq(
            api_key=groq_key,
            model=model,
            temperature=0.2,
            max_tokens=2048,
        )

    @staticmethod
    def _build_google(settings: Settings) -> BaseChatModel:
        """Build a ChatGoogleGenerativeAI model. Raises if key is missing."""
        google_key = getattr(settings, "GOOGLE_API_KEY", "")
        if not google_key:
            raise ValueError(
                "LLM_PROVIDER is 'google' but GOOGLE_API_KEY is not set in .env."
            )
        model = "gemini-1.5-flash-latest"
        logger.info(f"[MENTOR PRIMARY PROVIDER: Google Gemini] MODEL: {model}")
        return ChatGoogleGenerativeAI(
            google_api_key=google_key,
            model=model,
            temperature=0.2,
            max_output_tokens=2048,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # Public factory method
    # ─────────────────────────────────────────────────────────────────────────

    @classmethod
    def build_mentor_llm(cls, settings: Optional[Settings] = None) -> MentorLLM:
        """
        Build and return a MentorLLM, honouring LLM_PROVIDER from .env.

        LLM_PROVIDER controls which provider is PRIMARY.
        The opposite configured provider (if available) is wired as FALLBACK.

        Supported values for LLM_PROVIDER:
          openai  → primary: OpenAI,        fallback: Azure (if available)
          azure   → primary: Azure OpenAI,  fallback: OpenAI (if available)
          groq    → primary: Groq,          fallback: Google (if available)
          google  → primary: Google Gemini, fallback: Groq (if available)
        """
        if settings is None:
            settings = get_settings()

        provider_str = (settings.llm_provider or "openai").strip().lower()

        # ── Build PRIMARY ─────────────────────────────────────────────────────
        primary_llm: Optional[BaseChatModel] = None
        primary_provider = LLMProvider.OPENAI  # enum label for MentorLLM

        if provider_str == "openai":
            primary_llm = cls._build_openai(settings)
            primary_provider = LLMProvider.OPENAI

        elif provider_str == "azure":
            primary_llm = cls._build_azure(settings)
            primary_provider = LLMProvider.AZURE_OPENAI

        elif provider_str == "groq":
            primary_llm = cls._build_groq(settings)
            primary_provider = LLMProvider.OPENAI   # OpenAI-compatible enum

        elif provider_str == "google":
            primary_llm = cls._build_google(settings)
            primary_provider = LLMProvider.OPENAI

        else:
            raise ValueError(
                f"Unknown LLM_PROVIDER='{provider_str}' in .env. "
                f"Supported values: openai | azure | groq | google"
            )

        # ── Build FALLBACK ────────────────────────────────────────────────────
        fallback_llm: Optional[BaseChatModel] = None
        fallback_label = "None"

        if provider_str == "openai":
            # Fallback: Azure, then Groq, then Google
            if settings.is_azure_configured:
                try:
                    fallback_llm = cls._build_azure(settings)
                    fallback_label = f"Azure OpenAI ({settings.azure_openai_deployment})"
                except Exception as e:
                    logger.warning(f"Could not build Azure fallback: {e}")
            if fallback_llm is None and getattr(settings, "GROQ_API_KEY", ""):
                try:
                    fallback_llm = cls._build_groq(settings)
                    fallback_label = "Groq (llama-3.1-70b-versatile)"
                except Exception as e:
                    logger.warning(f"Could not build Groq fallback: {e}")

        elif provider_str == "azure":
            # Fallback: OpenAI, then Groq
            if settings.is_openai_configured:
                try:
                    fallback_llm = cls._build_openai(settings)
                    fallback_label = f"OpenAI ({settings.openai_model})"
                except Exception as e:
                    logger.warning(f"Could not build OpenAI fallback: {e}")
            if fallback_llm is None and getattr(settings, "GROQ_API_KEY", ""):
                try:
                    fallback_llm = cls._build_groq(settings)
                    fallback_label = "Groq (llama-3.1-70b-versatile)"
                except Exception as e:
                    logger.warning(f"Could not build Groq fallback: {e}")

        elif provider_str == "groq":
            # Fallback: Google, then OpenAI
            if getattr(settings, "GOOGLE_API_KEY", ""):
                try:
                    fallback_llm = cls._build_google(settings)
                    fallback_label = "Google Gemini (gemini-1.5-flash-latest)"
                except Exception as e:
                    logger.warning(f"Could not build Google fallback: {e}")
            if fallback_llm is None and settings.is_openai_configured:
                try:
                    fallback_llm = cls._build_openai(settings)
                    fallback_label = f"OpenAI ({settings.openai_model})"
                except Exception as e:
                    logger.warning(f"Could not build OpenAI fallback: {e}")

        elif provider_str == "google":
            # Fallback: Groq, then OpenAI
            if getattr(settings, "GROQ_API_KEY", ""):
                try:
                    fallback_llm = cls._build_groq(settings)
                    fallback_label = "Groq (llama-3.1-70b-versatile)"
                except Exception as e:
                    logger.warning(f"Could not build Groq fallback: {e}")
            if fallback_llm is None and settings.is_openai_configured:
                try:
                    fallback_llm = cls._build_openai(settings)
                    fallback_label = f"OpenAI ({settings.openai_model})"
                except Exception as e:
                    logger.warning(f"Could not build OpenAI fallback: {e}")

        # ── Startup Summary ───────────────────────────────────────────────────
        primary_model_name = (
            getattr(primary_llm, "azure_deployment", None)
            or getattr(primary_llm, "deployment_name", None)
            or getattr(primary_llm, "model_name", None)
            or getattr(primary_llm, "model", None)
            or "unknown"
        )
        # For Azure the attribute is stored inside the kwargs dict in some LC versions
        if primary_model_name == "unknown" and provider_str == "azure":
            primary_model_name = settings.azure_openai_deployment or "unknown"

        logger.info("=" * 60)
        logger.info(f"MENTOR PRIMARY PROVIDER : {provider_str.upper()}")
        logger.info(f"MENTOR MODEL            : {primary_model_name}")
        logger.info(f"MENTOR FALLBACK PROVIDER: {fallback_label}")
        logger.info("=" * 60)

        return MentorLLM(
            llm=primary_llm,
            fallback_llm=fallback_llm,
            provider=primary_provider,
        )
