"""
LLM Cache Manager - Tracks AI
MongoDB-backed cache for all LLM responses.
Cache key = SHA256(task + normalized_prompt).
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

logger = logging.getLogger("uvicorn.error")


def _make_cache_key(task: str, prompt: str) -> str:
    """Stable SHA256 hash of task name + full prompt text."""
    raw = f"{task}::{prompt}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def cache_get(task: str, prompt: str, ttl_days: int) -> Optional[Any]:
    """
    Return cached value if it exists and is within TTL, else None.
    Cached value may be a plain string or a dict (for structured output).
    """
    if ttl_days == 0:
        return None  # task explicitly opts out of caching
    try:
        from app.core.database import get_database
        from app.core.llm.config import CACHE_COLLECTION

        db = get_database()
        if db is None:
            return None

        key = _make_cache_key(task, prompt)
        doc = await db[CACHE_COLLECTION].find_one({"cache_key": key})
        if not doc:
            return None

        cached_at: Optional[datetime] = doc.get("cached_at")
        if cached_at and (datetime.utcnow() - cached_at) > timedelta(days=ttl_days):
            return None  # expired

        logger.info("[LLMCache] HIT  task=%s key=%s", task, key[:12])
        return doc.get("value")
    except Exception as exc:
        logger.warning("[LLMCache] Read error: %s", exc)
        return None


async def cache_set(task: str, prompt: str, value: Any) -> None:
    """Upsert a cached value into MongoDB."""
    try:
        from app.core.database import get_database
        from app.core.llm.config import CACHE_COLLECTION

        db = get_database()
        if db is None:
            return

        key = _make_cache_key(task, prompt)
        await db[CACHE_COLLECTION].update_one(
            {"cache_key": key},
            {"$set": {
                "cache_key": key,
                "task": task,
                "value": value,
                "cached_at": datetime.utcnow(),
            }},
            upsert=True,
        )
        logger.info("[LLMCache] SET  task=%s key=%s", task, key[:12])
    except Exception as exc:
        logger.warning("[LLMCache] Write error: %s", exc)
