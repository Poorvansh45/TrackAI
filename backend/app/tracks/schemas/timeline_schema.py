"""
Timeline schemas — Tracks AI.
Source: TaskAI backend/src/schemas/timeline_schema.py
Do NOT modify field names — they match the notebook exactly.
"""

from pydantic import BaseModel


class WeeklyPlan(BaseModel):

    week_number: int

    focus_area: str

    expected_hours: int

    milestones: list[str]

    recommended_resources: list[str]


class TimelineOutput(BaseModel):

    total_duration_weeks: int

    total_estimated_hours: int

    weekly_schedule: list[WeeklyPlan]

    completion_target: str

    planner_summary: str
