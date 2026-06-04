from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.auth import RegisterRequest, LoginRequest
from app.core.database import get_database
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)
from app.models.user import User
from app.schemas.user import UserResponse
from app.api.deps import get_current_user
from app.schemas.profile import UpdateCareerGoalRequest

router = APIRouter(prefix="/auth", tags=["Authentication"])

# register endpoint 
@router.post("/register")
async def register_user(payload: RegisterRequest):
    db = get_database()

    # Check if email already exists
    existing_user = await db.users.find_one({"email": payload.email})

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user = User(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password)
    )

    user_dict = user.model_dump(by_alias=True)

    await db.users.insert_one(user_dict)

    access_token = create_access_token(subject=str(user.id))

    return {
        "success": True,
        "message": "Account created successfully",
        "access_token": access_token,
        "user": UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            auth_provider=user.auth_provider,
            google_id=user.google_id,
            role=user.role,
            created_at=user.created_at,
            updated_at=user.updated_at
        )
    }

# login endpoint
@router.post("/login")
async def login_user(payload: LoginRequest):
    db = get_database()

    user = await db.users.find_one({"email": payload.email})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not verify_password(payload.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    access_token = create_access_token(subject=str(user["_id"]))

    return {
        "success": True,
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "auth_provider": user.get("auth_provider"),
            "google_id": user.get("google_id"),
            "role": user.get("role"),
            "created_at": user.get("created_at"),
            "updated_at": user.get("updated_at")
        }
    }


from app.core.security import decode_access_token       

# @router.get("/me")
# async def get_me(
#     current_user=Depends(get_current_user)
# ):
#     return {
#         "id": str(current_user["_id"]),
#         "name": current_user["name"],
#         "email": current_user["email"],
#         "auth_provider": current_user.get("auth_provider"),
#         "google_id": current_user.get("google_id"),
#         "role": current_user.get("role"),
#         "created_at": current_user.get("created_at"),
#         "updated_at": current_user.get("updated_at")
#     }

# @router.put("/career-goal")
# async def update_career_goal(
#     payload: UpdateCareerGoalRequest,
#     current_user=Depends(get_current_user)
# ):
#     db = get_database()

#     await db.users.update_one(
#         {"_id": current_user["_id"]},
#         {
#             "$set": {
#                 "career_goal": payload.career_goal
#             }
#         }
#     )

#     return {
#         "success": True,
#         "message": "Career goal updated successfully"
#     }