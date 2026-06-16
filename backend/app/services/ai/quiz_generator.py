"""
Quiz Generator Service — Tracks AI
====================================

Generates a pool of 30–40 MCQ questions for a topic using Gemini only once.
Stores in MongoDB. Idempotent — will not regenerate if pool already exists.

Question format (per question):
{
    "id":           str (uuid4),
    "question":     str,
    "options":      [{"key": "A", "text": str}, ...],  # always 4 options
    "answer":       str,          # "A" | "B" | "C" | "D"
    "explanation":  str,
    "difficulty":   "easy" | "medium" | "hard"
}
"""

import asyncio
import json
import logging
import re
import uuid
from datetime import datetime
from typing import Optional

logger = logging.getLogger("uvicorn.error")

# Pool size bounds
POOL_MIN = 30
POOL_MAX = 40


# ─── Prompt ─────────────────────────────────────────────────────────────────

def _build_prompt(topic_name: str, skill: str) -> str:
    return f"""
You are an expert instructor building a quiz for a technical learning platform.
Topic: {topic_name}
Skill domain: {skill}

Generate exactly 35 high-quality multiple-choice questions (MCQs) for this topic.

Rules:
- Each question must be unique and cover a different aspect of the topic.
- Mix difficulty: 12 easy, 14 medium, 9 hard.
- Each question has exactly 4 options (A, B, C, D).
- Only one option is correct.
- Include a clear, educational explanation for the correct answer (1–2 sentences).
- No trick questions. Test real understanding, not trivia.
- Questions must be clear and unambiguous.
- Do not repeat concepts across questions.

Return ONLY a valid JSON object in this exact format (no markdown, no preamble):
{{
  "questions": [
    {{
      "question": "Question text here?",
      "options": [
        {{"key": "A", "text": "Option A text"}},
        {{"key": "B", "text": "Option B text"}},
        {{"key": "C", "text": "Option C text"}},
        {{"key": "D", "text": "Option D text"}}
      ],
      "answer": "B",
      "explanation": "Brief explanation of why B is correct.",
      "difficulty": "medium"
    }}
  ]
}}

Generate all 35 questions now.
""".strip()


# ─── LLM call ────────────────────────────────────────────────────────────────

def _sync_generate(prompt: str) -> str:
    """Run the LLM synchronously (called via executor)."""
    from langchain_core.messages import HumanMessage
    from app.tracks.llm.gemini import get_llm

    llm = get_llm()
    resp = llm.invoke([HumanMessage(content=prompt)])
    return resp.content if hasattr(resp, "content") else str(resp)


async def _call_llm(prompt: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync_generate, prompt)


# ─── Response parser ─────────────────────────────────────────────────────────

def _parse_questions(raw: str) -> list[dict]:
    """Extract and validate question list from LLM raw text."""
    # Strip markdown code fences if present
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    raw = raw.strip()

    try:
        data = json.loads(raw)
        questions = data.get("questions", [])
    except json.JSONDecodeError:
        # Attempt to salvage with regex extraction
        match = re.search(r'"questions"\s*:\s*(\[.*?\])', raw, re.DOTALL)
        if not match:
            raise ValueError("Could not parse questions from LLM response")
        questions = json.loads(match.group(1))

    valid = []
    for q in questions:
        if not all(k in q for k in ("question", "options", "answer", "explanation")):
            continue
        if len(q.get("options", [])) != 4:
            continue
        keys = {o["key"] for o in q["options"]}
        if keys != {"A", "B", "C", "D"}:
            continue
        if q["answer"] not in {"A", "B", "C", "D"}:
            continue

        valid.append({
            "id": str(uuid.uuid4()),
            "question": q["question"].strip(),
            "options": q["options"],
            "answer": q["answer"],
            "explanation": q.get("explanation", "").strip(),
            "difficulty": q.get("difficulty", "medium"),
        })

    return valid


# ─── Public API ──────────────────────────────────────────────────────────────

async def generate_quiz_pool(topic_id: str, topic_name: str, skill: str) -> list[dict]:
    """
    Generate a quiz question pool. Returns the list of question dicts.
    Raises on failure — caller must handle.
    """
    prompt = _build_prompt(topic_name, skill)
    logger.info("[QUIZ GEN] Generating pool for topic_id=%s", topic_id)

    raw = await _call_llm(prompt)
    questions = _parse_questions(raw)

    if len(questions) < POOL_MIN:
        raise ValueError(
            f"LLM returned only {len(questions)} valid questions (min {POOL_MIN} required)"
        )

    # Trim to max
    questions = questions[:POOL_MAX]
    logger.info("[QUIZ GEN] Generated %d questions for topic_id=%s", len(questions), topic_id)
    return questions
