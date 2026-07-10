from enum import Enum
from typing import List, Dict, Any, Optional
import uuid
import time
from pydantic import BaseModel, Field, field_validator

class BloomLevel(str, Enum):
    """Bloom's Taxonomy cognitive levels."""
    REMEMBER = "remember"      # Recall facts
    UNDERSTAND = "understand"  # Explain concepts
    APPLY = "apply"            # Use in new situations
    ANALYZE = "analyze"        # Break into parts
    EVALUATE = "evaluate"      # Make judgments
    CREATE = "create"          # Build something new

    @property
    def difficulty_weight(self) -> float:
        """Higher levels are harder — used for scoring."""
        weights = {
            "remember": 1.0, "understand": 1.5, "apply": 2.0,
            "analyze": 2.5, "evaluate": 3.0, "create": 3.5,
        }
        return weights[self.value]

    @property
    def verb_examples(self) -> List[str]:
        """Action verbs used in questions at this level."""
        verbs = {
            "remember": ["define", "list", "recall", "state", "identify"],
            "understand": ["explain", "describe", "summarize", "interpret"],
            "apply": ["use", "calculate", "demonstrate", "solve", "apply"],
            "analyze": ["compare", "differentiate", "examine", "break down"],
            "evaluate": ["justify", "critique", "assess", "recommend"],
            "create": ["design", "construct", "formulate", "develop"],
        }
        return verbs[self.value]


class DifficultyLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

    @property
    def bloom_levels(self) -> List[BloomLevel]:
        """Which Bloom levels map to this difficulty."""
        mapping = {
            "beginner": [BloomLevel.REMEMBER, BloomLevel.UNDERSTAND],
            "intermediate": [BloomLevel.UNDERSTAND, BloomLevel.APPLY, BloomLevel.ANALYZE],
            "advanced": [BloomLevel.ANALYZE, BloomLevel.EVALUATE, BloomLevel.CREATE],
        }
        return mapping[self.value]


class QuizQuestion(BaseModel):
    """A single validated quiz question."""
    question: str = Field(description="The question text")
    options: List[str] = Field(description="4 answer options labeled A, B, C, D")
    correct_answer: str = Field(description="The correct option: 'A', 'B', 'C', or 'D'")
    explanation: str = Field(description="Why the correct answer is right")
    bloom_level: BloomLevel = Field(description="Bloom's taxonomy level")
    topic: str = Field(description="Specific topic this question tests")
    source_context: str = Field(default="", description="Source chunk used to generate")

    @field_validator("correct_answer")
    @classmethod
    def validate_answer(cls, v: str) -> str:
        v = v.upper().strip()
        if v not in {"A", "B", "C", "D"}:
            raise ValueError(f"correct_answer must be A/B/C/D, got {v!r}")
        return v

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: List[str]) -> List[str]:
        if len(v) != 4:
            raise ValueError(f"Must have exactly 4 options, got {len(v)}")
        return v

    @property
    def correct_text(self) -> str:
        """Return the text of the correct option."""
        idx = ord(self.correct_answer) - ord("A")
        return self.options[idx] if idx < len(self.options) else ""


class Quiz(BaseModel):
    """A complete quiz with multiple questions."""
    quiz_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    topic: str
    difficulty: DifficultyLevel
    questions: List[QuizQuestion]
    created_from: str = "rag"  # "rag" | "topic" | "adaptive"

    @property
    def question_count(self) -> int:
        return len(self.questions)

    @property
    def bloom_distribution(self) -> Dict[str, int]:
        dist = {}
        for q in self.questions:
            dist[q.bloom_level.value] = dist.get(q.bloom_level.value, 0) + 1
        return dist

    def format_for_display(self) -> str:
        lines = [
            f"QUIZ: {self.topic} ({self.difficulty.value.title()})",
            f"Questions: {self.question_count}",
            "=" * 50
        ]
        for i, q in enumerate(self.questions, 1):
            lines.append(f"\nQ{i}. [{q.bloom_level.value.upper()}] {q.question}")
            for opt in q.options:
                lines.append(f"   {opt}")
        return "\n".join(lines)


class QuestionAttempt(BaseModel):
    """Student's answer to one question."""
    question_idx: int
    student_answer: str  # A/B/C/D
    is_correct: bool
    time_taken_sec: Optional[int] = None

    @field_validator("student_answer")
    @classmethod
    def validate_answer(cls, v: str) -> str:
        return v.upper().strip()


class QuizAttempt(BaseModel):
    """A student's complete quiz attempt with all answers."""
    quiz_id: str
    student_id: str
    answers: List[QuestionAttempt]
    started_at: str = Field(default_factory=lambda: str(time.time()))

    @property
    def score(self) -> int:
        return sum(1 for a in self.answers if a.is_correct)

    @property
    def total(self) -> int:
        return len(self.answers)

    @property
    def percentage(self) -> float:
        return (self.score / self.total * 100) if self.total > 0 else 0.0

    @property
    def wrong_indices(self) -> List[int]:
        return [a.question_idx for a in self.answers if not a.is_correct]


class QuizOutput(BaseModel):
    """Complete quiz output — serializable for MongoDB and frontend (for the GenerateQuizTool)."""
    topic: str = Field(description="The quiz topic")
    difficulty: str = Field(description="Quiz difficulty level")
    questions: List[QuizQuestion] = Field(description="List of quiz questions")

    def to_formatted_string(self) -> str:
        """Format quiz as readable text for display."""
        lines = [
            f"QUIZ: {self.topic}",
            f"Difficulty: {self.difficulty.title()}",
            f"Questions: {len(self.questions)}",
            "=" * 50,
        ]
        for i, q in enumerate(self.questions, 1):
            lines.append(f"\nQ{i}. {q.question}")
            for opt in q.options:
                lines.append(f"  {opt}")
            lines.append(f"\nAnswer: {q.correct_answer}")
            lines.append(f"Explanation: {q.explanation}")
        return "\n".join(lines)


class QuizResult(BaseModel):
    """Full evaluated result with feedback and weak areas."""
    attempt: QuizAttempt
    quiz: Quiz
    feedback: List[str]          # Per-question feedback
    weak_topics: List[str]       # Topics with wrong answers
    strong_topics: List[str]     # Topics with correct answers
    revision_plan: str           # What to study next
    next_difficulty: DifficultyLevel
    weighted_score: float        # Bloom-weighted score

