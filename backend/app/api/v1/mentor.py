import asyncio
import json
import logging
import os
import tempfile
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form, status, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_database
from app.api.deps import get_current_user
from app.mentor.exceptions import RateLimitExceededException, MentorException
from datetime import datetime, timezone

from app.mentor.deps import (
    get_mentor_graph,
    get_memory_manager,
    get_pdf_agent,
    get_yt_agent,
)
from app.mentor.graph.mentor_graph import MentorGraph
from app.mentor.memory.manager import MemoryManager
from app.mentor.agents.pdf_agent import PDFLearningAgent
from app.mentor.agents.youtube_agent import YouTubeLearningAgent
from app.mentor.schemas.chat import ChatRequest, ChatResponse
from app.mentor.schemas.pdf import PDFMetadata
from app.mentor.schemas.youtube import VideoMetadata

from app.mentor.context.service import StudentLearningContextService

logger = logging.getLogger("app.api.v1.mentor")

router = APIRouter(prefix="/mentor", tags=["Mentor AI"])


async def _log_validation_error(request: Request, exc: RequestValidationError):
    """Log the raw request body when FastAPI 422-rejects a mentor request."""
    try:
        body = await request.body()
        body_str = body.decode("utf-8", errors="replace")
    except Exception:
        body_str = "<could not read body>"
    logger.error(
        f"\n[MENTOR 422] Validation error on {request.method} {request.url.path}\n"
        f"  Errors  : {exc.errors()}\n"
        f"  Raw body: {body_str}\n"
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": body_str},
    )




async def _check_and_increment_chat_limit(user_id: str):
    db = get_database()
    if db is None:
        return
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    limit = settings.mentor_daily_chat_limit
    doc = await db["user_rate_limits"].find_one({"user_id": user_id, "date": today_str})
    current_count = doc.get("chat_count", 0) if doc else 0
    if current_count >= limit:
        raise RateLimitExceededException(
            f"You have reached your daily chat limit of {limit} messages. Please try again tomorrow."
        )
    await db["user_rate_limits"].update_one(
        {"user_id": user_id, "date": today_str},
        {"$inc": {"chat_count": 1}},
        upsert=True
    )


class YouTubeLoadRequest(BaseModel):
    url: str
    title: Optional[str] = "Unknown Video"
    channel: Optional[str] = "Unknown Channel"
    language: Optional[str] = "en"


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    mentor_graph: MentorGraph = Depends(get_mentor_graph),
):
    """Single-turn chat with the Mentor AI system using verified auth and context service."""
    user_id = str(current_user["_id"])
    await _check_and_increment_chat_limit(user_id)
    
    logger.info(
        f"[API /mentor/chat] user_id={user_id} | session={request.session_id} | "
        f"msg='{request.message[:80]}'"
    )
    
    # Dynamically retrieve consolidated student context from MongoDB
    student_context = await StudentLearningContextService.get_student_context(user_id)
    
    response = await mentor_graph.chat(
        user_input=request.message,
        user_id=user_id,
        session_id=request.session_id,
        student_level=request.student_level or "intermediate",
        current_topic=student_context.current_active_topic_name,
        student_context=student_context.model_dump(),
    )
    
    return ChatResponse(
        answer=response.get("response", ""),
        session_id=response.get("session_id", ""),
        intent_type=response.get("intent_type", "general_chat"),
        tool_used=response.get("intent_type") if response.get("intent_type") != "general_chat" else None,
        processing_time_ms=response.get("elapsed_ms", 0),
    )



@router.post("/chat/stream")
async def stream_chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    mentor_graph: MentorGraph = Depends(get_mentor_graph),
):
    """Streaming chat returning Server-Sent Events with verified auth and context service."""
    user_id = str(current_user["_id"])
    
    # 1. Enforce rate limits check
    await _check_and_increment_chat_limit(user_id)
    
    logger.info(
        f"[API /mentor/chat/stream] user_id={user_id} | session={request.session_id} | "
        f"msg='{request.message[:80]}'"
    )
    
    try:
        # Pre-flight checks: fetch student context
        student_context = await StudentLearningContextService.get_student_context(user_id)
        
        async def event_stream():
            try:
                async for token in mentor_graph.stream_chat(
                    user_input=request.message,
                    user_id=user_id,
                    session_id=request.session_id,
                    student_level=request.student_level or "intermediate",
                    current_topic=student_context.current_active_topic_name,
                    student_context=student_context.model_dump(),
                ):
                    yield f"data: {json.dumps({'token': token})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                logger.error(f"[API /mentor/chat/stream] Streaming error inside generator: {e}", exc_info=True)
                yield f"data: {json.dumps({'error': f'Streaming interrupted: {str(e)}'})}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            },
        )
    except MentorException:
        raise
    except Exception as e:
        logger.error(f"[API /mentor/chat/stream] Pre-flight streaming setup failed: {e}. Falling back to standard chat.", exc_info=True)
        # Fallback to normal non-streaming response to prevent frozen UI
        try:
            student_context = await StudentLearningContextService.get_student_context(user_id)
            response = await mentor_graph.chat(
                user_input=request.message,
                user_id=user_id,
                session_id=request.session_id,
                student_level=request.student_level or "intermediate",
                current_topic=student_context.current_active_topic_name,
                student_context=student_context.model_dump(),
            )
            # Yield single block token as standard response
            async def fallback_stream():
                yield f"data: {json.dumps({'token': response.get('response', '')})}\n\n"
                yield f"data: {json.dumps({'done': True})}\n\n"
            
            return StreamingResponse(
                fallback_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                    "Connection": "keep-alive",
                },
            )
        except Exception as fallback_err:
            logger.error(f"[API /mentor/chat/stream] Fallback chat failed: {fallback_err}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Chat generation failed: {fallback_err}"
            )


@router.get("/history")
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    memory: MemoryManager = Depends(get_memory_manager),
):
    """Retrieve all active learning sessions for the verified student."""
    user_id = str(current_user["_id"])
    try:
        sessions = await memory.store.list_sessions(user_id)
        return [
            {
                "session_id": s.session_id,
                "user_id": s.user_id,
                "turn_count": s.turn_count(),
                "metadata": s.metadata,
                "updated_at": s.updated_at,
            }
            for s in sessions
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list sessions: {e}"
        )


@router.get("/history/{session_id}")
async def get_session_details(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    memory: MemoryManager = Depends(get_memory_manager),
):
    """Retrieve detailed message logs of a specific session for the verified student."""
    user_id = str(current_user["_id"])
    session = await memory.get_or_create_session(user_id, session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found for user."
        )
    return {
        "session_id": session.session_id,
        "turn_count": session.turn_count(),
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp,
            }
            for m in session.messages
        ],
        "metadata": session.metadata,
        "updated_at": session.updated_at,
    }


@router.delete("/history/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    memory: MemoryManager = Depends(get_memory_manager),
):
    """Clear conversation history of a specific session for the verified student."""
    user_id = str(current_user["_id"])
    try:
        await memory.store.delete(user_id, session_id)
        return {"success": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {e}"
        )


class RenameSessionRequest(BaseModel):
    title: str


@router.patch("/history/{session_id}")
async def rename_session(
    session_id: str,
    payload: RenameSessionRequest,
    current_user: dict = Depends(get_current_user),
    memory: MemoryManager = Depends(get_memory_manager),
):
    """Rename conversation history of a specific session for the verified student."""
    user_id = str(current_user["_id"])
    try:
        session = await memory.store.load(user_id, session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session '{session_id}' not found."
            )
        # Store title inside metadata
        session.metadata = session.metadata or {}
        session.metadata["title"] = payload.title
        await memory.store.save(session)
        return {
            "success": True,
            "session_id": session_id,
            "title": payload.title
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rename session: {e}"
        )




@router.post("/pdf", response_model=PDFMetadata)
async def upload_pdf(
    file: UploadFile = File(...),
    topic: str = Form("General"),
    difficulty: str = Form("intermediate"),
    current_user: dict = Depends(get_current_user),
    pdf_agent: PDFLearningAgent = Depends(get_pdf_agent),
):
    """Upload a PDF. Offloads sync file extraction to a threadpool to prevent loop blocking."""
    user_id = str(current_user["_id"])
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a PDF."
        )

    temp_fd, temp_path = tempfile.mkstemp(suffix=".pdf")
    try:
        with os.fdopen(temp_fd, "wb") as temp_file:
            content = await file.read()
            max_size = settings.mentor_max_pdf_size_mb * 1024 * 1024
            if len(content) > max_size:
                raise RateLimitExceededException(
                    f"PDF file size ({len(content) / (1024 * 1024):.2f}MB) exceeds maximum limit of {settings.mentor_max_pdf_size_mb}MB."
                )
            temp_file.write(content)
        
        # Offload sync PDF loading to async executor to prevent event loop blocking
        loop = asyncio.get_event_loop()
        metadata = await loop.run_in_executor(
            None,
            pdf_agent.load_pdf,
            temp_path,
            topic,
            difficulty,
            user_id
        )
        return metadata
    except MentorException:
        raise
    except Exception as e:
        logger.error(f"Failed to process and index PDF: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process and index PDF: {e}"
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/youtube", response_model=VideoMetadata)
async def load_youtube_video(
    request: YouTubeLoadRequest,
    current_user: dict = Depends(get_current_user),
    yt_agent: YouTubeLearningAgent = Depends(get_yt_agent),
):
    """Load a YouTube video transcript and index transcript segments."""
    try:
        metadata = await yt_agent.load_video(
            url_or_id=request.url,
            title=request.title,
            channel=request.channel,
            language=request.language
        )
        return metadata
    except Exception as e:
        logger.error(f"Failed to load YouTube video transcript: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load YouTube video transcript: {e}"
        )
