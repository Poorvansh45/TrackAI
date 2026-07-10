from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.api.v1.router import api_router
from app.mentor.exceptions import MentorException
import logging

logger = logging.getLogger("app.main")


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

@app.exception_handler(MentorException)
async def mentor_exception_handler(request: Request, exc: MentorException):
    logger.error(f"[MENTOR EXCEPTION] {type(exc).__name__}: {exc.message} | Detail: {exc.detail}")
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error_type": type(exc).__name__,
            "message": exc.message,
            "detail": exc.detail
        }
    )

# ── Global 422 handler: logs raw body so mismatches are immediately visible ──
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    try:
        body = await request.body()
        body_str = body.decode("utf-8", errors="replace")
    except Exception:
        body_str = "<could not read body>"
    logger.error(
        f"\n[422 VALIDATION ERROR] {request.method} {request.url.path}\n"
        f"  Errors  : {exc.errors()}\n"
        f"  Raw body: {body_str}\n"
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors(), "body": body_str})

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
