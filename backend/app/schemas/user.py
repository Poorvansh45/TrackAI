from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import PyObjectId

class UserResponse(BaseModel):
    id: PyObjectId = Field(..., alias="id")
    name: str
    email: EmailStr
    auth_provider: str
    google_id: Optional[str] = None
    role: str
    created_at: datetime
    updated_at: datetime

    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "603f7e5f9b1d8b2d1c8b4567",
                "name": "Jane Doe",
                "email": "jane@example.com",
                "auth_provider": "local",
                "role": "student",
                "created_at": "2026-06-04T11:00:00Z",
                "updated_at": "2026-06-04T11:00:00Z"
            }
        }
    }
