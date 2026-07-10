import json
import logging
from typing import Any, List, Optional, Type
from pydantic import BaseModel, Field, field_validator
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_core.tools import BaseTool

from app.mentor.providers.base import MentorLLM
from app.mentor.schemas.quiz import QuizOutput

logger = logging.getLogger("mentor.tools.quiz")

class GenerateQuizInput(BaseModel):
    """Validated input for GenerateQuizTool."""
    topic: str = Field(description="Topic for the quiz (e.g., 'Python decorators')")
    num_questions: int = Field(default=3, ge=1, le=10, description="Number of questions (1-10)")
    difficulty: str = Field(default="intermediate", description="'beginner' | 'intermediate' | 'advanced'")

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        if v.lower() not in {"beginner", "intermediate", "advanced"}:
            raise ValueError(f"difficulty must be beginner/intermediate/advanced, got {v!r}")
        return v.lower()


class GenerateQuizTool(BaseTool):
    """
    Generates technical multiple-choice quizzes using structured outputs or fallback parsing.
    """
    name: str = "generate_quiz"
    description: str = (
        "Use when the student wants to test their knowledge. "
        "Input: topic, number of questions (1-10), difficulty (beginner/intermediate/advanced). "
        "Output: formatted quiz with questions, options, answers, and explanations."
    )
    args_schema: Type[BaseModel] = GenerateQuizInput
    mentor_llm: Optional[MentorLLM] = Field(default=None)

    model_config = {"arbitrary_types_allowed": True}

    _DIFFICULTY_GUIDANCE = {
        "beginner": "Focus on definitions and basic recall. Avoid trick questions.",
        "intermediate": "Test application of concepts. Include code reading questions.",
        "advanced": "Test synthesis and edge cases. Include performance and design questions.",
    }

    def _build_quiz_prompt(self, topic: str, num_questions: int, difficulty: str) -> str:
        guidance = self._DIFFICULTY_GUIDANCE.get(difficulty, "")
        return (
            f"Generate a {difficulty}-difficulty quiz on: {topic}\n\n"
            f"Requirements:\n"
            f"- Exactly {num_questions} multiple-choice questions\n"
            f"- Each question has exactly 4 options (A, B, C, D)\n"
            f"- Difficulty guideline: {guidance}\n"
            f"- Include a clear explanation for each correct answer\n"
            f"- Make distractors plausible but clearly wrong on reflection\n\n"
            f"Topic: {topic}"
        )

    def _run(self, topic: str, num_questions: int = 3, difficulty: str = "intermediate") -> str:
        if self.mentor_llm is None or self.mentor_llm.llm is None:
            return json.dumps({
                "topic": topic, "difficulty": difficulty,
                "questions": [{
                    "question": f"Mock question about {topic}",
                    "options": ["A: Option A", "B: Option B", "C: Option C", "D: Option D"],
                    "correct_answer": "A",
                    "explanation": "Mock explanation"
                }]
            }, indent=2)
        try:
            structured_llm = self.mentor_llm.llm.with_structured_output(QuizOutput)
            messages = [
                SystemMessage(content="You are an expert quiz generator for technical education."),
                HumanMessage(content=self._build_quiz_prompt(topic, num_questions, difficulty)),
            ]
            quiz = structured_llm.invoke(messages)
            return quiz.to_formatted_string()
        except AttributeError:
            return self._run_with_json_prompt(topic, num_questions, difficulty)
        except Exception as e:
            logger.error(f"GenerateQuizTool._run failed: {e}")
            return f"Error generating quiz on '{topic}': {e}"

    def _run_with_json_prompt(self, topic: str, num_questions: int, difficulty: str) -> str:
        """JSON prompt fallback when structured output is unavailable."""
        messages = [
            SystemMessage(content=(
                "You are an expert quiz generator. "
                "Always respond with ONLY valid JSON matching this schema:\n"
                '{"topic":"...","difficulty":"...","questions":['
                '{"question":"...","options":["A: ...","B: ...","C: ...","D: ..."],'
                '"correct_answer":"A","explanation":"..."}]}'
            )),
            HumanMessage(content=self._build_quiz_prompt(topic, num_questions, difficulty)),
        ]
        response = self.mentor_llm.invoke(messages)
        content = response.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        quiz_data = json.loads(content.strip())
        quiz = QuizOutput(**quiz_data)
        return quiz.to_formatted_string()

    async def _arun(self, topic: str, num_questions: int = 3, difficulty: str = "intermediate") -> str:
        if self.mentor_llm is None or self.mentor_llm.llm is None:
            return f"[Mock Quiz] {num_questions} questions on '{topic}' ({difficulty})"
        try:
            structured_llm = self.mentor_llm.llm.with_structured_output(QuizOutput)
            messages = [
                SystemMessage(content="You are an expert quiz generator for technical education."),
                HumanMessage(content=self._build_quiz_prompt(topic, num_questions, difficulty)),
            ]
            quiz = await structured_llm.ainvoke(messages)
            return quiz.to_formatted_string()
        except Exception as e:
            logger.error(f"GenerateQuizTool._arun failed: {e}")
            return f"Error generating quiz on '{topic}': {e}"
