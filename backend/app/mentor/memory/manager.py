import logging
from typing import Dict, Any, List, Optional
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage

from app.mentor.memory.stores.base import SessionStore
from app.mentor.memory.stores.in_memory import InMemoryStore
from app.mentor.memory.strategies import TrimStrategy, trim_buffer, trim_window, trim_summary
from app.mentor.schemas.memory import ChatMessage, Session

logger = logging.getLogger("mentor.memory.manager")

class MemoryManager:
    """
    Coordinates session stores, loads/saves sessions, builds trimmed message
    histories, and persists turns.
    """

    def __init__(
        self,
        store: Optional[SessionStore] = None,
        strategy: TrimStrategy = TrimStrategy.WINDOW,
        window_size: int = 10,
        llm: Optional[Any] = None
    ) -> None:
        self.store = store or InMemoryStore()
        if isinstance(strategy, str):
            try:
                self.strategy = TrimStrategy(strategy)
            except ValueError:
                self.strategy = TrimStrategy.WINDOW
        else:
            self.strategy = strategy
        self.window_size = window_size
        self.llm = llm
        strategy_val = self.strategy.value if hasattr(self.strategy, "value") else self.strategy
        logger.info(f"Initialized MemoryManager | strategy={strategy_val} | window_size={self.window_size}")

    async def get_or_create_session(
        self,
        user_id: str,
        session_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Session:
        """Loads a session if it exists, otherwise creates a new one."""
        session = None
        if session_id:
            session = await self.store.load(user_id, session_id)
        
        if session is None:
            session = Session(
                user_id=user_id,
                session_id=session_id or Session().session_id,
                metadata=metadata or {}
            )
            await self.store.save(session)
            logger.info(f"Created new session '{session.session_id}' for user '{user_id}'.")
        else:
            logger.info(f"Retrieved existing session '{session.session_id}' for user '{user_id}'.")
            
        return session

    async def save_session(self, session: Session) -> None:
        """Saves session state directly to the configured store."""
        await self.store.save(session)

    async def persist_turn(self, session: Session, human_message: str, ai_response: str) -> None:
        """Appends a complete human-AI turn to history and saves to store."""
        session.add_human_message(human_message)
        session.add_ai_message(ai_response)
        await self.store.save(session)
        logger.debug(f"Persisted chat turn for session '{session.session_id}'. Turn count={session.turn_count()}")

    async def build_context_messages(
        self,
        session: Session,
        system_prompt: Optional[str] = None,
        new_input: Optional[str] = None
    ) -> List[BaseMessage]:
        """
        Builds the complete message history for the LLM.
        Applies the configured trimming strategy to older messages.
        """
        base_history = session.get_messages_as_base()

        # Apply trimming strategy
        if self.strategy == TrimStrategy.BUFFER:
            trimmed = trim_buffer(base_history)
        elif self.strategy == TrimStrategy.WINDOW:
            trimmed = trim_window(base_history, self.window_size)
        elif self.strategy == TrimStrategy.SUMMARY:
            # Drop the system summary from the count
            trimmed = await trim_summary(base_history, self.llm, keep_recent=self.window_size)
        else:
            trimmed = trim_window(base_history, self.window_size)

        final_messages: List[BaseMessage] = []
        
        # Insert system prompt at the beginning
        if system_prompt:
            final_messages.append(SystemMessage(content=system_prompt))
            
        # Append trimmed history
        final_messages.extend(trimmed)
        
        # Append the new human message if supplied
        if new_input:
            final_messages.append(HumanMessage(content=new_input))

        return final_messages
