"""
Abstract base provider - Tracks AI LLM Gateway
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Optional, Type
from pydantic import BaseModel


class BaseProvider(ABC):
    """
    Every LLM provider must implement this interface.
    The gateway calls generate() or generate_structured() — providers handle
    the actual model interaction, error wrapping, and token reporting.
    """

    provider_name: str = "base"

    @abstractmethod
    def generate(self, prompt: str, max_tokens: int = 1024) -> str:
        """Generate a plain-text response for the given prompt."""
        ...

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        max_tokens: int = 1024,
    ) -> Any:
        """Generate a response parsed into the given Pydantic schema."""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the provider is configured and reachable."""
        ...
