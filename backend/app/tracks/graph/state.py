"""
LangGraph state definition — Tracks AI.
Source: TaskAI backend/src/graph/state.py

Contains only the TracksAIState TypedDict.
No business logic here.
"""

from typing import TypedDict


class TracksAIState(TypedDict):

    # Input fields (must be provided by the caller)
    skill: str
    assessment_answers: dict
    user_preferences: dict

    # Output fields (populated by agents as the graph runs)
    assessment_result: dict
    prerequisite_result: dict
    roadmap_result: dict
    timeline_result: dict
