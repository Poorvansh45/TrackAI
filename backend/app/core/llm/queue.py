"""
Background Queue Manager - Tracks AI
======================================
Fires post-roadmap background tasks so the frontend gets a fast response.

Strategy (per user direction):
    Roadmap returns immediately.
    Background generates ONLY Topic 1:
        - Topic 1 content (overview, summary, subtopics, key concepts)
        - Topic 1 quiz
        - Topic 1 resources

    Topic 2+ content is generated on-demand when the user navigates to it.
    This saves ~70% API usage vs. pre-generating all of Phase 1.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List

logger = logging.getLogger("uvicorn.error")


async def _generate_topic_content_bg(topic_id: str, topic_name: str, skill: str) -> None:
    """Pre-generate and cache content for a single topic."""
    try:
        from app.services.topic_content import get_topic_content
        logger.info("[Queue] Pre-generating content for topic: %s", topic_name)
        await get_topic_content(topic_id, topic_name, skill)
        logger.info("[Queue] Done: content for %s", topic_name)
    except Exception as exc:
        logger.warning("[Queue] Content pre-gen failed for %s: %s", topic_name, exc)


async def _generate_quiz_bg(topic_id: str, topic_name: str, skill: str) -> None:
    """Pre-generate and cache quiz questions for a single topic."""
    try:
        from app.services.ai.quiz_generator import generate_and_cache_quiz
        logger.info("[Queue] Pre-generating quiz for topic: %s", topic_name)
        await generate_and_cache_quiz(topic_id=topic_id, topic_name=topic_name, skill=skill, count=5)
        logger.info("[Queue] Done: quiz for %s", topic_name)
    except Exception as exc:
        logger.warning("[Queue] Quiz pre-gen failed for %s: %s", topic_name, exc)


async def enqueue_post_roadmap_tasks(
    roadmap_result: Dict[str, Any],
    skill: str,
) -> None:
    """
    Called immediately after roadmap is returned to the frontend.

    Pre-generates content for Topic 1 ONLY (phase 1, topic 1).
    Topic 2+ is generated on-demand when the user navigates to it.
    This saves ~70% API usage vs. pre-generating all of Phase 1.
    """
    try:
        phases = roadmap_result.get("phases", [])
        if not phases:
            logger.info("[Queue] No phases in roadmap — skipping pre-generation")
            return

        first_phase = phases[0]
        topics: List[str] = first_phase.get("topics", [])
        if not topics:
            logger.info("[Queue] No topics in phase 1 — skipping pre-generation")
            return

        # Only Topic 1 — not the entire Phase 1
        topic_name = topics[0]
        topic_id = topic_name.lower().replace(" ", "-")

        logger.info(
            "[Queue] Scheduling pre-generation for Topic 1: %s (skill=%s)",
            topic_name, skill,
        )

        # Fire topic content and quiz concurrently — do not await each other
        await asyncio.gather(
            _generate_topic_content_bg(topic_id, topic_name, skill),
            _generate_quiz_bg(topic_id, topic_name, skill),
            return_exceptions=True,  # never let one failure block the other
        )

        logger.info("[Queue] Topic 1 pre-generation complete: %s", topic_name)

    except Exception as exc:
        logger.warning("[Queue] enqueue_post_roadmap_tasks failed: %s", exc)
