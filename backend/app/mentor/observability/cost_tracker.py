"""
Cost Tracker — Token Usage & Cost Logging
==========================================

Extracts token usage from LLM responses and logs per-request cost
data to the `mentor_usage_logs` MongoDB collection.

Schema (mentor_usage_logs):
{
    user_id:             str,
    session_id:          str,
    model:               str,
    provider:            str,
    input_tokens:        int,
    output_tokens:       int,
    total_tokens:        int,
    estimated_cost_usd:  float,
    tool_used:           str | null,
    intent:              str | null,
    latency_ms:          int,
    timestamp:           datetime,
}
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

logger = logging.getLogger("mentor.observability.cost_tracker")

# ─── Token price table (USD per 1,000 tokens) ─────────────────────────────
# Prices as of 2025-Q2 — update as needed.
# fmt: off
_PRICE_TABLE: Dict[str, Dict[str, float]] = {
    # model_key            input_per_1k  output_per_1k
    "gpt-4o-mini":        {"input": 0.00015,  "output": 0.0006},
    "gpt-4o":             {"input": 0.005,    "output": 0.015},
    "gpt-4.1-nano":       {"input": 0.0001,   "output": 0.0004},
    "gpt-4.1-mini":       {"input": 0.00015,  "output": 0.0006},
    "gpt-4.1":            {"input": 0.002,    "output": 0.008},
    "gpt-4-turbo":        {"input": 0.01,     "output": 0.03},
    "gpt-3.5-turbo":      {"input": 0.0005,   "output": 0.0015},
    "gpt-5-1-preview":    {"input": 0.005,    "output": 0.015},  # Azure deployment
    "llama-3.1-70b-versatile": {"input": 0.00059, "output": 0.00079},
    "gemini-1.5-flash-latest": {"input": 0.000075, "output": 0.0003},
    # default fallback
    "default":            {"input": 0.001,    "output": 0.002},
}
# fmt: on


def estimate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> float:
    """
    Estimate USD cost for a single LLM call.

    Args:
        model:         Model name or deployment name.
        input_tokens:  Number of input/prompt tokens.
        output_tokens: Number of output/completion tokens.

    Returns:
        Estimated cost in USD (float).
    """
    # Normalise model name for lookup (lower-case, strip whitespace)
    model_key = model.lower().strip()

    # Try exact match first, then substring match
    prices = _PRICE_TABLE.get(model_key)
    if prices is None:
        for key in _PRICE_TABLE:
            if key in model_key or model_key in key:
                prices = _PRICE_TABLE[key]
                break
    if prices is None:
        prices = _PRICE_TABLE["default"]
        logger.debug(f"[CostTracker] Unknown model '{model}' — using default pricing.")

    cost = (
        (input_tokens / 1000) * prices["input"]
        + (output_tokens / 1000) * prices["output"]
    )
    return round(cost, 8)


def extract_token_usage(response_metadata: Dict[str, Any]) -> Dict[str, int]:
    """
    Extract token counts from LangChain response_metadata / usage_metadata.

    LangChain stores usage in different keys depending on provider:
      - OpenAI/Azure: response_metadata["token_usage"] or usage_metadata
      - Some models: input_tokens / output_tokens directly

    Returns dict with keys: input_tokens, output_tokens, total_tokens
    """
    if not response_metadata:
        return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}

    # Try usage_metadata first (newer LangChain versions)
    usage = response_metadata.get("usage_metadata") or response_metadata.get("token_usage") or {}

    input_tokens = (
        usage.get("input_tokens")
        or usage.get("prompt_tokens")
        or response_metadata.get("prompt_tokens")
        or 0
    )
    output_tokens = (
        usage.get("output_tokens")
        or usage.get("completion_tokens")
        or response_metadata.get("completion_tokens")
        or 0
    )
    total_tokens = (
        usage.get("total_tokens")
        or response_metadata.get("total_tokens")
        or (input_tokens + output_tokens)
    )

    return {
        "input_tokens": int(input_tokens),
        "output_tokens": int(output_tokens),
        "total_tokens": int(total_tokens),
    }


async def log_usage(
    user_id: str,
    model: str,
    provider: str,
    input_tokens: int,
    output_tokens: int,
    tool_used: Optional[str] = None,
    intent: Optional[str] = None,
    session_id: Optional[str] = None,
    latency_ms: int = 0,
) -> Optional[Dict[str, Any]]:
    """
    Persist token usage and cost data to `mentor_usage_logs` MongoDB collection.

    Args:
        user_id:       Authenticated user ID.
        model:         LLM model name / deployment name.
        provider:      LLM provider (openai | azure | groq | google).
        input_tokens:  Number of input tokens used.
        output_tokens: Number of output tokens used.
        tool_used:     Tool invoked for this request (or None).
        intent:        Detected intent type (or None).
        session_id:    Chat session ID (or None).
        latency_ms:    End-to-end request latency in milliseconds.

    Returns:
        The persisted document dict, or None if DB is unavailable.
    """
    estimated_cost = estimate_cost(model, input_tokens, output_tokens)

    doc = {
        "user_id": user_id,
        "session_id": session_id or "",
        "model": model,
        "provider": provider,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "estimated_cost_usd": estimated_cost,
        "tool_used": tool_used or "none",
        "intent": intent or "unknown",
        "latency_ms": latency_ms,
        "timestamp": datetime.now(timezone.utc),
    }

    try:
        from app.core.database import get_database
        db = get_database()
        if db is not None:
            await db["mentor_usage_logs"].insert_one(doc)
            logger.debug(
                f"[CostTracker] Logged usage: user={user_id[:8]} model={model} "
                f"tokens={input_tokens}+{output_tokens} cost=${estimated_cost:.6f} "
                f"tool={tool_used or 'none'}"
            )
        else:
            logger.debug("[CostTracker] DB unavailable — usage not persisted.")
    except Exception as e:
        # Cost tracking is non-critical — never raise, just log
        logger.warning(f"[CostTracker] Failed to persist usage log: {e}")

    return doc


def get_model_name_from_llm(llm_instance: Any) -> str:
    """
    Extract a clean model name string from a LangChain LLM instance.
    Works with OpenAI, Azure, Groq, Google LangChain wrappers.
    """
    if llm_instance is None:
        return "unknown"
    return (
        getattr(llm_instance, "azure_deployment", None)
        or getattr(llm_instance, "deployment_name", None)
        or getattr(llm_instance, "model_name", None)
        or getattr(llm_instance, "model", None)
        or "unknown"
    )


def get_provider_name_from_llm(llm_instance: Any) -> str:
    """
    Infer provider string from a LangChain LLM class name.
    """
    if llm_instance is None:
        return "unknown"
    class_name = type(llm_instance).__name__.lower()
    if "azure" in class_name:
        return "azure"
    if "openai" in class_name:
        return "openai"
    if "groq" in class_name:
        return "groq"
    if "google" in class_name or "gemini" in class_name:
        return "google"
    return "unknown"
