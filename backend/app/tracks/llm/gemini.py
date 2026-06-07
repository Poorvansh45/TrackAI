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
The singleton is reset on fallback so subsequent calls also use Groq.
"""

import logging
import os

logger = logging.getLogger("uvicorn.error")

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

def _build_gemini():
    """Build the primary Gemini 2.0 Flash Lite client."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from app.core.config import settings

    api_key = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set in backend/.env. "
            "Get a free key at https://aistudio.google.com/app/apikey"
        )

    logger.info("[LLM] Initializing primary: gemini-2.0-flash-lite")
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-lite",   # cheapest Gemini, ample free quota
        temperature=0,
        google_api_key=api_key,
    )


def _build_groq():
    """Build the Groq fallback client (llama-3.3-70b-versatile, free tier)."""
    from langchain_groq import ChatGroq
    from app.core.config import settings

    api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set in backend/.env and Gemini quota was exhausted. "
            "Get a free key at https://console.groq.com/keys"
        )

    logger.warning("[LLM] Falling back to Groq: llama-3.3-70b-versatile")
    return ChatGroq(
        model="llama-3.3-70b-versatile",  # best free Groq model for structured output
        temperature=0,
        groq_api_key=api_key,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_llm():
    """
    Return the active LLM instance (lazy singleton).

    On first call → tries Gemini 2.0 Flash Lite.
    If Gemini raises a quota / API error at invocation time → falls back to Groq.
    Subsequent calls reuse whichever backend is active.

    Note: The fallback is also triggered per-agent if Gemini raises during
    .invoke().  Agents should wrap their call in a try/except and call
    reset_to_groq() if needed — but for most quota errors the error surfaces
    at the first agent call and the graph stops, so the router catches it.
    """
    global _llm, _using_fallback

    if _llm is None:
        try:
            _llm = _build_gemini()
        except RuntimeError:
            # GOOGLE_API_KEY not set at all — try Groq directly
            _llm = _build_groq()
            _using_fallback = True

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
