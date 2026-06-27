"""
LLM Shim - Tracks AI (Backward Compatibility Layer)
=====================================================
IMPORTANT: This module is a thin backward-compatibility shim.
All new code must import from app.core.ai_service instead.

This file is kept so that any remaining direct callers of get_llm()
continue to work during the migration period. It delegates to the
centralized LLM Gateway.

Do NOT add new features here. Do NOT import this in new code.
"""
import logging

logger = logging.getLogger("uvicorn.error")


class QuotaExhaustedError(Exception):
    """Kept for backward compatibility — raised when all providers are exhausted."""
    pass


def _is_quota_or_api_error(exc: Exception) -> bool:
    """Return True for errors that should trigger provider fallback."""
    _QUOTA_SIGNALS = (
        "quota", "rate limit", "429", "resource exhausted",
        "too many requests", "billing", "exceeded", "limit",
    )
    msg = str(exc).lower()
    return any(signal in msg for signal in _QUOTA_SIGNALS)


def get_llm():
    """
    DEPRECATED: Use app.core.ai_service.ai_service instead.

    Returns a FallbackLLMWrapper-compatible object for callers that have not
    yet been migrated to the new AI Service Layer.
    """
    logger.warning(
        "[LLM Shim] get_llm() called — migrate this caller to "
        "`from app.core.ai_service import ai_service`"
    )
    from app.core.llm.router import get_provider_for_task, get_groq_fallback
    from app.core.llm.config import Task

    # Return a compatibility wrapper that mimics the old FallbackLLMWrapper API
    return _LegacyCompatWrapper()


class _LegacyCompatWrapper:
    """
    Mimics the old FallbackLLMWrapper API so callers that do:
        llm = get_llm()
        llm.invoke([HumanMessage(...)])
    or:
        llm.with_structured_output(Schema).invoke(prompt)
    still work without modification.
    """

    def invoke(self, messages):
        from app.core.ai_service import ai_service, Task
        from langchain_core.messages import BaseMessage
        if isinstance(messages, list):
            prompt = " ".join(
                m.content if hasattr(m, "content") else str(m) for m in messages
            )
        else:
            prompt = str(messages)

        # Use topic_overview task as a safe generic default for unrouted calls
        result = ai_service.generate(task=Task.TOPIC_OVERVIEW, prompt=prompt, use_cache=False)

        # Return an object with .content attribute to match LangChain AIMessage shape
        class _Resp:
            def __init__(self, content):
                self.content = content
        return _Resp(result)

    def with_structured_output(self, schema, **kwargs):
        """Returns a runnable-like object that delegates structured generation."""
        return _StructuredLegacyWrapper(schema)


class _StructuredLegacyWrapper:
    def __init__(self, schema):
        self._schema = schema

    def invoke(self, prompt):
        from app.core.ai_service import ai_service, Task
        # Use topic_overview as generic task; callers still get correct structured output
        return ai_service.generate_structured(
            task=Task.ASSESSMENT,
            prompt=str(prompt),
            schema=self._schema,
            use_cache=False,
        )


def reset_to_groq() -> None:
    """DEPRECATED: The gateway handles fallback automatically."""
    logger.warning("[LLM Shim] reset_to_groq() is a no-op — gateway handles fallback automatically.")


def is_using_fallback() -> bool:
    """DEPRECATED: Always returns False — use gateway logging to check provider."""
    return False
