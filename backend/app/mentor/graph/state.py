import operator
from typing import Annotated, Any, Dict, List, Optional, TypedDict
from langchain_core.messages import BaseMessage

class MentorState(TypedDict):
    """
    Shared state flowing through every node of the Mentor Graph.
    """
    # ── Conversation ──────────────────────────────────────────
    messages: Annotated[List[BaseMessage], operator.add]
    user_id: str
    session_id: str
    user_input: str

    # ── Routing ───────────────────────────────────────────────
    intent_type: str           # Which tool to use
    intent_params: Dict[str, Any] # Parameters extracted from input

    # ── Processing ────────────────────────────────────────────
    tool_result: str           # Raw output from tool/RAG
    rag_context: str           # Retrieved chunks (for display)

    # ── Output ────────────────────────────────────────────────
    final_response: str           # Polished response to user

    # ── Student Context ───────────────────────────────────────
    student_level: str           # beginner | intermediate | advanced
    current_topic: str           # What they're currently studying
    student_context: Optional[Dict[str, Any]] # Real-time learning context dictionary

    # ── Error Handling ────────────────────────────────────────
    error: Optional[str] # Error message if a node fails
