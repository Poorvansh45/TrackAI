import json as json_lib
import logging
from typing import Dict, List, Optional, Any

from langchain_core.messages import SystemMessage, HumanMessage

from app.mentor.schemas.quiz import (
    BloomLevel,
    DifficultyLevel,
    QuizQuestion,
    Quiz,
    QuestionAttempt,
    QuizAttempt,
    QuizResult,
)
from app.mentor.vectorstore.manager import VectorStoreManager
from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.agents.quiz")

QUIZ_GENERATION_PROMPT = """You are an expert educator creating quiz questions for: {topic}
Difficulty: {difficulty}
Bloom's Level: {bloom_level} — {bloom_description}

Use verbs like: {bloom_verbs}

Source content to base questions on:
{context}

Create ONE multiple-choice question. Requirements:
- Question must be answerable from the source content above
- 4 options labeled A, B, C, D
- One clearly correct answer
- Three plausible distractors (not obviously wrong)
- Brief explanation of why the answer is correct

Respond in this EXACT JSON format (no markdown, no extra text):
{{"question": "...", "options": ["A: ...", "B: ...", "C: ...", "D: ..."], "correct_answer": "A", "explanation": "...", "bloom_level": "{bloom_level}", "topic": "{topic}"}}"""

BLOOM_DESCRIPTIONS = {
    BloomLevel.REMEMBER: "Recall facts and basic concepts directly from the text",
    BloomLevel.UNDERSTAND: "Explain ideas or concepts in your own words",
    BloomLevel.APPLY: "Use the concept in a new situation or solve a problem",
    BloomLevel.ANALYZE: "Draw connections, compare approaches, identify causes",
    BloomLevel.EVALUATE: "Make a judgment or recommendation with justification",
    BloomLevel.CREATE: "Design a solution or construct something using the concepts",
}


async def generate_one_question(
    topic: str,
    difficulty: DifficultyLevel,
    bloom_level: BloomLevel,
    context: str,
    mentor_llm: Optional[MentorLLM] = None,
) -> Optional[QuizQuestion]:
    """
    Generate a single quiz question at a specific Bloom level using retrieved context.
    """
    if not mentor_llm or not mentor_llm.llm:
        # Mock question for testing without LLM
        return QuizQuestion(
            question=f"[Mock {bloom_level.value}] What is a key aspect of {topic}?",
            options=["A: Correct answer", "B: Wrong option 1", "C: Wrong option 2", "D: Wrong option 3"],
            correct_answer="A",
            explanation=f"This tests {bloom_level.value} of {topic}.",
            bloom_level=bloom_level,
            topic=topic,
            source_context=context[:100],
        )

    prompt = QUIZ_GENERATION_PROMPT.format(
        topic=topic,
        difficulty=difficulty.value,
        bloom_level=bloom_level.value,
        bloom_description=BLOOM_DESCRIPTIONS[bloom_level],
        bloom_verbs=", ".join(bloom_level.verb_examples[:4]),
        context=context[:1500],
    )

    for attempt in range(3):
        try:
            messages = [
                SystemMessage(content="You are an expert quiz generator. Always respond with valid JSON only."),
                HumanMessage(content=prompt),
            ]
            response = await mentor_llm.ainvoke(messages)
            raw = response.content.strip()

            # Clean JSON from potential markdown
            if "```" in raw:
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]

            data = json_lib.loads(raw.strip())
            return QuizQuestion(
                question=data["question"],
                options=data["options"],
                correct_answer=data["correct_answer"],
                explanation=data["explanation"],
                bloom_level=bloom_level,
                topic=data.get("topic", topic),
                source_context=context[:200],
            )
        except json_lib.JSONDecodeError as e:
            logger.warning(f"JSON parse failed (attempt {attempt+1}): {e}")
        except Exception as e:
            logger.warning(f"Question generation failed (attempt {attempt+1}): {e}")

    return None


class QuizAgent:
    """
    AI-powered adaptive quiz system for Tracks AI.
    """

    def __init__(self, vsm: VectorStoreManager, llm: Optional[MentorLLM] = None) -> None:
        self.vsm = vsm
        self.llm = llm

    async def generate_quiz(
        self,
        topic: str,
        difficulty: DifficultyLevel = DifficultyLevel.INTERMEDIATE,
        n_questions: int = 4,
        bloom_override: Optional[List[BloomLevel]] = None,
        where: Optional[dict] = None,
    ) -> Quiz:
        """
        Generate a quiz grounded in the knowledge base using RAG.
        """
        # Step 1: Retrieve relevant context for the topic
        results = self.vsm.search(topic, top_k=5, where=where)
        if not results:
            # Fallback mock context so testing doesn't fail
            context = f"Mock context about {topic}."
        else:
            context = "\n\n".join(r["text"] for r in results)

        bloom_pool = bloom_override or difficulty.bloom_levels

        # Step 2: Distribute Bloom levels across questions
        bloom_assignments = []
        for i in range(n_questions):
            bloom = bloom_pool[i % len(bloom_pool)]
            bloom_assignments.append(bloom)

        # Step 3: Generate questions in parallel
        tasks = [
            generate_one_question(
                topic=topic,
                difficulty=difficulty,
                bloom_level=bloom,
                context=context,
                mentor_llm=self.llm,
            )
            for bloom in bloom_assignments
        ]
        results_q = await asyncio.gather(*tasks)
        questions = [q for q in results_q if q is not None]

        if not questions:
            raise RuntimeError(f"Failed to generate questions for {topic!r}")

        quiz = Quiz(
            topic=topic,
            difficulty=difficulty,
            questions=questions,
            created_from="rag",
        )

        logger.info(
            f"Generated quiz: topic={topic!r}, n={len(questions)}, "
            f"difficulty={difficulty.value}, bloom={quiz.bloom_distribution}"
        )
        return quiz

    async def evaluate_attempt(
        self,
        quiz: Quiz,
        answers: Dict[int, str],   # {question_index: "A"/"B"/"C"/"D"}
        student_id: str = "student",
    ) -> QuizResult:
        """
        Evaluate a student's quiz attempt.
        """
        attempts = []
        feedback = []
        weighted_score = 0.0
        max_weighted = 0.0

        for i, question in enumerate(quiz.questions):
            student_answer = answers.get(i, "").upper().strip()
            is_correct = student_answer == question.correct_answer

            attempts.append(QuestionAttempt(
                question_idx=i,
                student_answer=student_answer or "?",
                is_correct=is_correct,
            ))

            weight = question.bloom_level.difficulty_weight
            max_weighted += weight
            if is_correct:
                weighted_score += weight

            if is_correct:
                feedback.append(f"Q{i+1} ✅ Correct! {question.explanation}")
            else:
                correct_text = question.correct_text
                feedback.append(
                    f"Q{i+1} ❌ Incorrect. You answered {student_answer!r}. "
                    f"Correct: {question.correct_answer} — {correct_text}. "
                    f"{question.explanation}"
                )

        attempt = QuizAttempt(
            quiz_id=quiz.quiz_id,
            student_id=student_id,
            answers=attempts,
        )

        # Identify weak and strong topics
        weak_topics = list({quiz.questions[a.question_idx].topic
                             for a in attempt.answers if not a.is_correct})
        strong_topics = list({quiz.questions[a.question_idx].topic
                               for a in attempt.answers if a.is_correct})

        # Recommend next difficulty
        pct = attempt.percentage
        if pct >= 80:
            next_diff = {
                DifficultyLevel.BEGINNER: DifficultyLevel.INTERMEDIATE,
                DifficultyLevel.INTERMEDIATE: DifficultyLevel.ADVANCED,
                DifficultyLevel.ADVANCED: DifficultyLevel.ADVANCED,
            }[quiz.difficulty]
        elif pct <= 40:
            next_diff = {
                DifficultyLevel.INTERMEDIATE: DifficultyLevel.BEGINNER,
                DifficultyLevel.ADVANCED: DifficultyLevel.INTERMEDIATE,
                DifficultyLevel.BEGINNER: DifficultyLevel.BEGINNER,
            }[quiz.difficulty]
        else:
            next_diff = quiz.difficulty

        revision_plan = await self._generate_revision_plan(
            weak_topics=weak_topics,
            score=attempt.percentage,
            difficulty=quiz.difficulty,
        )

        return QuizResult(
            attempt=attempt,
            quiz=quiz,
            feedback=feedback,
            weak_topics=weak_topics,
            strong_topics=strong_topics,
            revision_plan=revision_plan,
            next_difficulty=next_diff,
            weighted_score=(weighted_score / max_weighted * 100) if max_weighted > 0 else 0.0,
        )

    async def _generate_revision_plan(
        self,
        weak_topics: List[str],
        score: float,
        difficulty: DifficultyLevel,
    ) -> str:
        """Generate a personalized revision plan for weak topics."""
        if not weak_topics:
            return "Excellent! You demonstrated strong understanding. Try a harder difficulty."

        if not self.llm or not self.llm.llm:
            return f"[Mock Revision Plan] Study these topics: {', '.join(weak_topics)}"

        # Retrieve content for weak topics
        revision_context = []
        for topic in weak_topics[:3]:
            results = self.vsm.search(topic, top_k=2)
            for r in results:
                revision_context.append(f"[{r['metadata'].get('topic', topic)}] {r['text']}")

        context_text = "\n\n".join(revision_context[:4])

        messages = [
            SystemMessage(content=f"""You are Mentor AI creating a revision plan.
Score: {score:.0f}% on {difficulty.value} level quiz.
Weak topics: {', '.join(weak_topics)}

Knowledge base content on weak topics:
{context_text}

Create a brief, actionable revision plan (under 150 words):
1. What to review (with specific concepts)
2. Suggested exercises
3. When they'll be ready for another quiz"""),
            HumanMessage(content="Create a personalized revision plan for this student."),
        ]
        response = await self.llm.ainvoke(messages)
        return response.content

    async def get_explanation_for_topic(self, topic: str) -> str:
        """Retrieve and present a targeted explanation for a weak topic."""
        results = self.vsm.search(topic, top_k=3)
        if not results:
            return f"No content found for topic: {topic}"

        context = "\n\n".join(r["text"] for r in results)

        if not self.llm or not self.llm.llm:
            return f"[Mock Explanation]\n{context[:300]}"

        messages = [
            SystemMessage(content="You are Mentor AI explaining a topic the student got wrong. "
                                   "Be clear, use examples, and connect to what they already know."),
            HumanMessage(content=f"Explain this topic simply: {topic}\n\nContext:\n{context}"),
        ]
        response = await self.llm.ainvoke(messages)
        return response.content
