"""
Roadmap Agent — Tracks AI.
Source: TaskAI backend/src/agents/roadmap_agent.py

Exposes:
    run_roadmap_generation(prerequisite_result) -> RoadmapOutput
    roadmap_node(state)                         -> dict  (for LangGraph)
"""

from app.tracks.llm.gemini import get_llm
from app.tracks.schemas.roadmap_schema import RoadmapOutput


def run_roadmap_generation(prerequisite_result: dict) -> RoadmapOutput:
    """
    Generate a structured learning roadmap based on the prerequisite analysis.

    Args:
        prerequisite_result: dict produced by the Prerequisite Agent.

    Returns:
        RoadmapOutput with phases, mini projects, and a capstone project.
    """
    llm = get_llm()
    structured_llm = llm.with_structured_output(RoadmapOutput)

    prompt = f"""
You are an expert learning roadmap generation agent.

Your task:

Generate a structured learning roadmap.

Skill:
{prerequisite_result.get("skill", "")}

Current Level:
{prerequisite_result.get("current_level", "")}

Missing Prerequisites:
{prerequisite_result.get("missing_prerequisites", [])}

Revision Topics:
{prerequisite_result.get("revision_topics", [])}

Learning Order:
{prerequisite_result.get("learning_order", [])}

Instructions:

1. Create logical learning phases.
2. Each phase must have:
   - title
   - objective
   - topics
   - mini project
3. End with one capstone project.
4. Keep roadmap beginner friendly.
5. Return structured output only.
"""

    return structured_llm.invoke(prompt)


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------

def roadmap_node(state: dict) -> dict:
    """
    LangGraph node that wraps run_roadmap_generation.
    Reads state["skill"] and state["prerequisite_result"].
    Writes state["roadmap_result"].
    """
    prerequisite_result = dict(state["prerequisite_result"])
    prerequisite_result["skill"] = state["skill"]
    prerequisite_result["current_level"] = (
        state.get("assessment_result", {}).get("current_level", "")
    )

    result = run_roadmap_generation(prerequisite_result)
    return {"roadmap_result": result.model_dump()}
