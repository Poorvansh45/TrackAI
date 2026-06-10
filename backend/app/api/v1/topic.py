"""
Topic Learning Workspace API

GET  /api/v1/topic/{topic_id}   — Returns full topic data
POST /api/v1/topic/progress      — Save checklist progress  
POST /api/v1/topic/explain       — AI re-explain (Gemini Flash via get_llm)
"""

import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

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
    user_id: Optional[str] = None


class ExplainRequest(BaseModel):
    topic: str = Field(description="Topic name e.g. 'Variables'")
    mode: str = Field(description="eli12 | real_example | analogy | simplify")


class ExplainResponse(BaseModel):
    explanation: str
    mode: str


# ─── Static topic data ──────────────────────────────────────────────────────

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
        "resources": {
            "videos": [
                {
                    "type": "core",
                    "title": "Python Variables — Complete Guide",
                    "creator": "CS Dojo",
                    "duration": "12 min",
                    "thumbnail": "https://img.youtube.com/vi/Z1Yd7upQsXY/mqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=Z1Yd7upQsXY",
                },
                {
                    "type": "deep_dive",
                    "title": "Python Variables Deep Dive Playlist",
                    "creator": "Corey Schafer",
                    "duration": "45 min",
                    "thumbnail": "https://img.youtube.com/vi/YYXdXT2l-Gg/mqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=YYXdXT2l-Gg",
                },
                {
                    "type": "one_shot",
                    "title": "Python Variables in 5 Minutes",
                    "creator": "Programming with Mosh",
                    "duration": "5 min",
                    "thumbnail": "https://img.youtube.com/vi/_uQrJ0TkZlc/mqdefault.jpg",
                    "url": "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
                },
            ],
            "reading": [
                {
                    "source": "W3Schools",
                    "label": "Python Variables",
                    "url": "https://www.w3schools.com/python/python_variables.asp",
                    "icon": "W",
                },
                {
                    "source": "GeeksForGeeks",
                    "label": "Python Variables Article",
                    "url": "https://www.geeksforgeeks.org/python-variables/",
                    "icon": "G",
                },
                {
                    "source": "Python Docs",
                    "label": "Official Documentation",
                    "url": "https://docs.python.org/3/reference/simple_stmts.html#assignment-statements",
                    "icon": "P",
                },
                {
                    "source": "Real Python",
                    "label": "Variables in Python",
                    "url": "https://realpython.com/python-variables/",
                    "icon": "R",
                },
            ],
        },
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
    }
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
    summary="Get full topic workspace data",
)
async def get_topic(topic_id: str):
    topic_id = topic_id.lower().strip()
    data = TOPIC_DB.get(topic_id)

    if not data:
        human_name = " ".join(w.capitalize() for w in topic_id.split("-"))
        data = _build_generic_topic(topic_id, human_name)

    return TopicResponse(**data)


@router.post(
    "/progress",
    summary="Save topic checklist progress",
    status_code=status.HTTP_200_OK,
)
async def save_progress(payload: ProgressRequest):
    logger.info(
        "Progress | topic=%s completed=%s user=%s",
        payload.topic_id,
        payload.completed_subtopics,
        payload.user_id or "anon",
    )
    # TODO: persist to MongoDB when auth is wired
    return {
        "success": True,
        "topic_id": payload.topic_id,
        "completed_count": len(payload.completed_subtopics),
    }


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
        # Lightly adapt fallback to the actual topic if it's not Variables
        if "variables" not in payload.topic.lower():
            fallback = (
                f"Here's a concise explanation of **{payload.topic}**:\n\n"
                + fallback.split("\n\n", 1)[-1]
            )
        explanation = fallback

    return ExplainResponse(explanation=explanation.strip(), mode=mode)


# ─── Helpers ────────────────────────────────────────────────────────────────

async def _llm_explain(prompt: str) -> str:
    """Call the shared LLM (Gemini + Groq fallback) asynchronously."""
    import asyncio
    from langchain_core.messages import HumanMessage

    def _sync():
        from app.tracks.llm.gemini import get_llm
        llm = get_llm()
        response = llm.invoke([HumanMessage(content=prompt)])
        # LangChain ChatModel returns an AIMessage
        return response.content if hasattr(response, "content") else str(response)

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync)


def _build_generic_topic(topic_id: str, human_name: str) -> dict:
    """Generate a generic topic data dict for any unknown topic slug."""
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
        "resources": {
            "videos": [
                {
                    "type": "core",
                    "title": f"{human_name} — Core Concepts",
                    "creator": "freeCodeCamp",
                    "duration": "~15 min",
                    "thumbnail": "https://img.youtube.com/vi/rfscVS0vtbw/mqdefault.jpg",
                    "url": f"https://www.youtube.com/results?search_query={topic_id.replace('-', '+')}+tutorial",
                },
                {
                    "type": "deep_dive",
                    "title": f"{human_name} Deep Dive",
                    "creator": "Traversy Media",
                    "duration": "~40 min",
                    "thumbnail": "https://img.youtube.com/vi/YYXdXT2l-Gg/mqdefault.jpg",
                    "url": f"https://www.youtube.com/results?search_query={topic_id.replace('-', '+')}+full+course",
                },
                {
                    "type": "one_shot",
                    "title": f"{human_name} in 5 Minutes",
                    "creator": "Fireship",
                    "duration": "~5 min",
                    "thumbnail": "https://img.youtube.com/vi/_uQrJ0TkZlc/mqdefault.jpg",
                    "url": f"https://www.youtube.com/results?search_query={topic_id.replace('-', '+')}+one+shot",
                },
            ],
            "reading": [
                {
                    "source": "W3Schools",
                    "label": f"{human_name} Guide",
                    "url": f"https://www.w3schools.com/search/search_result.asp?q={topic_id}",
                    "icon": "W",
                },
                {
                    "source": "GeeksForGeeks",
                    "label": f"{human_name} — GFG",
                    "url": f"https://www.geeksforgeeks.org/search/?q={topic_id}",
                    "icon": "G",
                },
                {
                    "source": "Python Docs",
                    "label": "Official Documentation",
                    "url": f"https://docs.python.org/3/search.html?q={topic_id}",
                    "icon": "P",
                },
                {
                    "source": "Real Python",
                    "label": f"{human_name} Tutorial",
                    "url": f"https://realpython.com/search?q={topic_id}",
                    "icon": "R",
                },
            ],
        },
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
