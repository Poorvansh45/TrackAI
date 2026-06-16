from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.profile import router as profile_router
from app.api.v1.topic import router as topic_router
from app.api.v1.roadmap_progress import router as roadmap_progress_router
from app.api.v1.quiz import router as quiz_router
from app.tracks.router import router as tracks_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(tracks_router)
api_router.include_router(topic_router)
api_router.include_router(roadmap_progress_router)
api_router.include_router(quiz_router)


@api_router.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "SkillSync API",
        "version": "v1"
    }
