"""
Shared Gemini LLM client for Tracks AI.

All agents import from here — never initialize ChatGoogleGenerativeAI elsewhere.
Reads GOOGLE_API_KEY from the environment via app.core.config.
"""

import os
from langchain_google_genai import ChatGoogleGenerativeAI

_llm: ChatGoogleGenerativeAI | None = None


def get_llm() -> ChatGoogleGenerativeAI:
    """
    Return the shared Gemini 2.5 Flash instance (lazy singleton).
    GOOGLE_API_KEY must be set in environment / .env before calling this.
    Reads the key explicitly from app.core.config.settings so it is always
    picked up from the .env file regardless of import order.
    """
    global _llm
    if _llm is None:
        # Import here to avoid circular-import at module load time
        from app.core.config import settings

        api_key = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY", "")

        if not api_key:
            raise RuntimeError(
                "GOOGLE_API_KEY is not set. "
                "Add it to backend/.env before starting the server."
            )

        _llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0,
            google_api_key=api_key,
        )
    return _llm
