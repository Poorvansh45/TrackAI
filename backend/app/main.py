from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Lifespan: Startup
    await connect_to_mongo()
    yield
    # Lifespan: Shutdown
    await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set up CORS middleware
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Register routers with prefix /api/v1
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint returning general service status and documentation link.
    """
    return {
        "message": f"Welcome to the {settings.PROJECT_NAME} service.",
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_STR}/health"
    }
