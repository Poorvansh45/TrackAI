import logging
from enum import Enum
from typing import List, Any
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage

logger = logging.getLogger("mentor.memory.strategies")

class TrimStrategy(str, Enum):
    BUFFER = "buffer"      # Keep full history
    WINDOW = "window"      # Keep last N messages
    SUMMARY = "summary"    # Summarize older messages using an LLM


def trim_buffer(messages: List[BaseMessage]) -> List[BaseMessage]:
    """Returns the buffer unmodified (keeps all history)."""
    return messages


def trim_window(messages: List[BaseMessage], window_size: int = 10) -> List[BaseMessage]:
    """
    Returns the last `window_size` messages.
    Ensures that the history does not begin in the middle of a turn with an AIMessage.
    If the first message is an AIMessage, it is dropped to preserve context.
    """
    if len(messages) <= window_size:
        return messages

    sliced = messages[-window_size:]
    
    # Ensure context doesn't start with an AI reply (which can confuse the model)
    while sliced and isinstance(sliced[0], AIMessage):
        sliced = sliced[1:]

    return sliced


async def trim_summary(
    messages: List[BaseMessage],
    llm: Any,
    keep_recent: int = 4,
    summary_prompt: str = (
        "Progressively summarize the conversation history provided below. "
        "Focus on key technical concepts discussed, completed exercises, and student struggles. "
        "Keep the summary extremely concise, clear, and factual under 100 words."
    )
) -> List[BaseMessage]:
    """
    Summarizes older messages while keeping the most recent `keep_recent` messages intact.
    Returns: A list starting with a SystemMessage containing the summary, followed by the recent messages.
    """
    if len(messages) <= keep_recent:
        return messages

    older_messages = messages[:-keep_recent]
    recent_messages = messages[-keep_recent:]

    # Ensure context doesn't start with an AI reply
    while recent_messages and isinstance(recent_messages[0], AIMessage):
        older_messages.append(recent_messages[0])
        recent_messages = recent_messages[1:]

    if not older_messages:
        return recent_messages

    logger.info(f"Summarizing {len(older_messages)} older messages.")
    
    # Build prompt for summarization
    formatted_history = []
    for msg in older_messages:
        role = "Student" if isinstance(msg, HumanMessage) else ("Tutor" if isinstance(msg, AIMessage) else "System")
        formatted_history.append(f"{role}: {msg.content}")
    
    history_text = "\n".join(formatted_history)
    
    prompt = [
        SystemMessage(content=summary_prompt),
        HumanMessage(content=f"History to summarize:\n\n{history_text}")
    ]

    try:
        if hasattr(llm, "ainvoke"):
            summary_response = await llm.ainvoke(prompt)
        else:
            summary_response = llm.invoke(prompt)
            
        summary_text = summary_response.content
        logger.info(f"Older history summarized: {summary_text}")
        
        summary_msg = SystemMessage(
            content=f"Prior conversation summary: {summary_text}"
        )
        return [summary_msg] + recent_messages
    except Exception as e:
        logger.error(f"Failed to generate memory summary: {e}. Falling back to window trim.")
        return trim_window(messages, keep_recent)
