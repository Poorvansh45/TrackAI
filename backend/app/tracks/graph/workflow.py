"""
LangGraph workflow — Tracks AI.
Source: TaskAI backend/src/graph/workflow.py

Wiring:
    START -> assessment -> prerequisite -> roadmap -> timeline -> END

Exports:
    graph                    — compiled StateGraph (importable by FastAPI route)
    run_tracks_ai_workflow   — sync convenience wrapper around graph.invoke()
"""

from langgraph.graph import StateGraph, START, END

from app.tracks.graph.state import TracksAIState
from app.tracks.agents.assessment import assessment_node
from app.tracks.agents.prerequisite_agent import prerequisite_node
from app.tracks.agents.roadmap_agent import roadmap_node
from app.tracks.agents.timeline_agent import timeline_node

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
# Compile (module-level — compiled once on import)
# ---------------------------------------------------------------------------

graph = builder.compile()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_tracks_ai_workflow(input_data: dict) -> dict:
    """
    Run the full Tracks AI pipeline synchronously.

    Args:
        input_data: dict with keys:
            - skill (str)                e.g. "AI/ML"
            - assessment_answers (dict)  question-id -> answer string
            - user_preferences (dict)    daily_hours, weekly_availability,
                                         learning_style, goal

    Returns:
        Final TracksAIState as a dict, including:
            - assessment_result
            - prerequisite_result
            - roadmap_result
            - timeline_result
    """
    return graph.invoke(input_data)
