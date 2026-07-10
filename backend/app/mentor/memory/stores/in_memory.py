import logging
from typing import Dict, List, Optional
from app.mentor.memory.stores.base import SessionStore
from app.mentor.schemas.memory import Session

logger = logging.getLogger("mentor.memory.stores.in_memory")

class InMemoryStore(SessionStore):
    """Simple in-memory thread-safe chat session store for testing and debugging."""

    def __init__(self) -> None:
        # Dictionary structure: {user_id: {session_id: Session}}
        self._store: Dict[str, Dict[str, Session]] = {}

    async def load(self, user_id: str, session_id: str) -> Optional[Session]:
        user_sessions = self._store.get(user_id, {})
        session = user_sessions.get(session_id)
        if session:
            logger.debug(f"Loaded session '{session_id}' for user '{user_id}' from memory.")
            # Return a copy to avoid in-place corruption outside the store
            return Session(**session.model_dump())
        logger.debug(f"Session '{session_id}' not found for user '{user_id}' in memory.")
        return None

    async def save(self, session: Session) -> None:
        user_id = session.user_id
        session_id = session.session_id
        
        if user_id not in self._store:
            self._store[user_id] = {}
            
        self._store[user_id][session_id] = Session(**session.model_dump())
        logger.debug(f"Saved session '{session_id}' for user '{user_id}' in memory.")

    async def delete(self, user_id: str, session_id: str) -> None:
        if user_id in self._store and session_id in self._store[user_id]:
            del self._store[user_id][session_id]
            logger.debug(f"Deleted session '{session_id}' for user '{user_id}' from memory.")

    async def list_sessions(self, user_id: str) -> List[Session]:
        user_sessions = self._store.get(user_id, {})
        return [Session(**s.model_dump()) for s in user_sessions.values()]

    def clear(self) -> None:
        self._store.clear()
        logger.info("Cleared all in-memory sessions.")
