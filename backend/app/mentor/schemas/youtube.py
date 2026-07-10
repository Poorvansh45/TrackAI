from typing import List, Dict, Optional
from pydantic import BaseModel, Field

class VideoMetadata(BaseModel):
    """Metadata for an indexed YouTube video."""
    video_id: str
    url: str
    title: str = "Unknown"
    channel: str = "Unknown"
    duration_secs: Optional[int] = None
    transcript_chars: int = 0
    chunk_count: int = 0
    indexed_at: str = ""
    language: str = "en"


class Flashcard(BaseModel):
    """Flashcard structure for spaced repetition review."""
    front: str = Field(description="Question side of the flashcard")
    back: str = Field(description="Answer side of the flashcard")
    topic: str = Field(description="Topic/concept this card covers")
    difficulty: str = Field(default="intermediate")


class VideoSummary(BaseModel):
    """Overview and outline of a YouTube video."""
    video_id: str
    title: str
    brief: str = Field(description="2-3 sentence overview")
    key_topics: List[str]
    timestamps: List[Dict[str, str]] = Field(description="Timestamp: topic pairs")
    total_chunks: int
