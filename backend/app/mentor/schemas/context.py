from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class StudentLearningContext(BaseModel):
    """Schema representing the student's real-time learning context from Tracks AI."""
    user_id: str
    name: Optional[str] = None
    email: Optional[str] = None
    career_goal: Optional[str] = None
    has_roadmap: bool = False
    roadmap_name: Optional[str] = None  # e.g., "AI/ML Engineering"
    current_phase_number: Optional[int] = None
    current_phase_title: Optional[str] = None
    current_active_topic_id: Optional[str] = None
    current_active_topic_name: Optional[str] = None
    completed_topics: List[str] = []
    locked_topics: List[str] = []
    active_topic_progress_pct: int = 0
    overall_progress_pct: int = 0
    total_xp: int = 0
    streak_days: int = 0
    quiz_attempts_count: int = 0
    weak_quiz_areas: List[str] = []  # Names of weak topics
    recent_activities: List[str] = []  # Recent events log descriptions
