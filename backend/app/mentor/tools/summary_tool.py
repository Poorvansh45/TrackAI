import logging
from typing import Any, List, Optional, Type
from pydantic import BaseModel, Field, field_validator
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_core.tools import BaseTool

from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.tools.summary")

class SummarizeTextInput(BaseModel):
    """Validated input for SummarizeTextTool."""
    text: str = Field(description="The text to summarize")
    style: str = Field(default="brief", description="Summary style: 'brief' | 'detailed' | 'bullet_points'")
    max_length: Optional[int] = Field(default=None, ge=50, le=1000, description="Optional: maximum word count")
    focus: Optional[str] = Field(default=None, description="Optional: specific aspect to emphasize")

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 50:
            raise ValueError("Text must be at least 50 characters to summarize meaningfully")
        if len(v) > 15000:
            raise ValueError("Text exceeds 15,000 characters. Split into smaller sections first.")
        return v

    @field_validator("style")
    @classmethod
    def validate_style(cls, v: str) -> str:
        if v.lower() not in {"brief", "detailed", "bullet_points"}:
            raise ValueError(f"style must be brief/detailed/bullet_points, got {v!r}")
        return v.lower()


class SummarizeTextTool(BaseTool):
    """
    Summarizes text in configurable styles for learning and note-taking.
    """
    name: str = "summarize_text"
    description: str = (
        "Use when the student provides text to be condensed or simplified. "
        "Input: text content, style (brief/detailed/bullet_points), optional max_length and focus. "
        "Output: structured summary preserving key technical concepts."
    )
    args_schema: Type[BaseModel] = SummarizeTextInput
    mentor_llm: Optional[MentorLLM] = Field(default=None)

    model_config = {"arbitrary_types_allowed": True}

    _STYLE_INSTRUCTIONS = {
        "brief": "Write a concise 3-5 sentence paragraph capturing the main idea and key points.",
        "detailed": "Write a structured summary with clear headings for major sections. Be thorough.",
        "bullet_points": "Output ONLY bullet points. Group related points. No prose paragraphs.",
    }

    def _build_messages(
        self,
        text: str,
        style: str,
        max_length: Optional[int],
        focus: Optional[str],
    ) -> List[BaseMessage]:
        style_instruction = self._STYLE_INSTRUCTIONS[style]
        length_instruction = f"Keep the summary under {max_length} words." if max_length else ""
        focus_instruction = f"Pay special attention to: {focus}" if focus else ""

        system = (
            f"You are Mentor, an AI tutor summarizing educational content for a student.\n\n"
            f"SUMMARY STYLE: {style_instruction}\n"
            f"{length_instruction}\n"
            f"{focus_instruction}\n\n"
            f"Rules:\n"
            f"- Preserve all key technical terms exactly as written\n"
            f"- Include important numbers, formulas, or code references\n"
            f"- Do NOT add information not present in the original text\n"
            f"- Do NOT include opinions or evaluations"
        )

        return [SystemMessage(content=system), HumanMessage(content=f"Summarize this:\n\n{text}")]

    def _run(
        self,
        text: str,
        style: str = "brief",
        max_length: Optional[int] = None,
        focus: Optional[str] = None,
    ) -> str:
        if self.mentor_llm is None:
            return f"[Mock Summary] Would summarize {len(text)} chars in '{style}' style."
        try:
            messages = self._build_messages(text, style, max_length, focus)
            return self.mentor_llm.invoke(messages).content
        except Exception as e:
            logger.error(f"SummarizeTextTool._run failed: {e}")
            return f"Error summarizing text: {e}"

    async def _arun(
        self,
        text: str,
        style: str = "brief",
        max_length: Optional[int] = None,
        focus: Optional[str] = None,
    ) -> str:
        if self.mentor_llm is None:
            return f"[Mock Summary] Would summarize {len(text)} chars in '{style}' style."
        try:
            messages = self._build_messages(text, style, max_length, focus)
            response = await self.mentor_llm.ainvoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"SummarizeTextTool._arun failed: {e}")
            return f"Error summarizing text: {e}"
