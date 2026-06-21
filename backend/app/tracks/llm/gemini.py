"""
Shared LLM client — Tracks AI.

Strategy
--------
Primary   : Gemini 2.0 Flash Lite   (cheapest Gemini, very high free quota)
Fallback  : Groq  llama-3.3-70b     (free tier, fast, great structured output)

Why Gemini 2.0 Flash Lite?
- Lowest cost per token of all current Gemini models
- 1 million TPM free quota on AI Studio
- Supports .with_structured_output() via LangChain
- Much less likely to exhaust quota than 2.5 Flash during development

Why Groq fallback?
- Completely free tier (14,400 req/day, 500K tokens/day)
- llama-3.3-70b is strong enough for structured roadmap output
- Kicks in automatically on any Gemini quota / API error

Usage
-----
All agents call get_llm() — the correct backend is selected automatically.
If Gemini fails during .invoke(), LangChain .with_fallbacks() auto-retries
with Groq. No agent code changes required.
"""

import logging
import os

logger = logging.getLogger("uvicorn.error")

# Default output-token ceiling applied at construction time for both
# providers, using each provider's own correctly-named field
# (ChatGoogleGenerativeAI: max_output_tokens, ChatGroq: max_tokens). This is
# intentionally NOT applied via .bind() on the combined fallback runnable —
# .bind() injects whatever kwarg name you give it into every runnable in
# the chain, and Gemini/Groq don't share a field name for this setting. A
# kwarg unrecognized by the active provider's underlying SDK client raises
# from inside that provider's _generate(), which RunnableWithFallbacks
# swallows and replaces with the *first* (Gemini) error — silently breaking
# fallback while looking, from the caller's perspective, like Groq was
# never attempted at all.
DEFAULT_MAX_OUTPUT_TOKENS = 3072

# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------


class QuotaExhaustedError(Exception):
    """Raised when all LLM providers (Gemini + Groq) are exhausted."""
    pass


# ---------------------------------------------------------------------------
# Internal state
# ---------------------------------------------------------------------------

_llm = None
_using_fallback: bool = False


# ---------------------------------------------------------------------------
# Error classification helpers
# ---------------------------------------------------------------------------

_QUOTA_SIGNALS = (
    "quota",
    "rate limit",
    "429",
    "resource exhausted",
    "too many requests",
    "billing",
    "exceeded",
    "limit",
)


def _is_quota_or_api_error(exc: Exception) -> bool:
    """Return True for errors that should trigger the Groq fallback."""
    msg = str(exc).lower()
    return any(signal in msg for signal in _QUOTA_SIGNALS)


# ---------------------------------------------------------------------------
# LLM builders
# ---------------------------------------------------------------------------

def _build_gemini(max_output_tokens: int = DEFAULT_MAX_OUTPUT_TOKENS):
    """Build the primary Gemini 2.0 Flash Lite client."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from app.core.config import settings

    api_key = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set in backend/.env. "
            "Get a free key at https://aistudio.google.com/app/apikey"
        )

    logger.info(
        "[LLM] Initializing primary: gemini-2.0-flash-lite (max_output_tokens=%d)",
        max_output_tokens,
    )
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-lite",   # cheapest Gemini, ample free quota
        temperature=0,
        google_api_key=api_key,
        max_retries=2,                   # built-in HTTP-level retry for transient errors
        max_output_tokens=max_output_tokens,
    )


def _build_groq(max_output_tokens: int = DEFAULT_MAX_OUTPUT_TOKENS):
    """Build the Groq fallback client (llama-3.3-70b-versatile, free tier)."""
    from langchain_groq import ChatGroq
    from app.core.config import settings

    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set in backend/.env and Gemini quota was exhausted. "
            "Get a free key at https://console.groq.com/keys"
        )

    logger.warning(
        "[LLM] Preparing Groq fallback: llama-3.3-70b-versatile (max_tokens=%d)",
        max_output_tokens,
    )
    return ChatGroq(
        model="llama-3.3-70b-versatile",  # best free Groq model for structured output
        temperature=0,
        groq_api_key=api_key,
        max_tokens=max_output_tokens,      # NOTE: ChatGroq's field is max_tokens,
                                            # NOT max_output_tokens (that's Gemini's
                                            # field name) — this distinction is the
                                            # root cause this constructor-time wiring
                                            # is specifically designed to avoid.
    )


# ---------------------------------------------------------------------------
# Logging wrapper
# ---------------------------------------------------------------------------

def _with_invocation_logging(model, label: str):
    """
    Wrap a chat model so every .invoke() call logs when it starts, succeeds,
    or fails — by label ("Gemini" / "Groq (fallback)"). This is the only
    reliable way to see what RunnableWithFallbacks is actually doing
    internally: its own .invoke() only ever re-raises the *first*
    provider's exception on total failure, which previously made it look
    like the fallback was never attempted even when it was (and failed for
    its own, separate reason). Wrapping each provider individually gives
    full visibility into both attempts regardless of which exception
    ultimately surfaces to the caller.
    """
    from langchain_core.runnables import RunnableLambda

    def _invoke(messages):
        logger.info("[LLM] %s invocation started", label)
        try:
            result = model.invoke(messages)
            logger.info("[LLM] %s succeeded", label)
            return result
        except Exception as exc:
            logger.error("[LLM] %s failed: %s", label, exc)
            raise

    return RunnableLambda(_invoke)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_llm():
    """
    Return the active LLM instance (lazy singleton).

    On first call → builds Gemini 2.0 Flash Lite with Groq as a fallback.
    LangChain's .with_fallbacks() means that if Gemini raises *during
    .invoke()* (e.g. 429 quota errors), it automatically retries with Groq.

    This is fully transparent to all agents — they call get_llm() and
    .with_structured_output() exactly as before.
    """
    global _llm, _using_fallback

    if _llm is None:
        gemini = None
        groq = None

        # Try to build Gemini
        try:
            gemini = _build_gemini()
        except RuntimeError as e:
            logger.warning("[LLM] Gemini not available: %s", e)

        # Try to build Groq
        try:
            groq = _build_groq()
        except RuntimeError as e:
            logger.warning("[LLM] Groq not available: %s", e)

        if gemini and groq:
            # Best case: Gemini primary with automatic Groq fallback. Both
            # providers are wrapped with invocation logging so a failed
            # fallback attempt is never silently invisible the way it was
            # before — see _with_invocation_logging() docstring.
            _llm = _with_invocation_logging(gemini, "Gemini").with_fallbacks(
                [_with_invocation_logging(groq, "Groq (fallback)")]
            )
            logger.info("[LLM] Ready: Gemini (primary) + Groq (fallback)")
        elif gemini:
            # Gemini only, no fallback
            _llm = gemini
            logger.info("[LLM] Ready: Gemini only (no Groq fallback configured)")
        elif groq:
            # Groq only (Gemini key missing)
            _llm = groq
            _using_fallback = True
            logger.info("[LLM] Ready: Groq only (Gemini not configured)")
        else:
            raise QuotaExhaustedError(
                "No LLM provider available. Set GOOGLE_API_KEY and/or "
                "GROQ_API_KEY in backend/.env"
            )

    return _llm


def reset_to_groq() -> None:
    """
    Force-switch the singleton to Groq.
    Called by agents when they catch a quota error mid-workflow.
    """
    global _llm, _using_fallback
    if not _using_fallback:
        _llm = _build_groq()
        _using_fallback = True


def is_using_fallback() -> bool:
    """Return True if the system is currently using the Groq fallback."""
    return _using_fallback
