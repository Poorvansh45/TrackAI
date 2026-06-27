"""
Prerequisite Agent - Tracks AI.
Async node for LangGraph. Awaits AIService directly — no executors.
"""
from app.core.ai_service import ai_service, prompts, Task
from app.tracks.schemas.prerequisite_schema import PrerequisiteOutput


async def run_prerequisite_analysis(assessment_result: dict) -> PrerequisiteOutput:
    prompt = prompts.prerequisite(assessment_result=assessment_result)
    return await ai_service.generate_structured(
        task=Task.PREREQUISITE_ANALYSIS,
        prompt=prompt,
        schema=PrerequisiteOutput,
    )


async def prerequisite_node(state: dict) -> dict:
    assessment_result = dict(state["assessment_result"])
    assessment_result["skill"] = state["skill"]
    result = await run_prerequisite_analysis(assessment_result)
    return {"prerequisite_result": result.model_dump()}
