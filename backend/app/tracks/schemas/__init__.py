"""Tracks AI schemas package."""

from app.tracks.schemas.assessment_schema import AssessmentOutput
from app.tracks.schemas.prerequisite_schema import PrerequisiteOutput
from app.tracks.schemas.roadmap_schema import RoadmapOutput, RoadmapPhase
from app.tracks.schemas.timeline_schema import TimelineOutput, WeeklyPlan

__all__ = [
    "AssessmentOutput",
    "PrerequisiteOutput",
    "RoadmapOutput",
    "RoadmapPhase",
    "TimelineOutput",
    "WeeklyPlan",
]
