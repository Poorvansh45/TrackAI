import logging
import re
from typing import Any, Dict, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage

from app.mentor.schemas.chat import (
    IntentType,
    IntentResult,
    IntentDetectorLLMOutput,
)
from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.router.detector")

INTENT_RULES: Dict[IntentType, List[str]] = {
    IntentType.EXPLAIN_CONCEPT: [
        "what is", "what are", "what does", "explain", "define",
        "how does", "how do", "tell me about", "describe",
        "i don't understand", "i dont understand", "help me understand",
        "teach me", "clarify", "what means",
        # subtopic patterns from roadmap cards
        "explain this subtopic", "explain subtopic", "explain the subtopic",
        "explain this concept", "explain concept",
        "explain this topic", "subtopic:",
    ],
    IntentType.GENERATE_QUIZ: [
        "quiz me", "test me", "quiz on", "test my", "practice questions",
        "give me questions", "generate quiz", "create quiz", "make a quiz",
        "exam", "assessment", "mcq", "multiple choice",
    ],
    IntentType.SUMMARIZE_TEXT: [
        "summarize", "summary", "tldr", "tl;dr", "brief overview",
        "condense", "shorten", "key points", "main points",
        "give me the gist", "too long", "shorter version",
    ],
    IntentType.ROADMAP_HELP: [
        "what should i learn", "what to learn next", "what's next",
        "roadmap", "learning path", "curriculum", "next topic",
        "next step", "where should i go", "after this", "what comes after",
        "help me plan", "study next", "should i study next",
        "roadmap progress", "guide my roadmap", "should i study", "my progress", "progress?",
    ],
    IntentType.PDF_QUESTION: [
        "in the pdf", "from the document", "the paper says", "pdf", "document", "textbook", "handout",
        "chapter", "page", "notes from", "notes on", "create notes", "revision notes"
    ],
    IntentType.YOUTUBE_QUESTION: [
        "in the video", "from the video", "youtube", "the tutorial", "the lecture", "video link", "watch video",
        "from this video", "in this video", "about this video", "what does the video"
    ],
    IntentType.WEAKNESS_DIAGNOSIS: [
        "analyze my progress", "weakness", "struggling with", "where am i stuck", "progress analysis"
    ],
    IntentType.REVISION_PLAN: [
        "what should i do today", "study plan", "what to study today", "revision plan", "plan my day", "daily plan", "what should i study today",
        "plan my study day", "study day"
    ],
}

def rule_based_detect(user_input: str) -> Optional[IntentResult]:
    """
    Stage 1: Fast keyword-based intent detection.
    """
    lower = user_input.lower().strip()

    # 1. YouTube / PDF URL priority rules
    if "youtube.com" in lower or "youtu.be" in lower:
        return IntentResult(
            intent_type=IntentType.YOUTUBE_QUESTION,
            confidence=1.0,
            tool_params={"question": user_input},
            reasoning="Input contains a YouTube URL",
            detected_by="rules",
        )
    if ".pdf" in lower:
        return IntentResult(
            intent_type=IntentType.PDF_QUESTION,
            confidence=1.0,
            tool_params={"question": user_input},
            reasoning="Input references a PDF file directly",
            detected_by="rules",
        )

    # Prioritize YouTube / PDF keyword triggers
    for kw in INTENT_RULES[IntentType.PDF_QUESTION]:
        if kw in lower:
            params = _extract_params_from_text(IntentType.PDF_QUESTION, user_input)
            return IntentResult(
                intent_type=IntentType.PDF_QUESTION,
                confidence=0.85,
                tool_params=params,
                reasoning=f"Matched prioritized PDF keyword: '{kw}'",
                detected_by="rules",
            )
    for kw in INTENT_RULES[IntentType.YOUTUBE_QUESTION]:
        if kw in lower:
            params = _extract_params_from_text(IntentType.YOUTUBE_QUESTION, user_input)
            return IntentResult(
                intent_type=IntentType.YOUTUBE_QUESTION,
                confidence=0.85,
                tool_params=params,
                reasoning=f"Matched prioritized YouTube keyword: '{kw}'",
                detected_by="rules",
            )

    # 2. Quiz requests priority rules
    for kw in INTENT_RULES[IntentType.GENERATE_QUIZ]:
        if kw in lower:
            params = _extract_params_from_text(IntentType.GENERATE_QUIZ, user_input)
            return IntentResult(
                intent_type=IntentType.GENERATE_QUIZ,
                confidence=0.85,
                tool_params=params,
                reasoning=f"Matched prioritized quiz keyword: '{kw}'",
                detected_by="rules",
            )

    # 3. Revision requests / weakness diagnosis rules (placed before roadmap to catch specific daily plan/progress analysis queries)
    for kw in INTENT_RULES.get(IntentType.REVISION_PLAN, []):
        if kw in lower:
            params = _extract_params_from_text(IntentType.REVISION_PLAN, user_input)
            return IntentResult(
                intent_type=IntentType.REVISION_PLAN,
                confidence=0.85,
                tool_params=params,
                reasoning=f"Matched prioritized revision plan keyword: '{kw}'",
                detected_by="rules",
            )
    for kw in INTENT_RULES.get(IntentType.WEAKNESS_DIAGNOSIS, []):
        if kw in lower:
            params = _extract_params_from_text(IntentType.WEAKNESS_DIAGNOSIS, user_input)
            return IntentResult(
                intent_type=IntentType.WEAKNESS_DIAGNOSIS,
                confidence=0.85,
                tool_params=params,
                reasoning=f"Matched prioritized weakness diagnosis keyword: '{kw}'",
                detected_by="rules",
            )

    # 4. Roadmap questions priority rules
    for kw in INTENT_RULES[IntentType.ROADMAP_HELP]:
        if kw in lower:
            params = _extract_params_from_text(IntentType.ROADMAP_HELP, user_input)
            return IntentResult(
                intent_type=IntentType.ROADMAP_HELP,
                confidence=0.85,
                tool_params=params,
                reasoning=f"Matched prioritized roadmap keyword: '{kw}'",
                detected_by="rules",
            )

    # 5. Explain concept rules
    for kw in INTENT_RULES[IntentType.EXPLAIN_CONCEPT]:
        if kw in lower:
            params = _extract_params_from_text(IntentType.EXPLAIN_CONCEPT, user_input)
            return IntentResult(
                intent_type=IntentType.EXPLAIN_CONCEPT,
                confidence=0.85,
                tool_params=params,
                reasoning=f"Matched prioritized explain keyword: '{kw}'",
                detected_by="rules",
            )

    # 6. Summarize / general rules
    for kw in INTENT_RULES[IntentType.SUMMARIZE_TEXT]:
        if kw in lower:
            params = _extract_params_from_text(IntentType.SUMMARIZE_TEXT, user_input)
            return IntentResult(
                intent_type=IntentType.SUMMARIZE_TEXT,
                confidence=0.85,
                tool_params=params,
                reasoning=f"Matched prioritized summarize keyword: '{kw}'",
                detected_by="rules",
            )

    return None




def _extract_params_from_text(intent: IntentType, text: str) -> Dict[str, Any]:
    """Extract tool parameters from natural language text using simple heuristics."""
    params: Dict[str, Any] = {}
    lower = text.lower()

    if intent == IntentType.EXPLAIN_CONCEPT:
        # Priority 1: "Explain this subtopic: X" or "Explain concept: X" patterns
        colon_match = re.search(
            r"(?:explain\s+(?:this\s+)?(?:subtopic|concept|topic)\s*:\s*)(.+)",
            text,
            re.IGNORECASE,
        )
        if colon_match:
            params["concept"] = colon_match.group(1).strip().rstrip("?")
        else:
            # Priority 2: Standard trigger extraction
            for trigger in ["what is", "what are", "explain", "define", "how does", "how do",
                            "tell me about", "describe", "teach me about", "clarify"]:
                idx = lower.find(trigger)
                if idx != -1:
                    concept_raw = text[idx + len(trigger):].strip()
                    concept = concept_raw.split("?")[0].strip()
                    if concept:
                        params["concept"] = concept
                        break
            params.setdefault("concept", text.strip())
        params.setdefault("level", "intermediate")

    elif intent == IntentType.GENERATE_QUIZ:
        for prep in [" on ", " about ", " regarding "]:
            idx = lower.find(prep)
            if idx != -1:
                params["topic"] = text[idx + len(prep):].split("?")[0].strip()
                break
        params.setdefault("topic", text[:50])
        nums = re.findall(r" (\d+)\s*questions? ", lower)
        params["num_questions"] = int(nums[0]) if nums else 3
        for diff in ["beginner", "intermediate", "advanced"]:
            if diff in lower:
                params["difficulty"] = diff
                break
        params.setdefault("difficulty", "intermediate")

    elif intent == IntentType.SUMMARIZE_TEXT:
        params["text"] = text
        params["style"] = "bullet_points" if "bullet" in lower else "brief"

    elif intent == IntentType.ROADMAP_HELP:
        params["question"] = text
        params["roadmap_topic"] = "Python Fundamentals"
        params["student_level"] = "intermediate"

    elif intent in (IntentType.PDF_QUESTION, IntentType.YOUTUBE_QUESTION, IntentType.WEAKNESS_DIAGNOSIS, IntentType.REVISION_PLAN):
        params["question"] = text

    return params


INTENT_SYSTEM_PROMPT = """You are an intent classifier for Mentor AI, an AI tutoring system.

Classify the student's message into exactly one of these intents:

1. explain_concept  → Student wants to understand a concept
   Params: {"concept": "...", "level": "beginner|intermediate|advanced", "context": null}

2. generate_quiz    → Student wants to test their knowledge
   Params: {"topic": "...", "num_questions": 3, "difficulty": "beginner|intermediate|advanced"}

3. summarize_text   → Student provides text to be condensed
   Params: {"text": "...", "style": "brief|detailed|bullet_points"}

4. roadmap_help     → Student asks about their learning path or curriculum
   Params: {"question": "...", "roadmap_topic": "...", "student_level": "intermediate"}

5. pdf_question     → Student asks about loaded documents or PDFs
   Params: {"question": "..."}

6. youtube_question  → Student asks about a YouTube video or transcript
   Params: {"question": "..."}

7. weakness_diagnosis → Student wants to analyze progress, find weaknesses, or see where they are struggling
   Params: {"question": "..."}

8. revision_plan    → Student wants a study plan for today, daily revision plan, or daily study schedule
   Params: {"question": "..."}

9. general_chat     → Greeting, off-topic, or unclear — no tool needed
   Params: {}

RULES:
- Extract parameters from the message as accurately as possible
- If the student pastes a long text block, it's likely summarize_text
- Prioritize the most specific intent (quiz > explain if student says "quiz me and explain")
- Default level/difficulty to "intermediate" unless clearly stated
"""

async def llm_based_detect(
    user_input: str,
    mentor_llm: MentorLLM,
    chat_history: Optional[List[BaseMessage]] = None,
) -> IntentResult:
    """
    Stage 2: LLM-based intent detection with parameter extraction.
    """
    if mentor_llm is None or mentor_llm.llm is None:
        return IntentResult(
            intent_type=IntentType.GENERAL_CHAT,
            confidence=0.5,
            reasoning="LLM not available",
            detected_by="llm"
        )

    try:
        context_note = ""
        if chat_history:
            recent = chat_history[-4:]
            history_text = "\n".join(
                f"{type(m).__name__.replace('Message','')}: {m.content[:100]}"
                for m in recent
            )
            context_note = f"\n\nRecent conversation context:\n{history_text}"

        messages = [
            SystemMessage(content=INTENT_SYSTEM_PROMPT),
            HumanMessage(content=f"Classify this student message:{context_note}\n\n{user_input}"),
        ]

        try:
            structured_llm = mentor_llm.llm.with_structured_output(IntentDetectorLLMOutput, method="function_calling")
            raw: IntentDetectorLLMOutput = await structured_llm.ainvoke(messages)
        except Exception as primary_err:
            fallback_llm = getattr(mentor_llm, "_fallback_llm", None)
            if fallback_llm:
                logger.warning(f"Primary structured LLM intent detection failed: {primary_err}. Trying fallback LLM.")
                structured_fallback = fallback_llm.with_structured_output(IntentDetectorLLMOutput, method="function_calling")
                raw = await structured_fallback.ainvoke(messages)
            else:
                raise primary_err

        try:
            intent = IntentType(raw.intent_type)
        except ValueError:
            intent = IntentType.GENERAL_CHAT

        return IntentResult(
            intent_type=intent,
            confidence=raw.confidence,
            tool_params=raw.tool_params,
            reasoning=raw.reasoning,
            detected_by="llm",
        )

    except Exception as e:
        logger.warning(f"LLM intent detection failed: {e}. Defaulting to general_chat.")
        return IntentResult(
            intent_type=IntentType.GENERAL_CHAT,
            confidence=0.3,
            reasoning=f"Detection failed: {e}",
            detected_by="llm"
        )


class IntentDetector:
    """Two-stage intent detector (fast rules first, then LLM structured outputs)."""

    def __init__(
        self,
        llm: MentorLLM,
        confidence_threshold: float = 0.80,
        always_use_llm: bool = False,
    ) -> None:
        self._llm = llm
        self._threshold = confidence_threshold
        self._always_llm = always_use_llm

    async def detect(
        self,
        user_input: str,
        chat_history: Optional[List[BaseMessage]] = None,
    ) -> IntentResult:
        if not self._always_llm:
            result = rule_based_detect(user_input)
            if result and result.confidence >= self._threshold:
                logger.debug(f"Stage 1 matched: {result}")
                return result

        logger.debug("Falling through to LLM intent detection")
        result = await llm_based_detect(user_input, self._llm, chat_history)
        logger.debug(f"Stage 2 result: {result}")
        return result
