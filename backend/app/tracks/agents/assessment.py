"""
Assessment Agent - Tracks AI.
Async node for LangGraph. Awaits AIService directly — no executors.
"""
from app.core.ai_service import ai_service, prompts, Task
from app.tracks.schemas.assessment_schema import AssessmentOutput


async def run_assessment(skill: str, answers: dict) -> AssessmentOutput:
    prompt = prompts.assessment(skill=skill, answers=answers)
    return await ai_service.generate_structured(
        task=Task.ASSESSMENT,
        prompt=prompt,
        schema=AssessmentOutput,
    )


async def assessment_node(state: dict) -> dict:
    result = await run_assessment(
        skill=state["skill"],
        answers=state["assessment_answers"],
    )
    return {"assessment_result": result.model_dump()}
