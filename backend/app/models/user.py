from bson import ObjectId
from datetime import datetime, timezone
from typing import Annotated, Optional
from pydantic import BaseModel, Field, BeforeValidator, EmailStr

# Custom Type to handle MongoDB ObjectId as a string in Pydantic v2
PyObjectId = Annotated[str, BeforeValidator(str)]

class User(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias="_id")
    name: str
    email: EmailStr
    password: str
    auth_provider: str = "local"
    google_id: Optional[str] = None
    role: str = "student"

    # SkillSync future fields
    career_goal: Optional[str] = None
    assessment_completed: bool = False
    profile_completion: int = 0
    last_active_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))    

    model_config = {
        "populate_by_name": True,
        "json_encoders": {ObjectId: str},
        "json_schema_extra": {
            "example": {
                "name": "Jane Doe",
                "email": "jane@example.com",
                "auth_provider": "local",
                "role": "student",
            }
        }
    }
