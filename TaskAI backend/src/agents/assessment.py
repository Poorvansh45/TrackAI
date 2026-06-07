"""
Assessment Agent.

Source: notebook/01_assessment_agent.ipynb + notebook/05_tracks_ai_graph.ipynb

Exposes:
    run_assessment(skill, answers) -> AssessmentOutput
    assessment_node(state)         -> dict  (for LangGraph)
"""

from src.llms.gemini import get_llm
from src.schemas.assessment_schema import AssessmentOutput


def run_assessment(skill: str, answers: dict) -> AssessmentOutput:
    """
    Analyze user assessment responses and identify current level,
    strengths, weaknesses, skill gaps, topics to skip, and
    recommended starting point.

    Args:
        skill:   The target skill the learner wants to acquire (e.g. "AI/ML").
        answers: Dict of assessment question → learner's answer.

    Returns:
        AssessmentOutput with structured analysis.
    """
    llm = get_llm()
    structured_llm = llm.with_structured_output(AssessmentOutput)

    prompt = f"""
You are an expert learning assessment agent.

Your task:

1. Determine learner level.
2. Determine what topics can be skipped.
3. Determine missing prerequisites.
4. Determine recommended starting point.
5. Identify strengths and weaknesses.

Skill:
{skill}

Answers:
{answers}

Return assessment result.
"""

    return structured_llm.invoke(prompt)


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------

def assessment_node(state: dict) -> dict:
    """
    LangGraph node that wraps run_assessment.
    Reads state["skill"] and state["assessment_answers"].
    Writes state["assessment_result"].
    """
    result = run_assessment(
        skill=state["skill"],
        answers=state["assessment_answers"],
    )
    return {"assessment_result": result.model_dump()}
