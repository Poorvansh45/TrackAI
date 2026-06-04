from pydantic import BaseModel
from typing import Optional


class UpdateCareerGoalRequest(BaseModel):
    career_goal: str