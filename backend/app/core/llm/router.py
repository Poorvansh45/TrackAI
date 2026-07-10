"""
LLM Provider Router - Tracks AI
Resolves the correct provider instance for a given task.
Providers are lazily instantiated and reused (singleton per model).
"""
from __future__ import annotations

import logging
from typing import Dict, Optional

from app.core.llm.config import TASK_ROUTING, Provider, Model
from app.core.llm.providers.base import BaseProvider

logger = logging.getLogger("uvicorn.error")

# Singleton cache of initialized providers, keyed by (provider_name, model)
_provider_cache: Dict[str, BaseProvider] = {}


def _get_or_create_provider(provider_name: str, model: str, max_tokens: int) -> Optional[BaseProvider]:
    """Lazily build and cache a provider instance."""
    cache_key = f"{provider_name}::{model}::{max_tokens}"
    if cache_key in _provider_cache:
        return _provider_cache[cache_key]

    provider: Optional[BaseProvider] = None
    if provider_name == Provider.GEMINI:
        from app.core.llm.providers.gemini_provider import GeminiProvider
        provider = GeminiProvider(model=model, max_tokens=max_tokens)
    elif provider_name == Provider.GROQ:
        from app.core.llm.providers.groq_provider import GroqProvider
        provider = GroqProvider(model=model, max_tokens=max_tokens)

    if provider and provider.is_available():
        _provider_cache[cache_key] = provider
        return provider

    return None


def get_provider_for_task(task: str) -> tuple[BaseProvider, dict]:
    """
    Return (provider, route_config) for the given task.
    Applies immediate fallback: if the primary provider is unavailable or
    the task is routed to Gemini and Gemini fails, this function returns
    the Groq fallback provider transparently.

    Raises RuntimeError if no provider is available for the task.
    """
    if task not in TASK_ROUTING:
        raise ValueError(f"Unknown task: {task!r}. Register it in app/core/llm/config.py")

    route = TASK_ROUTING[task]
    primary_name = route["provider"]
    model = route["model"]
    max_tokens = route["max_tokens"]

    primary = _get_or_create_provider(primary_name, model, max_tokens)
    if primary:
        return primary, route

    # Primary unavailable — try Groq fallback
    logger.warning(
        "[LLMRouter] Primary provider %r unavailable for task=%s, falling back to Groq",
        primary_name, task,
    )
    groq_model = Model.GROQ_LLAMA_8B
    fallback = _get_or_create_provider(Provider.GROQ, groq_model, max_tokens)
    if fallback:
        fallback_route = {**route, "provider": Provider.GROQ, "model": groq_model}
        return fallback, fallback_route

    raise RuntimeError(
        f"No LLM provider available for task={task!r}. "
        "Check GOOGLE_API_KEY and GROQ_API_KEY in backend/.env"
    )


def get_groq_fallback(max_tokens: int = 2048) -> Optional[BaseProvider]:
    """Return the Groq fallback provider, or None if unavailable."""
    return _get_or_create_provider(Provider.GROQ, Model.GROQ_LLAMA_8B, max_tokens)
