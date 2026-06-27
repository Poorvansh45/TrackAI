from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from bson.errors import InvalidId

from app.core.database import get_database
from app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    print("PAYLOAD:", payload)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user_id = payload.get("sub") or payload.get("user_id")
    print("USER ID:", user_id)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    db = get_database()

    # Convert string user_id back to ObjectId for MongoDB lookup
    try:
        object_id = ObjectId(user_id)
        print("OBJECT_ID:", object_id)
    except (InvalidId, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject"
        )

    user = await db.users.find_one({"_id": user_id})
    print("USER:", user)

    if not user:
        print("Looking for:", object_id)
        sample = await db.users.find_one()
        print("Sample user:", sample)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user
            