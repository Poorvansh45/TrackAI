"""
LangGraph workflow - Tracks AI.
All nodes are async. Uses graph.ainvoke() — no blocking, no executors.

Wiring:
    START -> assessment -> prerequisite -> roadmap -> timeline -> END

Exports:
    graph                    — compiled StateGraph (importable by FastAPI route)
    run_tracks_ai_workflow   — async convenience wrapper around graph.ainvoke()
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
# Compile once at module load
# ---------------------------------------------------------------------------

graph = builder.compile()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def run_tracks_ai_workflow(input_data: dict) -> dict:
    """
    Run the full Tracks AI pipeline asynchronously via LangGraph ainvoke().
    Awaited directly from the FastAPI endpoint — no executor needed.

    Args:
        input_data: dict with keys:
            - skill (str)
            - assessment_answers (dict)
            - user_preferences (dict)

    Returns:
        Final TracksAIState as a dict with all result keys.
    """
    return await graph.ainvoke(input_data)
