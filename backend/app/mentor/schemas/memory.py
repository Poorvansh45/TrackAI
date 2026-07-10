from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import uuid
from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage

class ChatMessage(BaseModel):
    """Schema representing a single message in a session."""
    role: str = Field(description="Role: 'human', 'ai', or 'system'")
    content: str = Field(description="Message content text")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_base_message(self) -> BaseMessage:
        """Convert to LangChain message abstraction."""
        if self.role == "human":
            return HumanMessage(content=self.content)
        elif self.role == "ai":
            return AIMessage(content=self.content)
        elif self.role == "system":
            return SystemMessage(content=self.content)
        else:
            raise ValueError(f"Unknown message role: {self.role}")

    @classmethod
    def from_base_message(cls, msg: BaseMessage) -> "ChatMessage":
        """Convert from LangChain message abstraction."""
        if isinstance(msg, HumanMessage):
            role = "human"
        elif isinstance(msg, AIMessage):
            role = "ai"
        elif isinstance(msg, SystemMessage):
            role = "system"
        else:
            role = "human" # default fallback
        
        return cls(role=role, content=msg.content)


class Session(BaseModel):
    """Schema representing a persistent user chat session."""
    user_id: str = Field(description="Identifies the student")
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique session ID")
    messages: List[ChatMessage] = Field(default_factory=list, description="Ordered conversation history")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Session state metadata (e.g., current topic)")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def memory_key(self) -> str:
        """Return memory key identifier."""
        return f"{self.user_id}:{self.session_id}"

    def get_messages_as_base(self) -> List[BaseMessage]:
        """Returns LangChain message objects."""
        return [m.to_base_message() for m in self.messages]

    def add_human_message(self, content: str) -> None:
        self.messages.append(ChatMessage(role="human", content=content))
        self.updated_at = datetime.now(timezone.utc)

    def add_ai_message(self, content: str) -> None:
        self.messages.append(ChatMessage(role="ai", content=content))
        self.updated_at = datetime.now(timezone.utc)

    def add_system_message(self, content: str) -> None:
        self.messages.append(ChatMessage(role="system", content=content))
        self.updated_at = datetime.now(timezone.utc)

    def turn_count(self) -> int:
        """Counts how many complete turns have been completed (defined by human inputs)."""
        return sum(1 for m in self.messages if m.role == "human")

    def to_mongo_dict(self) -> Dict[str, Any]:
        """Format for saving to MongoDB (requires datetime mapping)."""
        data = self.model_dump()
        # Convert created_at and updated_at to datetime objects if serialized
        return data

    @classmethod
    def from_mongo_dict(cls, doc: Dict[str, Any]) -> "Session":
        """Reconstruct Session from MongoDB document."""
        # Clean mongo system ids
        doc.pop("_id", None)
        return cls(**doc)
