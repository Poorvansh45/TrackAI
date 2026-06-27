"""
Timeline Planner Agent - Tracks AI.
Async node for LangGraph. Awaits AIService directly — no executors.
"""
from app.core.ai_service import ai_service, prompts, Task
from app.tracks.schemas.timeline_schema import TimelineOutput


async def run_timeline_generation(roadmap: dict, preferences: dict) -> TimelineOutput:
    prompt = prompts.timeline(roadmap=roadmap, preferences=preferences)
    return await ai_service.generate_structured(
        task=Task.TIMELINE_GENERATION,
        prompt=prompt,
        schema=TimelineOutput,
    )


async def timeline_node(state: dict) -> dict:
    result = await run_timeline_generation(
        roadmap=state["roadmap_result"],
        preferences=state["user_preferences"],
    )
    return {"timeline_result": result.model_dump()}
