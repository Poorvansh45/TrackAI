"""
Tracks AI API route.

POST /api/v1/tracks/generate
    Accepts user skill, assessment answers, and preferences.
    Runs the full LangGraph workflow.
    Returns assessment + prerequisite + roadmap + timeline results.

This is the single endpoint the frontend onboarding flow calls.
"""

import asyncio
import logging

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/tracks", tags=["Tracks AI"])


# ---------------------------------------------------------------------------
# Request / Response schemas (API layer only — not the agent schemas)
# ---------------------------------------------------------------------------

class AssessmentAnswersModel(BaseModel):
    """
    Free-form dict of question_id -> answer string.
    The frontend sends boolean yes/no answers; we convert them to
    descriptive strings before passing to the LLM for richer context.
    """
    answers: dict[str, str] = Field(
        description="Map of question ID to answer string",
        examples=[{"python": "Yes", "math": "No", "ml-basics": "No"}],
    )


class UserPreferencesModel(BaseModel):
    daily_hours: float = Field(ge=0.5, le=12, description="Daily study hours")
    weekly_availability: int = Field(ge=1, le=7, description="Days per week available")
    learning_style: str = Field(description="Preferred learning style e.g. Visual")
    goal: str = Field(description="Learning goal e.g. Internship")


class GenerateRoadmapRequest(BaseModel):
    skill: str = Field(min_length=1, description="Target skill e.g. AI/ML")
    assessment_answers: dict[str, str] = Field(
        description="Map of question ID to answer string"
    )
    user_preferences: UserPreferencesModel


class GenerateRoadmapResponse(BaseModel):
    success: bool = True
    skill: str
    assessment_result: dict
    prerequisite_result: dict
    roadmap_result: dict
    timeline_result: dict


# ---------------------------------------------------------------------------
# Skill label mapping (frontend ID -> human-readable label for the LLM)
# ---------------------------------------------------------------------------

SKILL_LABELS: dict[str, str] = {
    "ai-ml": "AI/ML Engineering",
    "fullstack": "Full Stack Web Development",
    "data-science": "Data Science",
    "dsa": "Data Structures & Algorithms",
    "devops": "DevOps & Cloud Engineering",
    "trading": "Quantitative Trading",
    "cybersecurity": "Cybersecurity",
    "cloud": "Cloud Architecture",
    "custom": "Custom Learning Track",
}


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/generate",
    response_model=GenerateRoadmapResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate personalized roadmap via Tracks AI workflow",
    description=(
        "Runs the full LangGraph pipeline: "
        "Assessment → Prerequisite Analysis → Roadmap Generation → Timeline Planning. "
        "Returns structured JSON ready for frontend display."
    ),
)
async def generate_roadmap(payload: GenerateRoadmapRequest):
    """
    Entry point for the onboarding roadmap generation flow.

    The LangGraph graph.invoke() call is CPU-bound (blocking).
    We run it in a thread pool executor so FastAPI's async event loop
    is not blocked for other requests.
    """
    # Resolve human-readable skill name for the LLM
    skill_label = SKILL_LABELS.get(payload.skill, payload.skill)

    # Build the workflow input dict
    input_data = {
        "skill": skill_label,
        "assessment_answers": payload.assessment_answers,
        "user_preferences": {
            "daily_hours": payload.user_preferences.daily_hours,
            "weekly_availability": payload.user_preferences.weekly_availability,
            "learning_style": payload.user_preferences.learning_style,
            "goal": payload.user_preferences.goal,
        },
    }

    try:
        # Import here to avoid circular import at module load time
        from app.tracks.graph.workflow import run_tracks_ai_workflow

        # Run blocking LangGraph workflow in thread pool
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, run_tracks_ai_workflow, input_data)

    except Exception as exc:
        logger.error("Tracks AI workflow failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Roadmap generation failed: {str(exc)}",
        )

    return GenerateRoadmapResponse(
        success=True,
        skill=skill_label,
        assessment_result=result.get("assessment_result", {}),
        prerequisite_result=result.get("prerequisite_result", {}),
        roadmap_result=result.get("roadmap_result", {}),
        timeline_result=result.get("timeline_result", {}),
    )
