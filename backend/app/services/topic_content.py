"""
Topic Content Service — Tracks AI
===================================
Generates REAL, topic-specific content for any topic using Gemini.

Returns:
  - overview           (3-4 sentence intro, specific to this exact topic)
  - why_it_matters     (5 concrete, topic-specific reasons)
  - subtopics          (5 real subtopic titles for this topic)
  - summary            (5 key takeaway bullets)
  - key_concepts       (5 term → definition pairs)

Cache: MongoDB collection "topic_content", TTL 90 days.
Fallback: If LLM fails, returns a clearly-labelled minimal placeholder
          (NOT generic marketing copy — just honest minimal content).
"""

import logging
import json
import re
from typing import Optional

logger = logging.getLogger("uvicorn.error")

# ─── Prompt ─────────────────────────────────────────────────────────────────

CONTENT_PROMPT = '''You are an expert programming educator.
Generate accurate, specific educational content for the topic: "{topic_name}"
in the context of learning: "{skill}".

Return ONLY valid JSON — no markdown, no code fences, no extra text.

{{
  "overview": "3-4 sentences explaining exactly what {topic_name} is, how it works, and what makes it important. Be concrete and specific — mention actual syntax or mechanisms.",
  "why_it_matters": [
    "Specific reason 1 why {topic_name} matters (mention real use case)",
    "Specific reason 2",
    "Specific reason 3",
    "Specific reason 4",
    "Specific reason 5"
  ],
  "subtopics": [
    "Real subtopic title 1 for {topic_name}",
    "Real subtopic title 2",
    "Real subtopic title 3",
    "Real subtopic title 4",
    "Real subtopic title 5"
  ],
  "summary": [
    "Key takeaway 1 about {topic_name} — concrete fact or rule",
    "Key takeaway 2",
    "Key takeaway 3",
    "Key takeaway 4",
    "Key takeaway 5"
  ],
  "key_concepts": [
    {{"term": "technical term 1", "definition": "precise 4-7 word definition"}},
    {{"term": "technical term 2", "definition": "precise 4-7 word definition"}},
    {{"term": "technical term 3", "definition": "precise 4-7 word definition"}},
    {{"term": "technical term 4", "definition": "precise 4-7 word definition"}},
    {{"term": "technical term 5", "definition": "precise 4-7 word definition"}}
  ]
}}

RULES:
- Every sentence must be specific to {topic_name}, never generic
- subtopics must be real learnable sub-topics (e.g. for "Variables": "Naming Conventions", "Type Inference", "Scope Rules", "Multiple Assignment", "Constants")
- key_concepts must be real technical terms from {topic_name}
- overview must mention actual syntax, pattern, or mechanism
- why_it_matters must cite real programming scenarios
- No bullet points in overview — plain prose only
- Return raw JSON only'''


# ─── MongoDB cache ────────────────────────────────────────────────────────────

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


# ─── LLM generation ──────────────────────────────────────────────────────────

async def _generate_via_llm(topic_name: str, skill: str) -> dict:
    import asyncio
    from langchain_core.messages import HumanMessage

    prompt = CONTENT_PROMPT.format(topic_name=topic_name, skill=skill)

    def _sync():
        from app.tracks.llm.gemini import get_llm
        llm = get_llm()
        resp = llm.invoke([HumanMessage(content=prompt)])
        return resp.content if hasattr(resp, "content") else str(resp)

    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(None, _sync)

    # Strip markdown fences
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    data = json.loads(raw)

    # Validate shape
    required = {"overview", "why_it_matters", "subtopics", "summary", "key_concepts"}
    if not required.issubset(data.keys()):
        raise ValueError(f"Missing keys: {required - set(data.keys())}")

    return data


def _minimal_fallback(topic_name: str) -> dict:
    """
    Honest minimal content when the LLM is unavailable.
    Does NOT use generic marketing copy.
    """
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


# ─── Public API ──────────────────────────────────────────────────────────────

async def get_topic_content(topic_id: str, topic_name: str, skill: str = "Programming") -> dict:
    """
    Returns dynamic, LLM-generated content for any topic.
    Priority: MongoDB cache → Gemini LLM → minimal fallback
    """
    topic_id = topic_id.lower().strip()

    # 1. Cache
    cached = await _get_cached_content(topic_id)
    if cached:
        logger.info("[TopicContent] Cache hit: %s", topic_id)
        return cached

    # 2. LLM
    try:
        content = await _generate_via_llm(topic_name, skill)
        await _cache_content(topic_id, content)
        logger.info("[TopicContent] LLM generated content for: %s", topic_id)
        return content
    except Exception as exc:
        logger.warning("[TopicContent] LLM failed for %s: %s", topic_id, exc)
        return _minimal_fallback(topic_name)
