class MentorException(Exception):
    """Base exception for all Tracks AI Mentor errors."""
    def __init__(self, message: str, detail: str = None) -> None:
        super().__init__(message)
        self.message = message
        self.detail = detail or message

class LLMFailureException(MentorException):
    """Raised when the LLM provider fails (e.g. API keys, connection timeouts)."""
    pass

class VectorDBFailureException(MentorException):
    """Raised when ChromaDB collection querying or modification fails."""
    pass

class MongoDatabaseFailureException(MentorException):
    """Raised when MongoDB connection or persistent document operations fail."""
    pass

class YouTubeUnavailableException(MentorException):
    """Raised when YouTube video transcripts are private, deleted, or geoblocked."""
    pass

class PDFParsingFailureException(MentorException):
    """Raised when PDF extraction or OCR fallback parsing encounters corruption or failures."""
    pass

class RateLimitExceededException(MentorException):
    """Raised when user exceeds rate limits (daily chat limit, PDF size, YouTube duration)."""
    pass
