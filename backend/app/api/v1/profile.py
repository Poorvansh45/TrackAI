from fastapi import APIRouter, Depends
from app.core.database import get_database
from app.schemas.profile import UpdateCareerGoalRequest
from app.api.deps import get_current_user

router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)


@router.get("/me")
async def get_me(
    current_user=Depends(get_current_user)
):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "career_goal": current_user.get("career_goal"),
        "auth_provider": current_user.get("auth_provider"),
        "google_id": current_user.get("google_id"),
        "role": current_user.get("role"),
        "created_at": current_user.get("created_at"),
        "updated_at": current_user.get("updated_at")
    }


@router.put("/career-goal")
async def update_career_goal(
    payload: UpdateCareerGoalRequest,
    current_user=Depends(get_current_user)
):
    db = get_database()

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "career_goal": payload.career_goal
            }
        }
    )

    return {
        "success": True,
        "message": "Career goal updated successfully"
    }