from typing import Any, Dict, List
from pydantic import BaseModel, Field

DEFAULT_RAG_SYSTEM_PROMPT = """You are Mentor, the expert AI tutor for Tracks AI platform.

Your task: Answer the student's question using ONLY the context provided below.

Rules:
1. Base your answer ENTIRELY on the provided context
2. If the context doesn't contain enough information, say so explicitly
3. Do not add information from outside the context
4. Cite the source section when possible (e.g., "According to the Python Fundamentals section...")
5. Keep answers clear, concise, and educational

Context from knowledge base:
{context}
"""

class RAGConfig(BaseModel):
    """Configuration options for the RAG query pipeline."""
    top_k: int = Field(default=4, gt=0, le=20)
    min_relevance: float = Field(default=0.3, ge=0.0, le=1.0)
    include_sources: bool = True
    system_prompt: str = DEFAULT_RAG_SYSTEM_PROMPT
    model_config = {"frozen": True}


class RAGResponse(BaseModel):
    """Standardized API response structure for RAG queries."""
    question: str
    answer: str
    sources: List[Dict[str, Any]]
    top_k_used: int
    query_time_ms: int
