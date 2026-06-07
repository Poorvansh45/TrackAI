"""
Roadmap schemas.

Source: notebook/03_roadmap_agent.ipynb
Do NOT modify field names or types — they match the notebook exactly.
"""

from pydantic import BaseModel


class RoadmapPhase(BaseModel):

    phase_number: int

    phase_title: str

    objective: str

    topics: list[str]

    expected_outcomes: list[str]

    mini_project: str


class RoadmapOutput(BaseModel):

    roadmap_title: str

    estimated_phases: int

    phases: list[RoadmapPhase]

    final_capstone_project: str

    roadmap_summary: str
