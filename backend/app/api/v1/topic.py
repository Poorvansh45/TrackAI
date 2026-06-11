"""
Topic Learning Workspace API

GET  /api/v1/topic/{topic_id}        — Returns full topic data with REAL resources
POST /api/v1/topic/progress           — Save checklist progress + unlock next topic
POST /api/v1/topic/explain            — AI re-explain (Gemini Flash via get_llm)
GET  /api/v1/topic/{topic_id}/progress — Get saved progress for a topic
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
    topic_id: str = Field(description="Topic slug e.g. 'variables'")
    completed_subtopics: list[str] = Field(description="List of completed subtopic names")
    is_completed: bool = Field(default=False, description="Whether topic is fully mastered")
    user_id: Optional[str] = None
    next_topic_id: Optional[str] = Field(default=None, description="Next topic slug to unlock")


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
    topic: str = Field(description="Topic name e.g. 'Variables'")
    mode: str = Field(description="eli12 | real_example | analogy | simplify")


class ExplainResponse(BaseModel):
    explanation: str
    mode: str


# ─── Static topic content database ──────────────────────────────────────────
# Resources are now served by app.services.resources — only content here

TOPIC_DB: dict[str, dict] = {
    "variables": {
        "title": "Variables",
        "difficulty": "Beginner",
        "estimated_time": "1.5 Hours",
        "overview": (
            "Variables are containers used to store data values. They allow programs to "
            "remember information and are one of the most fundamental concepts in any "
            "programming language. In Python, you create a variable the moment you first "
            "assign a value to it — no declaration needed."
        ),
        "why_it_matters": [
            "Used in every single Python program ever written",
            "Without variables you cannot store user input",
            "Required to perform any kind of calculation or logic",
            "Foundation for building real applications",
            "Essential for training machine learning models",
        ],
        "subtopics": [
            "What Is A Variable",
            "Variable Naming Rules",
            "Assigning Values",
            "Multiple Assignment",
            "Variable Types",
        ],
        "summary": [
            "Variables store values and are created on assignment.",
            "Python variables require no explicit type declaration.",
            "Use meaningful, lowercase names with underscores.",
            "Values can change during program execution.",
            "Common types: int, float, str, bool, list, dict.",
        ],
        "key_concepts": [
            {"term": "Variable",       "definition": "stores data"},
            {"term": "Assignment",     "definition": "sets a value"},
            {"term": "Dynamic Typing", "definition": "type inferred automatically"},
            {"term": "Identifier",     "definition": "the variable name"},
            {"term": "Scope",          "definition": "where the variable exists"},
        ],
    },
    "data-types": {
        "title": "Data Types",
        "difficulty": "Beginner",
        "estimated_time": "1.5 Hours",
        "overview": (
            "Data types define what kind of value a variable holds and what operations "
            "can be performed on it. Python has built-in types like int, float, str, "
            "bool, list, tuple, dict and set. Understanding types prevents bugs and "
            "helps you write expressive, efficient code."
        ),
        "why_it_matters": [
            "Every variable has a type — knowing it prevents runtime errors",
            "Type errors are one of the most common bugs in Python",
            "Choosing the right type makes your code faster and clearer",
            "Required for data processing, APIs, and machine learning",
            "Foundation for understanding Python's type system",
        ],
        "subtopics": [
            "Numeric Types",
            "String Type",
            "Boolean Type",
            "List and Tuple",
            "Dict and Set",
        ],
        "summary": [
            "Python has dynamic typing — types are inferred at runtime.",
            "Core types: int, float, str, bool, list, tuple, dict, set.",
            "Use type() to inspect a variable's type.",
            "Type casting converts between types: int('5') → 5.",
            "Mutable types (list, dict) can be changed; tuples cannot.",
        ],
        "key_concepts": [
            {"term": "int",   "definition": "whole number"},
            {"term": "float", "definition": "decimal number"},
            {"term": "str",   "definition": "text sequence"},
            {"term": "bool",  "definition": "True or False"},
            {"term": "list",  "definition": "ordered mutable collection"},
        ],
    },
    "functions": {
        "title": "Functions",
        "difficulty": "Beginner",
        "estimated_time": "2 Hours",
        "overview": (
            "Functions are reusable blocks of code that perform a specific task. "
            "They reduce repetition, improve readability, and make code easier to test. "
            "Python functions are defined with 'def', can accept parameters, and "
            "optionally return a value."
        ),
        "why_it_matters": [
            "Functions are the #1 tool for writing clean, reusable code",
            "Every Python framework and library is built from functions",
            "Without functions you would repeat code endlessly",
            "Required to understand classes, decorators, and callbacks",
            "Used in every real-world Python project",
        ],
        "subtopics": [
            "Defining Functions",
            "Parameters and Arguments",
            "Return Values",
            "Default Parameters",
            "Lambda Functions",
        ],
        "summary": [
            "Functions are defined with 'def name(params):'",
            "Call a function by name with parentheses: my_func()",
            "Parameters receive input; return sends output back.",
            "Default parameters make arguments optional.",
            "Lambda is a one-line anonymous function.",
        ],
        "key_concepts": [
            {"term": "def",        "definition": "defines a function"},
            {"term": "parameter",  "definition": "input variable"},
            {"term": "return",     "definition": "outputs a value"},
            {"term": "argument",   "definition": "value passed to function"},
            {"term": "lambda",     "definition": "inline anonymous function"},
        ],
    },
}


# ─── AI explain prompts + fallbacks ─────────────────────────────────────────

EXPLAIN_PROMPTS: dict[str, str] = {
    "eli12": (
        "You are a patient, friendly tutor explaining to a 12-year-old. "
        "Use simple words, fun analogies, and short sentences. Max 120 words. "
        "No code unless absolutely necessary. No jargon. "
        "Topic: {topic}"
    ),
    "real_example": (
        "Give one concrete, relatable real-life example that explains: {topic}. "
        "Use something from everyday life (phones, food, games, money). "
        "Keep it under 100 words. Be specific and vivid."
    ),
    "analogy": (
        "Create a strong visual analogy that explains: {topic}. "
        "Use a physical object or scene someone can picture. "
        "Keep it under 100 words. Make it memorable."
    ),
    "simplify": (
        "Give the absolute minimum explanation of: {topic}. "
        "Bullet points preferred. Under 80 words. "
        "Just the core idea + one tiny example if helpful. No fluff."
    ),
}

FALLBACK_EXPLANATIONS: dict[str, str] = {
    "eli12": (
        "Imagine you're playing a video game. A variable is like a save slot — "
        "it holds your score, health, and player name. Every time something changes, "
        "the save slot gets updated. Without save slots, the game forgets everything "
        "the moment you turn it off. Variables are the game's memory."
    ),
    "real_example": (
        "Think about your phone's battery percentage. That '82%' on your screen "
        "is a variable — the phone constantly updates it as you use it. "
        "When it hits 0, the phone shuts down. It's data stored in a named container "
        "that changes over time. That's exactly what a variable is."
    ),
    "analogy": (
        "Picture a whiteboard with labeled boxes. You write 'score = 0' in one box "
        "and 'playerName = Alex' in another. As the game progresses, you erase the "
        "old value and write a new one — but the box label stays the same. "
        "Python does this in computer memory instead of on a whiteboard."
    ),
    "simplify": (
        "A variable = a named box that stores a value.\n\n"
        "Example:\n  age = 25\n\n"
        "Now 'age' holds 25. Later:\n  age = 26\n\n"
        "The box now holds 26. That's all a variable is."
    ),
}


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get(
    "/{topic_id}",
    response_model=TopicResponse,
    summary="Get full topic workspace data with real resources",
)
async def get_topic(topic_id: str):
    topic_id = topic_id.lower().strip()

    # Get base content
    data = TOPIC_DB.get(topic_id)
    if not data:
        human_name = " ".join(w.capitalize() for w in topic_id.split("-"))
        data = _build_generic_topic(topic_id, human_name)

    # Fetch REAL resources (static cache → MongoDB → LLM)
    from app.services.resources import get_topic_resources
    skill = "Python"  # Default; could be inferred from track context in future
    resources = await get_topic_resources(topic_id, data["title"], skill)

    # Merge real resources into topic data
    data_with_resources = {**data, "resources": resources}

    return TopicResponse(**data_with_resources)


@router.post(
    "/progress",
    response_model=ProgressResponse,
    summary="Save topic checklist progress + unlock next topic",
    status_code=status.HTTP_200_OK,
)
async def save_progress(payload: ProgressRequest):
    total_subtopics = 5  # default
    topic_data = TOPIC_DB.get(payload.topic_id.lower())
    if topic_data:
        total_subtopics = len(topic_data.get("subtopics", []))

    completed_count = len(payload.completed_subtopics)
    progress_pct = round((completed_count / total_subtopics) * 100) if total_subtopics > 0 else 0
    xp_earned = 100 if payload.is_completed else 0

    # Persist to MongoDB
    await _persist_progress(
        topic_id=payload.topic_id,
        user_id=payload.user_id or "anon",
        completed_subtopics=payload.completed_subtopics,
        is_completed=payload.is_completed,
        progress_pct=progress_pct,
        xp_earned=xp_earned,
    )

    # Unlock next topic if completed
    next_unlocked = None
    if payload.is_completed and payload.next_topic_id:
        await _unlock_topic(payload.next_topic_id, payload.user_id or "anon")
        next_unlocked = payload.next_topic_id
        logger.info("[Progress] Unlocked next topic: %s for user: %s", next_unlocked, payload.user_id)

    logger.info(
        "Progress | topic=%s completed=%s/%s xp=%d user=%s",
        payload.topic_id,
        completed_count,
        total_subtopics,
        xp_earned,
        payload.user_id or "anon",
    )

    return ProgressResponse(
        success=True,
        topic_id=payload.topic_id,
        completed_count=completed_count,
        is_completed=payload.is_completed,
        xp_earned=xp_earned,
        next_topic_unlocked=next_unlocked,
    )


@router.get(
    "/{topic_id}/progress",
    response_model=TopicProgressState,
    summary="Get saved progress for a topic",
)
async def get_progress(topic_id: str, user_id: Optional[str] = None):
    topic_id = topic_id.lower().strip()
    uid = user_id or "anon"

    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return _empty_progress(topic_id)

        coll = db["topic_progress"]
        doc = await coll.find_one({"topic_id": topic_id, "user_id": uid})
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
        logger.warning("[Progress] Get progress failed: %s", exc)
        return _empty_progress(topic_id)


@router.post(
    "/explain",
    response_model=ExplainResponse,
    summary="AI-powered topic re-explanation",
)
async def explain_topic(payload: ExplainRequest):
    valid_modes = {"eli12", "real_example", "analogy", "simplify"}
    mode = payload.mode.lower().strip()
    if mode not in valid_modes:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid mode. Choose from: {', '.join(valid_modes)}",
        )

    prompt = EXPLAIN_PROMPTS[mode].format(topic=payload.topic)

    try:
        explanation = await _llm_explain(prompt)
        if not explanation or len(explanation.strip()) < 15:
            raise ValueError("Empty LLM response")
    except Exception as exc:
        logger.warning("LLM explain failed for '%s' mode=%s: %s", payload.topic, mode, exc)
        fallback = FALLBACK_EXPLANATIONS.get(mode, FALLBACK_EXPLANATIONS["simplify"])
        if "variables" not in payload.topic.lower():
            fallback = (
                f"Here's a concise explanation of **{payload.topic}**:\n\n"
                + fallback.split("\n\n", 1)[-1]
            )
        explanation = fallback

    return ExplainResponse(explanation=explanation.strip(), mode=mode)


# ─── Helpers ────────────────────────────────────────────────────────────────

async def _persist_progress(
    topic_id: str,
    user_id: str,
    completed_subtopics: list[str],
    is_completed: bool,
    progress_pct: int,
    xp_earned: int,
) -> None:
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return

        coll = db["topic_progress"]
        update_doc = {
            "$set": {
                "topic_id": topic_id,
                "user_id": user_id,
                "completed_subtopics": completed_subtopics,
                "is_completed": is_completed,
                "progress_pct": progress_pct,
                "xp_earned": xp_earned,
                "updated_at": datetime.utcnow(),
            }
        }
        if is_completed:
            update_doc["$set"]["completed_at"] = datetime.utcnow().isoformat()

        await coll.update_one(
            {"topic_id": topic_id, "user_id": user_id},
            update_doc,
            upsert=True,
        )
    except Exception as exc:
        logger.warning("[Progress] Persist failed: %s", exc)


async def _unlock_topic(topic_id: str, user_id: str) -> None:
    """Mark a topic as unlocked (active) in the user's roadmap state."""
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return

        coll = db["topic_unlocks"]
        await coll.update_one(
            {"topic_id": topic_id, "user_id": user_id},
            {
                "$set": {
                    "topic_id": topic_id,
                    "user_id": user_id,
                    "unlocked_at": datetime.utcnow(),
                    "status": "active",
                }
            },
            upsert=True,
        )
    except Exception as exc:
        logger.warning("[Unlock] Failed to unlock topic %s: %s", topic_id, exc)


def _empty_progress(topic_id: str) -> TopicProgressState:
    return TopicProgressState(
        topic_id=topic_id,
        completed_subtopics=[],
        is_completed=False,
        progress_pct=0,
        xp_earned=0,
        completed_at=None,
    )


async def _llm_explain(prompt: str) -> str:
    import asyncio
    from langchain_core.messages import HumanMessage

    def _sync():
        from app.tracks.llm.gemini import get_llm
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        return response.content if hasattr(response, "content") else str(response)

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync)


def _build_generic_topic(topic_id: str, human_name: str) -> dict:
    return {
        "title": human_name,
        "difficulty": "Beginner",
        "estimated_time": "1.5 Hours",
        "overview": (
            f"{human_name} is a core concept that you need to master to advance in your track. "
            "This workspace will guide you through it with curated resources, "
            "a progress checklist, and on-demand AI explanations."
        ),
        "why_it_matters": [
            f"{human_name} appears in virtually every real-world project",
            "Without this, advanced topics become much harder to grasp",
            "Mastering fundamentals accelerates all future learning",
            "Tested in technical interviews and coding assessments",
            "Foundation for building scalable production systems",
        ],
        "subtopics": [
            f"Introduction to {human_name}",
            "Core Concepts",
            "Practical Applications",
            "Common Patterns",
            "Advanced Usage",
        ],
        "summary": [
            f"{human_name} is a fundamental concept in programming.",
            "Practice consistently to build real intuition.",
            "Understand the why, not just the syntax.",
            "Apply concepts in small projects immediately.",
            "Review key concepts every day until mastered.",
        ],
        "key_concepts": [
            {"term": human_name,        "definition": "core concept to master"},
            {"term": "Syntax",          "definition": "rules for writing valid code"},
            {"term": "Semantics",       "definition": "what the code actually means"},
            {"term": "Pattern",         "definition": "reusable solution template"},
            {"term": "Best Practice",   "definition": "proven approach used by pros"},
        ],
    }
