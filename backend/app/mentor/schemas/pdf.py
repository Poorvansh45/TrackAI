from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field

class PDFMetadata(BaseModel):
    """Metadata representing an indexed PDF document."""
    doc_id: str
    source: str
    total_pages: int
    total_chunks: int
    topic: str
    difficulty: str
    student_id: Optional[str] = None
    loaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PDFSearchResult(BaseModel):
    """A single matched chunk and page citation for PDF queries."""
    rank: int
    text: str
    page_number: int
    section: Optional[str]
    score: float
    doc_id: str
