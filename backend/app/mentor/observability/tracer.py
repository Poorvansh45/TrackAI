"""
LangSmith Tracing — RunnableConfig Builder
============================================

Builds LangChain RunnableConfig objects that attach structured metadata
to every graph execution, making traces searchable and filterable in
the LangSmith UI.

Each mentor chat request gets:
  - run_name    : human-readable label (e.g. "MentorChat | explain_concept")
  - tags        : ["mentor", "tool:<name>", "user:<id>"]
  - metadata    : full request context for filtering/grouping
"""

import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings

logger = logging.getLogger("mentor.observability.tracer")


def is_tracing_enabled() -> bool:
    """Return True if LangSmith tracing is configured and enabled."""
    return (
        settings.langchain_tracing_v2
        and bool(settings.langchain_api_key)
    )


def create_run_config(
    user_id: str,
    session_id: Optional[str] = None,
    intent: Optional[str] = None,
    tool_used: Optional[str] = None,
    student_level: Optional[str] = None,
    extra_metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Build a LangChain RunnableConfig dict that attaches rich metadata to
    every LangSmith trace for this request.

    Usage:
        config = create_run_config(user_id, session_id, intent, tool_used)
        result = await runnable.ainvoke(input, config=config)

    Args:
        user_id:        Authenticated user ID (from JWT).
        session_id:     Chat session ID for grouping turns.
        intent:         Detected intent type string (e.g. "explain_concept").
        tool_used:      Tool invoked (e.g. "ExplainConceptTool", "YouTubeAgent").
        student_level:  Student proficiency level ("beginner" | "intermediate" | "advanced").
        extra_metadata: Optional additional key-value pairs to attach.

    Returns:
        RunnableConfig-compatible dict.
    """
    tags: List[str] = ["mentor"]
    if intent:
        tags.append(f"intent:{intent}")
    if tool_used:
        tags.append(f"tool:{tool_used}")
    if user_id:
        tags.append(f"user:{user_id[:8]}")  # partial user ID only

    # Determine run name — intent is most informative label
    run_label = intent or "general_chat"
    run_name = f"MentorChat | {run_label}"

    metadata: Dict[str, Any] = {
        "user_id": user_id,
        "session_id": session_id or "",
        "intent": intent or "unknown",
        "tool_used": tool_used or "none",
        "student_level": student_level or "intermediate",
        "project": settings.langchain_project,
    }
    if extra_metadata:
        metadata.update(extra_metadata)

    config = {
        "run_name": run_name,
        "tags": tags,
        "metadata": metadata,
    }

    if is_tracing_enabled():
        logger.debug(
            f"[Tracer] Created run config: run_name='{run_name}' "
            f"tags={tags} tracing=ON"
        )
    else:
        logger.debug("[Tracer] LangSmith tracing is DISABLED — config created but no trace will be sent.")

    return config


def create_intent_detection_config(
    user_id: str,
    user_input: str,
) -> Dict[str, Any]:
    """
    Build a run config specifically for intent detection calls,
    so intent detection traces are separately visible in LangSmith.
    """
    return {
        "run_name": "MentorIntentDetect",
        "tags": ["mentor", "intent_detection", f"user:{user_id[:8]}"],
        "metadata": {
            "user_id": user_id,
            "input_preview": user_input[:100],
            "project": settings.langchain_project,
        },
    }


def create_rag_config(
    user_id: str,
    query: str,
    rag_type: str = "general",
) -> Dict[str, Any]:
    """
    Build a run config for RAG retrieval calls (PDF/YouTube/general).
    """
    return {
        "run_name": f"MentorRAG | {rag_type}",
        "tags": ["mentor", "rag", f"rag_type:{rag_type}", f"user:{user_id[:8]}"],
        "metadata": {
            "user_id": user_id,
            "query_preview": query[:100],
            "rag_type": rag_type,
            "project": settings.langchain_project,
        },
    }
