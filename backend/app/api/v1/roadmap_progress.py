"""
Roadmap Progress API — SINGLE SOURCE OF TRUTH for topic unlock state.
=======================================================================

This module is the canonical answer to "what is the status of every topic
in this user's roadmap?" — locked | active | completed.

Collection: roadmap_progress (one document per user)
{
  "user_id": "...",
  "skill": "AI/ML Engineering",
  "phases": [
    {
      "phase_number": 1,
      "phase_title": "Foundations",
      "topics": [
        {
          "topic_id": "linear-algebra",
          "topic_name": "Linear Algebra",
          "order": 0,
          "status": "completed" | "active" | "locked",
          "completed_subtopics": [...],
          "total_subtopics": 5,
          "progress_pct": 100,
          "xp_earned": 100,
          "completed_at": "2026-06-12T..."
        },
        ...
      ]
    },
    ...
  ],
  "created_at": ..., "updated_at": ...
}

Endpoints:
  POST /roadmap/init                       — idempotent roadmap initialization
  GET  /roadmap/state/{user_id}            — full roadmap progress state
  POST /roadmap/topic/{topic_id}/checklist — update checklist progress (0-100, capped)
  POST /roadmap/topic/{topic_id}/complete  — mark complete + unlock next topic

The frontend (Dashboard, Learning Graph, Topic Workspace) reads exclusively
from GET /roadmap/state/{user_id}. localStorage is used only as an
instant-render cache, never as the source of truth.
"""

import logging
import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/roadmap", tags=["Roadmap Progress"])


# ─── Slug helper (MUST match frontend toSlug exactly) ──────────────────────

def to_slug(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"[^a-z0-9-]", "", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug


# ─── Schemas ────────────────────────────────────────────────────────────────

class InitPhase(BaseModel):
    phase_number: int
    phase_title: str
    topics: list[str]


class InitRequest(BaseModel):
    user_id: str
    skill: str
    phases: list[InitPhase]


class ChecklistRequest(BaseModel):
    user_id: str
    completed_subtopics: list[str]
    total_subtopics: int = Field(gt=0)


class CompleteRequest(BaseModel):
    user_id: str


class TopicState(BaseModel):
    topic_id: str
    topic_name: str
    order: int
    status: str  # locked | active | completed
    completed_subtopics: list[str]
    total_subtopics: int
    progress_pct: int
    xp_earned: int
    completed_at: Optional[str] = None


class PhaseState(BaseModel):
    phase_number: int
    phase_title: str
    topics: list[TopicState]


class RoadmapProgressState(BaseModel):
    user_id: str
    skill: str
    phases: list[PhaseState]
    active_topic_id: Optional[str] = None
    completed_count: int
    total_count: int


class ChecklistResponse(BaseModel):
    success: bool
    topic_id: str
    progress_pct: int
    completed_count: int
    total_subtopics: int
    status: str


class CompleteResponse(BaseModel):
    success: bool
    topic_id: str
    status: str
    xp_earned: int
    next_topic_id: Optional[str] = None
    next_topic_name: Optional[str] = None
    roadmap: RoadmapProgressState


# ─── Internal helpers ────────────────────────────────────────────────────────

def _xp_for_order(order: int) -> int:
    """Mirror the frontend XP scheme (difficulty derived from position)."""
    if order <= 4:
        return 100
    if order <= 12:
        return 180
    return 280


def _flatten(doc: dict) -> list[dict]:
    """Return all topic dicts across all phases, in roadmap order."""
    flat: list[dict] = []
    for phase in doc.get("phases", []):
        for topic in phase.get("topics", []):
            flat.append(topic)
    return flat


def _find_topic(doc: dict, topic_id: str) -> Optional[dict]:
    for topic in _flatten(doc):
        if topic["topic_id"] == topic_id:
            return topic
    return None


def _to_state(doc: dict) -> RoadmapProgressState:
    flat = _flatten(doc)
    completed_count = sum(1 for t in flat if t["status"] == "completed")
    active = next((t for t in flat if t["status"] == "active"), None)

    return RoadmapProgressState(
        user_id=doc["user_id"],
        skill=doc.get("skill", "Custom Track"),
        phases=[
            PhaseState(
                phase_number=p.get("phase_number", i + 1),
                phase_title=p.get("phase_title", f"Phase {i + 1}"),
                topics=[TopicState(**t) for t in p.get("topics", [])],
            )
            for i, p in enumerate(doc.get("phases", []))
        ],
        active_topic_id=active["topic_id"] if active else None,
        completed_count=completed_count,
        total_count=len(flat),
    )


async def _get_collection():
    from app.core.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable — roadmap progress requires MongoDB",
        )
    return db["roadmap_progress"]


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/init", response_model=RoadmapProgressState)
async def init_roadmap(payload: InitRequest):
    """
    Idempotent. If a roadmap_progress doc already exists for this user,
    return it unchanged (so re-running onboarding never wipes progress).
    Otherwise build a fresh doc: first topic of phase 1 = active, rest locked.
    """
    coll = await _get_collection()

    existing = await coll.find_one({"user_id": payload.user_id})
    if existing:
        logger.info("[ROADMAP INIT] Existing roadmap found for user_id=%s — skipping init", payload.user_id)
        return _to_state(existing)

    order = 0
    phases_out = []
    for phase in payload.phases:
        topics_out = []
        for topic_name in phase.topics:
            topic_id = to_slug(topic_name)
            topics_out.append({
                "topic_id": topic_id,
                "topic_name": topic_name,
                "order": order,
                "status": "active" if order == 0 else "locked",
                "completed_subtopics": [],
                "total_subtopics": 5,
                "progress_pct": 0,
                "xp_earned": 0,
                "completed_at": None,
            })
            order += 1
        phases_out.append({
            "phase_number": phase.phase_number,
            "phase_title": phase.phase_title,
            "topics": topics_out,
        })

    doc = {
        "user_id": payload.user_id,
        "skill": payload.skill,
        "phases": phases_out,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    await coll.insert_one(doc)
    logger.info(
        "[ROADMAP INIT] Created roadmap for user_id=%s skill=%s topics=%d (first active=%s)",
        payload.user_id, payload.skill, order,
        phases_out[0]["topics"][0]["topic_id"] if phases_out and phases_out[0]["topics"] else "none",
    )
    return _to_state(doc)


@router.get("/state/{user_id}", response_model=RoadmapProgressState)
async def get_roadmap_state(user_id: str):
    coll = await _get_collection()
    doc = await coll.find_one({"user_id": user_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No roadmap progress found for this user. Call /roadmap/init first.",
        )
    logger.info(
        "[ROADMAP STATE] user_id=%s completed=%d/%d active=%s",
        user_id,
        sum(1 for t in _flatten(doc) if t["status"] == "completed"),
        len(_flatten(doc)),
        next((t["topic_id"] for t in _flatten(doc) if t["status"] == "active"), None),
    )
    return _to_state(doc)


@router.post("/topic/{topic_id}/checklist", response_model=ChecklistResponse)
async def update_checklist(topic_id: str, payload: ChecklistRequest):
    """
    Update checklist progress for a topic.

    progress_pct = (unique_completed / total_subtopics) * 100, CAPPED to [0, 100].
    Duplicate / stale subtopic names (e.g. from a regenerated content set)
    are deduped via set() and the count is capped at total_subtopics so the
    percentage can never exceed 100%.
    """
    coll = await _get_collection()
    doc = await coll.find_one({"user_id": payload.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Roadmap not initialized for this user")

    topic = _find_topic(doc, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found in roadmap")

    # Dedupe + cap — this is the root-cause fix for "11/5 = 220%"
    unique_completed = list(dict.fromkeys(payload.completed_subtopics))
    completed_count = min(len(unique_completed), payload.total_subtopics)
    progress_pct = max(0, min(100, round((completed_count / payload.total_subtopics) * 100)))

    new_status = topic["status"]
    if new_status == "locked":
        new_status = "active"  # interacting with a topic activates it

    await coll.update_one(
        {"user_id": payload.user_id, "phases.topics.topic_id": topic_id},
        {
            "$set": {
                "phases.$[].topics.$[t].completed_subtopics": unique_completed[:payload.total_subtopics],
                "phases.$[].topics.$[t].total_subtopics": payload.total_subtopics,
                "phases.$[].topics.$[t].progress_pct": progress_pct,
                "phases.$[].topics.$[t].status": new_status,
                "updated_at": datetime.utcnow(),
            }
        },
        array_filters=[{"t.topic_id": topic_id}],
    )

    logger.info(
        "[CHECKLIST UPDATE] user_id=%s topic_id=%s progress=%d%% (%d/%d) status=%s",
        payload.user_id, topic_id, progress_pct, completed_count, payload.total_subtopics, new_status,
    )

    return ChecklistResponse(
        success=True,
        topic_id=topic_id,
        progress_pct=progress_pct,
        completed_count=completed_count,
        total_subtopics=payload.total_subtopics,
        status=new_status,
    )


@router.post("/topic/{topic_id}/complete", response_model=CompleteResponse)
async def complete_topic(topic_id: str, payload: CompleteRequest):
    """
    Mark a topic as completed (progress_pct=100, status=completed, xp awarded)
    and automatically unlock the next topic in roadmap order (if it is
    currently 'locked', flip it to 'active').

    This is the ONLY place topic unlocking happens. Both the Dashboard and
    the Learning Graph read the result of this operation via GET /roadmap/state.
    """
    coll = await _get_collection()
    doc = await coll.find_one({"user_id": payload.user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Roadmap not initialized for this user")

    topic = _find_topic(doc, topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic '{topic_id}' not found in roadmap")

    if topic["status"] == "completed":
        logger.info("[TOPIC COMPLETE] user_id=%s topic_id=%s already completed — no-op", payload.user_id, topic_id)
        refreshed = await coll.find_one({"user_id": payload.user_id})
        return CompleteResponse(
            success=True, topic_id=topic_id, status="completed",
            xp_earned=topic["xp_earned"], next_topic_id=None, next_topic_name=None,
            roadmap=_to_state(refreshed),
        )

    xp_earned = _xp_for_order(topic["order"])
    completed_at = datetime.utcnow().isoformat()

    # 1. Mark this topic completed
    await coll.update_one(
        {"user_id": payload.user_id, "phases.topics.topic_id": topic_id},
        {
            "$set": {
                "phases.$[].topics.$[t].status": "completed",
                "phases.$[].topics.$[t].progress_pct": 100,
                "phases.$[].topics.$[t].xp_earned": xp_earned,
                "phases.$[].topics.$[t].completed_at": completed_at,
                "updated_at": datetime.utcnow(),
            }
        },
        array_filters=[{"t.topic_id": topic_id}],
    )
    logger.info("[ROADMAP UPDATE] user_id=%s topic_id=%s -> completed (xp=%d)", payload.user_id, topic_id, xp_earned)

    # 2. Find and unlock the next topic (by global order)
    refreshed = await coll.find_one({"user_id": payload.user_id})
    flat = _flatten(refreshed)
    flat_sorted = sorted(flat, key=lambda t: t["order"])

    next_topic_id = None
    next_topic_name = None
    for t in flat_sorted:
        if t["order"] > topic["order"] and t["status"] == "locked":
            next_topic_id = t["topic_id"]
            next_topic_name = t["topic_name"]
            break

    if next_topic_id:
        await coll.update_one(
            {"user_id": payload.user_id, "phases.topics.topic_id": next_topic_id},
            {
                "$set": {
                    "phases.$[].topics.$[t].status": "active",
                    "updated_at": datetime.utcnow(),
                }
            },
            array_filters=[{"t.topic_id": next_topic_id}],
        )
        logger.info(
            "[TOPIC UNLOCK] user_id=%s next_topic_id=%s next_topic_name=%s -> active",
            payload.user_id, next_topic_id, next_topic_name,
        )
    else:
        logger.info("[TOPIC UNLOCK] user_id=%s — no further locked topics (roadmap complete or all unlocked)", payload.user_id)

    final_doc = await coll.find_one({"user_id": payload.user_id})

    return CompleteResponse(
        success=True,
        topic_id=topic_id,
        status="completed",
        xp_earned=xp_earned,
        next_topic_id=next_topic_id,
        next_topic_name=next_topic_name,
        roadmap=_to_state(final_doc),
    )
