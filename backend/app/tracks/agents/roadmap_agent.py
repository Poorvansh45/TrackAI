"""
Roadmap Agent - Tracks AI.
Async node for LangGraph. Awaits AIService directly — no executors.
"""
from app.core.ai_service import ai_service, prompts, Task
from app.tracks.schemas.roadmap_schema import RoadmapOutput


async def run_roadmap_generation(prerequisite_result: dict) -> RoadmapOutput:
    prompt = prompts.roadmap(prerequisite_result=prerequisite_result)
    return await ai_service.generate_structured(
        task=Task.ROADMAP_GENERATION,
        prompt=prompt,
        schema=RoadmapOutput,
    )


async def roadmap_node(state: dict) -> dict:
    prerequisite_result = dict(state["prerequisite_result"])
    prerequisite_result["skill"] = state["skill"]
    prerequisite_result["current_level"] = (
        state.get("assessment_result", {}).get("current_level", "")
    )
    result = await run_roadmap_generation(prerequisite_result)
    return {"roadmap_result": result.model_dump()}
