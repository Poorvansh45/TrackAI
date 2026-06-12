"""
Topic Learning Workspace API

GET  /api/v1/topic/{topic_id}            — Full topic data (dynamic content + real resources)
POST /api/v1/topic/progress              — Save checklist progress + unlock next topic
GET  /api/v1/topic/{topic_id}/progress   — Get saved progress for a topic
POST /api/v1/topic/explain               — AI re-explain (Gemini)
"""

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/topic", tags=["Topic Workspace"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class VideoResource(BaseModel):
    type: str
    title: str
    creator: str
    duration: str
    thumbnail: str
    url: str

class ReadingResource(BaseModel):
    source: str
    label: str
    url: str
    icon: str

class TopicResources(BaseModel):
    videos: list[VideoResource]
    reading: list[ReadingResource]

class KeyConcept(BaseModel):
    term: str
    definition: str

class TopicResponse(BaseModel):
    title: str
    difficulty: str
    estimated_time: str
    overview: str
    why_it_matters: list[str]
    subtopics: list[str]
    resources: TopicResources
    summary: list[str]
    key_concepts: list[KeyConcept]

class ProgressRequest(BaseModel):
    topic_id: str
    completed_subtopics: list[str]
    is_completed: bool = False
    user_id: Optional[str] = None
    next_topic_id: Optional[str] = None

class ProgressResponse(BaseModel):
    success: bool
    topic_id: str
    completed_count: int
    is_completed: bool
    xp_earned: int
    next_topic_unlocked: Optional[str] = None

class TopicProgressState(BaseModel):
    topic_id: str
    completed_subtopics: list[str]
    is_completed: bool
    progress_pct: int
    xp_earned: int
    completed_at: Optional[str] = None

class ExplainRequest(BaseModel):
    topic: str
    mode: str  # eli12 | real_example | analogy | simplify

class ExplainResponse(BaseModel):
    explanation: str
    mode: str


# ─── Difficulty / time helpers ───────────────────────────────────────────────

_BEGINNER_KEYWORDS = {
    "variables", "data types", "operators", "input", "output", "print",
    "comments", "strings", "integers", "booleans", "conditionals", "if",
    "loops", "for", "while", "functions", "lists", "arrays", "basics",
    "introduction", "intro", "setup", "install", "hello world",
}
_INTERMEDIATE_KEYWORDS = {
    "classes", "objects", "oop", "inheritance", "polymorphism", "exceptions",
    "error handling", "modules", "packages", "files", "io", "recursion",
    "dictionaries", "sets", "tuples", "comprehensions", "lambda",
    "decorators", "generators", "iterators", "regex", "testing",
    "algorithms", "data structures", "sorting", "searching", "trees",
    "graphs", "hash", "linked list", "stack", "queue", "api", "http",
    "rest", "json", "sql", "database", "orm", "git", "version control",
}

def _infer_difficulty(topic_name: str) -> str:
    lower = topic_name.lower()
    if any(k in lower for k in _BEGINNER_KEYWORDS):
        return "Beginner"
    if any(k in lower for k in _INTERMEDIATE_KEYWORDS):
        return "Intermediate"
    return "Intermediate"

def _infer_time(difficulty: str) -> str:
    return {"Beginner": "1.5 Hours", "Intermediate": "2.5 Hours", "Advanced": "4 Hours"}.get(difficulty, "2 Hours")


# ─── Explain prompts + fallbacks ─────────────────────────────────────────────

EXPLAIN_PROMPTS = {
    "eli12": (
        "You are a patient tutor explaining to a 12-year-old. "
        "Use simple words, a fun analogy, and short sentences. Max 120 words. "
        "Topic: {topic}"
    ),
    "real_example": (
        "Give ONE concrete real-life example that explains: {topic}. "
        "Use something tangible (phones, games, food, money). Under 100 words. Be vivid."
    ),
    "analogy": (
        "Create ONE strong visual analogy that explains: {topic}. "
        "Use a physical object or scene. Under 100 words. Make it memorable."
    ),
    "simplify": (
        "Give the absolute minimum explanation of: {topic}. "
        "Bullet points preferred. Under 80 words. Core idea + one tiny example."
    ),
}


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(topic_id: str, skill: str = "Programming"):
    topic_id = topic_id.lower().strip()
    topic_name = " ".join(w.capitalize() for w in topic_id.split("-"))
    difficulty = _infer_difficulty(topic_name)

    # 1. Get DYNAMIC content from LLM (cached in MongoDB)
    from app.services.topic_content import get_topic_content
    content = await get_topic_content(topic_id, topic_name, skill)

    # 2. Get REAL resources (static DB → MongoDB → LLM fallback)
    from app.services.resources import get_topic_resources
    resources = await get_topic_resources(topic_id, topic_name, skill)

    return TopicResponse(
        title=topic_name,
        difficulty=difficulty,
        estimated_time=_infer_time(difficulty),
        overview=content["overview"],
        why_it_matters=content["why_it_matters"],
        subtopics=content["subtopics"],
        resources=TopicResources(
            videos=[VideoResource(**v) for v in resources["videos"]],
            reading=[ReadingResource(**r) for r in resources["reading"]],
        ),
        summary=content["summary"],
        key_concepts=[KeyConcept(**kc) for kc in content["key_concepts"]],
    )


@router.post("/progress", response_model=ProgressResponse)
async def save_progress(payload: ProgressRequest):
    total_subtopics = 5
    completed_count = len(payload.completed_subtopics)
    progress_pct = round((completed_count / total_subtopics) * 100)
    xp_earned = 100 if payload.is_completed else 0

    await _persist_progress(
        topic_id=payload.topic_id,
        user_id=payload.user_id or "anon",
        completed_subtopics=payload.completed_subtopics,
        is_completed=payload.is_completed,
        progress_pct=progress_pct,
        xp_earned=xp_earned,
    )

    next_unlocked = None
    if payload.is_completed and payload.next_topic_id:
        await _unlock_topic(payload.next_topic_id, payload.user_id or "anon")
        next_unlocked = payload.next_topic_id

    return ProgressResponse(
        success=True,
        topic_id=payload.topic_id,
        completed_count=completed_count,
        is_completed=payload.is_completed,
        xp_earned=xp_earned,
        next_topic_unlocked=next_unlocked,
    )


@router.get("/{topic_id}/progress", response_model=TopicProgressState)
async def get_progress(topic_id: str, user_id: Optional[str] = None):
    topic_id = topic_id.lower().strip()
    uid = user_id or "anon"
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return _empty_progress(topic_id)
        doc = await db["topic_progress"].find_one({"topic_id": topic_id, "user_id": uid})
        if not doc:
            return _empty_progress(topic_id)
        return TopicProgressState(
            topic_id=topic_id,
            completed_subtopics=doc.get("completed_subtopics", []),
            is_completed=doc.get("is_completed", False),
            progress_pct=doc.get("progress_pct", 0),
            xp_earned=doc.get("xp_earned", 0),
            completed_at=doc.get("completed_at"),
        )
    except Exception as exc:
        logger.warning("[Progress] Get failed: %s", exc)
        return _empty_progress(topic_id)


@router.post("/explain", response_model=ExplainResponse)
async def explain_topic(payload: ExplainRequest):
    valid_modes = {"eli12", "real_example", "analogy", "simplify"}
    mode = payload.mode.lower().strip()
    if mode not in valid_modes:
        raise HTTPException(status_code=422, detail=f"Invalid mode. Choose: {', '.join(valid_modes)}")

    prompt = EXPLAIN_PROMPTS[mode].format(topic=payload.topic)
    try:
        explanation = await _llm_explain(prompt)
        if not explanation or len(explanation.strip()) < 15:
            raise ValueError("Empty response")
    except Exception as exc:
        logger.warning("[Explain] LLM failed for '%s' mode=%s: %s", payload.topic, mode, exc)
        explanation = f"Unable to generate explanation right now. Please try again in a moment."

    return ExplainResponse(explanation=explanation.strip(), mode=mode)


# ─── Helpers ────────────────────────────────────────────────────────────────

async def _persist_progress(topic_id, user_id, completed_subtopics, is_completed, progress_pct, xp_earned):
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return
        update = {
            "$set": {
                "topic_id": topic_id, "user_id": user_id,
                "completed_subtopics": completed_subtopics,
                "is_completed": is_completed,
                "progress_pct": progress_pct, "xp_earned": xp_earned,
                "updated_at": datetime.utcnow(),
            }
        }
        if is_completed:
            update["$set"]["completed_at"] = datetime.utcnow().isoformat()
        await db["topic_progress"].update_one(
            {"topic_id": topic_id, "user_id": user_id}, update, upsert=True
        )
    except Exception as exc:
        logger.warning("[Progress] Persist failed: %s", exc)


async def _unlock_topic(topic_id, user_id):
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return
        await db["topic_unlocks"].update_one(
            {"topic_id": topic_id, "user_id": user_id},
            {"$set": {"topic_id": topic_id, "user_id": user_id,
                      "unlocked_at": datetime.utcnow(), "status": "active"}},
            upsert=True,
        )
    except Exception as exc:
        logger.warning("[Unlock] Failed for %s: %s", topic_id, exc)


def _empty_progress(topic_id: str) -> TopicProgressState:
    return TopicProgressState(
        topic_id=topic_id, completed_subtopics=[], is_completed=False,
        progress_pct=0, xp_earned=0, completed_at=None,
    )


async def _llm_explain(prompt: str) -> str:
    import asyncio
    from langchain_core.messages import HumanMessage

    def _sync():
        from app.tracks.llm.gemini import get_llm
        llm = get_llm()
        resp = llm.invoke([HumanMessage(content=prompt)])
        return resp.content if hasattr(resp, "content") else str(resp)

    return await asyncio.get_event_loop().run_in_executor(None, _sync)
