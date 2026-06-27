"""
Topic Content Service - Tracks AI
===================================
Generates topic-specific educational content via the LLM Gateway.
Routes to Groq (fast, free) instead of direct Gemini calls.

Cache: MongoDB collection "topic_content", TTL 90 days.
Fallback: If LLM fails, returns an honest minimal placeholder.
"""

import logging
import json
import re
from typing import Optional

logger = logging.getLogger("uvicorn.error")


# MongoDB cache helpers
async def _get_cached_content(topic_id: str) -> Optional[dict]:
    try:
        from app.core.database import get_database
        from datetime import datetime, timedelta
        db = get_database()
        if db is None:
            return None
        doc = await db["topic_content"].find_one({"topic_id": topic_id})
        if not doc:
            return None
        cached_at = doc.get("cached_at")
        if cached_at and (datetime.utcnow() - cached_at).days > 90:
            return None
        return doc.get("content")
    except Exception as exc:
        logger.warning("[TopicContent] Cache read failed: %s", exc)
        return None


async def _cache_content(topic_id: str, content: dict) -> None:
    try:
        from app.core.database import get_database
        from datetime import datetime
        db = get_database()
        if db is None:
            return
        await db["topic_content"].update_one(
            {"topic_id": topic_id},
            {"$set": {"topic_id": topic_id, "content": content, "cached_at": datetime.utcnow()}},
            upsert=True,
        )
    except Exception as exc:
        logger.warning("[TopicContent] Cache write failed: %s", exc)


async def _generate_via_gateway(topic_name: str, skill: str) -> dict:
    """Generate topic content via LLM Gateway (Groq-routed task). Fully async."""
    import json
    import re
    from app.core.ai_service import ai_service, prompts, Task

    prompt = prompts.topic_content(topic_name=topic_name, skill=skill)
    raw = await ai_service.generate(task=Task.TOPIC_OVERVIEW, prompt=prompt, use_cache=False)

    # Strip markdown fences if present
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    data = json.loads(raw)

    required = {"overview", "why_it_matters", "subtopics", "summary", "key_concepts"}
    if not required.issubset(data.keys()):
        raise ValueError(f"Missing keys: {required - set(data.keys())}")

    return data


def _minimal_fallback(topic_name: str) -> dict:
    """Honest minimal content when the LLM is unavailable."""
    return {
        "overview": (
            f"{topic_name} content is temporarily unavailable. "
            "The AI content engine is being rate-limited. "
            "Please refresh in a few moments — your resources and checklist below are fully functional."
        ),
        "why_it_matters": [
            f"{topic_name} is a required concept for this track",
            "Skipping this topic will create gaps in later phases",
            "This topic is tested in technical assessments",
            "Real projects depend on a solid understanding of this",
            "Mastery here directly unlocks the next topic",
        ],
        "subtopics": [
            f"Introduction to {topic_name}",
            "Core Syntax and Rules",
            "Practical Application",
            "Common Patterns and Pitfalls",
            "Advanced Usage",
        ],
        "summary": [
            f"{topic_name} is a foundational concept — learn it deeply.",
            "Practice with real code examples, not just reading.",
            "Test your understanding with the quiz below.",
            "Use the AI re-explain button if anything is unclear.",
            "Complete all checklist items to unlock the next topic.",
        ],
        "key_concepts": [
            {"term": topic_name, "definition": "core concept in this track"},
            {"term": "Syntax", "definition": "rules for writing valid code"},
            {"term": "Semantics", "definition": "meaning behind the code"},
            {"term": "Pattern", "definition": "reusable coding solution"},
            {"term": "Best Practice", "definition": "proven approach used by experts"},
        ],
    }


async def get_topic_content(topic_id: str, topic_name: str, skill: str = "Programming") -> dict:
    """
    Returns dynamic, LLM-generated content for any topic.
    Priority: MongoDB cache -> LLM Gateway (Groq) -> minimal fallback
    """
    topic_id = topic_id.lower().strip()

    cached = await _get_cached_content(topic_id)
    if cached:
        logger.info("[TopicContent] Cache hit: %s", topic_id)
        return cached

    try:
        content = await _generate_via_gateway(topic_name, skill)
        await _cache_content(topic_id, content)
        logger.info("[TopicContent] Generated via gateway for: %s", topic_id)
        return content
    except Exception as exc:
        logger.warning("[TopicContent] Gateway failed for %s: %s", topic_id, exc)
        return _minimal_fallback(topic_name)
