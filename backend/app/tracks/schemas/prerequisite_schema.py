"""
Prerequisite schema — Tracks AI.
Source: TaskAI backend/src/schemas/prerequisite_schema.py
Do NOT modify field names — they match the notebook exactly.
"""

from pydantic import BaseModel


class PrerequisiteOutput(BaseModel):

    prerequisites_satisfied: bool

    missing_prerequisites: list[str]

    revision_topics: list[str]

    learning_order: list[str]

    explanation: str
