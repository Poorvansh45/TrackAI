"""
Shared Gemini LLM client.

All agents must import and reuse this singleton.
Do NOT initialize ChatGoogleGenerativeAI anywhere else.
"""

from langchain_google_genai import ChatGoogleGenerativeAI

_llm: ChatGoogleGenerativeAI | None = None


def get_llm() -> ChatGoogleGenerativeAI:
    """
    Return the shared Gemini LLM instance.

    Creates the client on first call and reuses it on all subsequent calls.
    Reads GOOGLE_API_KEY from the environment (loaded via python-dotenv in main).
    """
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0,
        )
    return _llm
