from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class IntentType(str, Enum):
    """All possible routing destinations."""
    EXPLAIN_CONCEPT = "explain_concept"
    GENERATE_QUIZ = "generate_quiz"
    SUMMARIZE_TEXT = "summarize_text"
    ROADMAP_HELP = "roadmap_help"
    PDF_QUESTION = "pdf_question"
    YOUTUBE_QUESTION = "youtube_question"
    WEAKNESS_DIAGNOSIS = "weakness_diagnosis"
    REVISION_PLAN = "revision_plan"
    GENERAL_CHAT = "general_chat"


class IntentResult(BaseModel):
    """Structured output of intent detection containing parameters and metadata."""
    intent_type: IntentType = Field(description="The detected user intent")
    confidence: float = Field(ge=0.0, le=1.0, description="Detection confidence (0-1)")
    tool_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Parameters extracted for the target tool"
    )
    reasoning: str = Field(
        default="",
        description="Why this intent was selected (for debugging)"
    )
    detected_by: str = Field(
        default="rules",
        description="'rules' | 'llm' — which detection stage matched"
    )

    @property
    def requires_tool(self) -> bool:
        """Returns True if this intent maps to a tool (vs direct chat)."""
        return self.intent_type != IntentType.GENERAL_CHAT

    @property
    def tool_name(self) -> Optional[str]:
        """The tool name that handles this intent, or None for general chat."""
        mapping = {
            IntentType.EXPLAIN_CONCEPT: "explain_concept",
            IntentType.GENERATE_QUIZ: "generate_quiz",
            IntentType.SUMMARIZE_TEXT: "summarize_text",
            IntentType.ROADMAP_HELP: "help_from_roadmap",
            IntentType.WEAKNESS_DIAGNOSIS: "weakness_agent",
            IntentType.REVISION_PLAN: "revision_agent",
        }
        return mapping.get(self.intent_type)


class IntentDetectorLLMOutput(BaseModel):
    """Structured output schema for LLM-based intent detection."""
    intent_type: str = Field(
        description=(
            "The detected intent. Must be exactly one of: "
            "explain_concept | generate_quiz | summarize_text | roadmap_help | "
            "pdf_question | youtube_question | weakness_diagnosis | revision_plan | general_chat"
        )
    )
    confidence: float = Field(ge=0.0, le=1.0, description="How confident you are (0.0-1.0)")
    reasoning: str = Field(description="Brief reason for this classification (1 sentence)")
    tool_params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Extracted parameters needed by the tool"
    )


class RouterResponse(BaseModel):
    """The output of one routing cycle, containing content and execution metadata."""
    content: str = Field(description="The response to show the user")
    intent_type: str = Field(description="Detected intent type")
    tool_used: Optional[str] = Field(default=None, description="Tool that was invoked, or None")
    confidence: float = Field(description="Intent detection confidence")
    detected_by: str = Field(description="Detection stage: 'rules' or 'llm'")
    processing_ms: int = Field(default=0, description="End-to-end processing time")


# API Schemas for FastAPI Request/Response
class ChatRequest(BaseModel):
    """Payload sent by the frontend for a chat message."""
    message: str = Field(description="The student's raw message text")
    # user_id is extracted from the JWT auth token by the endpoint (current_user['_id']).
    # It is accepted here for compatibility but NEVER required — the endpoint ignores it.
    user_id: Optional[str] = Field(default=None, description="Ignored — resolved from JWT auth")
    session_id: Optional[str] = Field(default=None, description="Current chat session ID")
    student_level: Optional[str] = Field(default="intermediate", description="Current student level")
    current_topic: Optional[str] = Field(default=None, description="Current roadmap topic the student is on")
    completed_topics: Optional[List[str]] = Field(default=None, description="List of completed topics")


class ChatResponse(BaseModel):
    """Payload returned by the API for a standard chat query."""
    session_id: str = Field(description="The chat session ID")
    answer: str = Field(description="Response message content")
    intent_type: str = Field(description="Detected user intent classification")
    tool_used: Optional[str] = Field(default=None, description="Tool used, if any")
    processing_time_ms: int = Field(description="Server processing time in ms")


class StreamEvent(BaseModel):
    """Represents a chunk in Server-Sent Events (SSE)."""
    event: str = Field(description="'token' | 'intent' | 'done' | 'error'")
    data: str = Field(description="Data content payload (e.g. token text, or json string)")
