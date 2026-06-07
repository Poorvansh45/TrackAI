"""
LangGraph workflow — Tracks AI.

Source: notebook/05_tracks_ai_graph.ipynb

Wiring:
    START → assessment → prerequisite → roadmap → timeline → END

Exports:
    graph                    — compiled StateGraph (importable by FastAPI)
    run_tracks_ai_workflow   — convenience wrapper around graph.invoke()

Future FastAPI usage:
    from src.graph.workflow import run_tracks_ai_workflow
    result = run_tracks_ai_workflow(input_data)
"""

from langgraph.graph import StateGraph, START, END

from src.graph.state import TracksAIState
from src.agents.assessment import assessment_node
from src.agents.prerequisite_agent import prerequisite_node
from src.agents.roadmap_agent import roadmap_node
from src.agents.timeline_agent import timeline_node

# ---------------------------------------------------------------------------
# Build graph
# ---------------------------------------------------------------------------

builder = StateGraph(TracksAIState)

builder.add_node("assessment", assessment_node)
builder.add_node("prerequisite", prerequisite_node)
builder.add_node("roadmap", roadmap_node)
builder.add_node("timeline", timeline_node)

builder.add_edge(START, "assessment")
builder.add_edge("assessment", "prerequisite")
builder.add_edge("prerequisite", "roadmap")
builder.add_edge("roadmap", "timeline")
builder.add_edge("timeline", END)

# ---------------------------------------------------------------------------
# Compile
# ---------------------------------------------------------------------------

graph = builder.compile()

# ---------------------------------------------------------------------------
# Public API (ready for FastAPI integration)
# ---------------------------------------------------------------------------


def run_tracks_ai_workflow(input_data: dict) -> dict:
    """
    Run the full Tracks AI pipeline.

    Args:
        input_data: dict with keys:
            - skill (str)              e.g. "AI/ML"
            - assessment_answers (dict)
            - user_preferences (dict)  e.g. {"daily_hours": 2, "goal": "Internship"}

    Returns:
        Final TracksAIState as a dict, including:
            - assessment_result
            - prerequisite_result
            - roadmap_result
            - timeline_result
    """
    return graph.invoke(input_data)
