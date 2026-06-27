"""
Groq Provider - Tracks AI LLM Gateway
Uses langchain_groq. Acts as both primary (for Groq-routed tasks)
and fallback (when Gemini fails).
"""
from __future__ import annotations

import logging
import os
from typing import Any, Type

from pydantic import BaseModel
from app.core.llm.providers.base import BaseProvider

logger = logging.getLogger("uvicorn.error")


class GroqProvider(BaseProvider):
    provider_name = "groq"

    def __init__(self, model: str, max_tokens: int = 2048) -> None:
        self.model = model
        self.max_tokens = max_tokens
        self._client = None
        self._available = False
        self._init()

    def _init(self) -> None:
        try:
            from langchain_groq import ChatGroq
            from app.core.config import settings

            api_key = settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")
            if not api_key:
                logger.warning("[GroqProvider] GROQ_API_KEY not set — provider unavailable")
                return

            self._client = ChatGroq(
                model=self.model,
                temperature=0,
                groq_api_key=api_key,
                max_tokens=self.max_tokens,
            )
            self._available = True
            logger.info("[GroqProvider] Initialized: %s (max_tokens=%d)", self.model, self.max_tokens)
        except Exception as exc:
            logger.warning("[GroqProvider] Init failed: %s", exc)

    def is_available(self) -> bool:
        return self._available

    def generate(self, prompt: str, max_tokens: int = 1024) -> str:
        from langchain_core.messages import HumanMessage
        resp = self._client.invoke([HumanMessage(content=prompt)])
        return resp.content if hasattr(resp, "content") else str(resp)

    def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        max_tokens: int = 1024,
    ) -> Any:
        structured = self._client.with_structured_output(schema)
        return structured.invoke(prompt)
