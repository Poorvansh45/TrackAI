"""
Assessment schema — Tracks AI.
Source: TaskAI backend/src/schemas/assessment_schema.py
Do NOT modify field names — they match the notebook exactly.
"""

from pydantic import BaseModel, Field


class AssessmentOutput(BaseModel):

    current_level: str = Field(description="Current learner level")

    start_from: str = Field(description="Recommended starting point")

    strengths: list[str]

    weaknesses: list[str]

    skip_topics: list[str]

    recommended_focus: list[str]

    reasoning: str
