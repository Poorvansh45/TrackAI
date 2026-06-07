"""
Prerequisite Agent.

Source: notebook/02_prerequisite_agent.ipynb + notebook/05_tracks_ai_graph.ipynb

Exposes:
    run_prerequisite_analysis(assessment_result) -> PrerequisiteOutput
    prerequisite_node(state)                     -> dict  (for LangGraph)
"""

from src.llms.gemini import get_llm
from src.schemas.prerequisite_schema import PrerequisiteOutput


def run_prerequisite_analysis(assessment_result: dict) -> PrerequisiteOutput:
    """
    Determine missing prerequisites, revision topics, and learning order
    based on the assessment result.

    Args:
        assessment_result: dict produced by the Assessment Agent (AssessmentOutput).
                           Expected keys: skill, current_level, strengths, weaknesses.

    Returns:
        PrerequisiteOutput with structured prerequisite analysis.
    """
    llm = get_llm()
    structured_llm = llm.with_structured_output(PrerequisiteOutput)

    prompt = f"""
You are a prerequisite analysis agent.

Skill:
{assessment_result.get("skill", "")}

Current Level:
{assessment_result.get("current_level", "")}

Strengths:
{assessment_result.get("strengths", [])}

Weaknesses:
{assessment_result.get("weaknesses", [])}

Determine:

1. Missing prerequisites.
2. Topics needing revision.
3. Recommended learning order.
4. Whether prerequisites are satisfied.

Return structured output.
"""

    return structured_llm.invoke(prompt)


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------

def prerequisite_node(state: dict) -> dict:
    """
    LangGraph node that wraps run_prerequisite_analysis.
    Reads state["skill"] and state["assessment_result"].
    Writes state["prerequisite_result"].
    """
    # Merge skill into assessment_result so the agent has full context
    assessment_result = dict(state["assessment_result"])
    assessment_result["skill"] = state["skill"]

    result = run_prerequisite_analysis(assessment_result)
    return {"prerequisite_result": result.model_dump()}
