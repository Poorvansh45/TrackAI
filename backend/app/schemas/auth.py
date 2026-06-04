from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, description="The user's display name")
    email: EmailStr = Field(..., description="The user's email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong user password")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="The user's email address")
    password: str = Field(..., description="The user's password")
