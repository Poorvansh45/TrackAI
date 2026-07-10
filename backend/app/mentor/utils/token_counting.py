import logging
from typing import List, Union
import tiktoken
from langchain_core.messages import BaseMessage

logger = logging.getLogger("mentor.utils.token_counting")

def count_tokens_in_text(text: str, model: str = "gpt-4o-mini") -> int:
    """Returns the number of tokens in a text string."""
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        logger.warning(f"Model '{model}' not found in tiktoken. Defaulting to cl100k_base.")
        encoding = tiktoken.get_encoding("cl100k_base")
    
    return len(encoding.encode(text))

def count_tokens_in_messages(messages: List[BaseMessage], model: str = "gpt-4o-mini") -> int:
    """
    Returns the number of tokens used by a list of LangChain messages.
    Adapted from OpenAI's token counting guidelines.
    """
    try:
        encoding = tiktoken.encoding_for_model(model)
    except KeyError:
        encoding = tiktoken.get_encoding("cl100k_base")

    # Mapping based on typical chat model overheads
    if "gpt-4" in model or "gpt-3.5" in model:
        tokens_per_message = 3
        tokens_per_name = 1
    else:
        tokens_per_message = 3
        tokens_per_name = 1

    num_tokens = 0
    for message in messages:
        num_tokens += tokens_per_message
        num_tokens += len(encoding.encode(message.content))
        # Add role tokens
        num_tokens += len(encoding.encode(message.type))
        # If there's an explicit name field
        if hasattr(message, "name") and message.name is not None:
            num_tokens += tokens_per_name
            num_tokens += len(encoding.encode(message.name))

    num_tokens += 3  # every reply is primed with <|start|>assistant<|message|>
    return num_tokens
