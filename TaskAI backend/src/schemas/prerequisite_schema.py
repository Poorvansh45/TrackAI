"""
Prerequisite schema.

Source: notebook/02_prerequisite_agent.ipynb
Do NOT modify field names or types — they match the notebook exactly.
"""

from pydantic import BaseModel


class PrerequisiteOutput(BaseModel):

    prerequisites_satisfied: bool

    missing_prerequisites: list[str]

    revision_topics: list[str]

    learning_order: list[str]

    explanation: str
