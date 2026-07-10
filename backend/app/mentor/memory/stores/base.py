from abc import ABC, abstractmethod
from typing import List, Optional
from app.mentor.schemas.memory import Session

class SessionStore(ABC):
    """Abstract Base Class for Chat Session Stores."""

    @abstractmethod
    async def load(self, user_id: str, session_id: str) -> Optional[Session]:
        """Load a session by user_id and session_id. Returns None if not found."""
        pass

    @abstractmethod
    async def save(self, session: Session) -> None:
        """Save/upsert a chat session."""
        pass

    @abstractmethod
    async def delete(self, user_id: str, session_id: str) -> None:
        """Delete a chat session."""
        pass

    @abstractmethod
    async def list_sessions(self, user_id: str) -> List[Session]:
        """List all chat sessions associated with a user."""
        pass
