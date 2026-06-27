"""
Quiz Generator Service — Tracks AI
====================================

Generates a pool of 15–40 MCQ questions for a topic via the LLM Gateway.
Routed to Groq (llama-3.1-8b-instant) — NOT Gemini — preserving Gemini
quota for high-quality roadmap/assessment generation.

Explanations are NOT included in batch generation — they are generated
on-demand only when a user answers incorrectly (saves ~40% of tokens).

Question format (per question):
{
    "id":           str (uuid4),
    "question":     str,
    "options":      [{"key": "A", "text": str}, ...],  # always 4 options
    "answer":       str,          # "A" | "B" | "C" | "D"
    "explanation":  str,          # empty string until answered incorrectly
    "difficulty":   "easy" | "medium" | "hard"
}"""

import asyncio
import json
import logging
import re
import uuid
from datetime import datetime
from typing import Optional

logger = logging.getLogger("uvicorn.error")

# Pool size bounds
POOL_MIN = 15
POOL_MAX = 40

# Each LLM call asks for this many questions. Small enough to comfortably
# fit under typical output-token ceilings even with explanations included.
BATCH_SIZE = 10

# Upper bound on how many batches we'll attempt before giving up — generous
# enough to absorb a couple of malformed/short batches and still reach
# POOL_MIN, without looping indefinitely on a systemically broken provider.
MAX_BATCH_ATTEMPTS = 6

# Output-token ceiling. NOT applied here — see _sync_generate() and
# app/tracks/llm/gemini.py (DEFAULT_MAX_OUTPUT_TOKENS), where each provider's
# correctly-named field is set at construction time. Kept here only as
# documentation of the value this module was designed around (a single
# BATCH_SIZE-question response needs roughly 1,200-1,800 tokens in practice).
MAX_OUTPUT_TOKENS = 3072


# ─── Prompt ─────────────────────────────────────────────────────────────────

_DIFFICULTY_CYCLE = ["easy", "easy", "medium", "medium", "medium", "hard"]


def _difficulty_mix_for_batch(batch_index: int, batch_size: int) -> str:
    """Produce a short, human-readable difficulty instruction for this batch,
    rotating through the cycle so the merged pool ends up with a similar
    easy/medium/hard ratio to the original single-shot prompt."""
    counts = {"easy": 0, "medium": 0, "hard": 0}
    for i in range(batch_size):
        level = _DIFFICULTY_CYCLE[(batch_index * batch_size + i) % len(_DIFFICULTY_CYCLE)]
        counts[level] += 1
    return f"{counts['easy']} easy, {counts['medium']} medium, {counts['hard']} hard"


def _build_batch_prompt(topic_name: str, skill: str, count: int, difficulty_mix: str, existing_questions: list[dict] = None) -> str:
    """
    Build a single-batch prompt. Deliberately short and strict — fewer
    instructions and a smaller requested count both reduce the model's odds
    of drifting into markdown fences, commentary, or mid-generation
    truncation. The required JSON shape is given as a single compact example
    rather than an indented multi-line block, keeping the few-shot pattern
    close to what the model is expected to emit and reducing the chance it
    copies extraneous formatting (like trailing commas) from a prettified
    example.
    """
    prompt = (
        f'Generate exactly {count} multiple-choice quiz questions about '
        f'"{topic_name}" ({skill}).\n\n'
        f"Difficulty mix: {difficulty_mix}\n"
        "Each question needs exactly 4 options (A-D), one correct answer, "
        "and a 1-sentence explanation. Questions must be unique, clear, and "
        "test real understanding — no trick questions.\n\n"
    )
    if existing_questions:
        titles = [q["question"].strip() for q in existing_questions if "question" in q]
        if titles:
            prompt += "CRITICAL: Do NOT generate questions that are identical or very similar to any of these existing questions:\n"
            for t in titles:
                prompt += f"- {t}\n"
            prompt += "\n"

    prompt += (
        "Respond with ONLY raw JSON. No markdown fences, no commentary, "
        "nothing before or after it. Exact shape:\n"
        '{"questions":[{"question":"...","options":['
        '{"key":"A","text":"..."},{"key":"B","text":"..."},'
        '{"key":"C","text":"..."},{"key":"D","text":"..."}],'
        '"answer":"A","explanation":"...","difficulty":"medium"}]}'
    )
    return prompt


# ─── LLM call ────────────────────────────────────────────────────────────────────────────────

async def _call_llm(prompt: str) -> str:
    """
    Async gateway call — routes to Groq (QUIZ_GENERATION task).
    Awaits the gateway directly: no executors, no sync wrappers.
    """
    import asyncio as _asyncio
    from app.core.ai_service import ai_service, Task
    await _asyncio.sleep(1.0)  # inter-batch pacing to stay under Groq 30 RPM limit
    return await ai_service.generate(task=Task.QUIZ_GENERATION, prompt=prompt, use_cache=False)


# ─── Response parser ─────────────────────────────────────────────────────────

def _strip_code_fences(raw: str) -> str:
    """Remove ```json / ``` fences (with or without a trailing newline) and
    any leading/trailing prose outside the fence, if a fence is present."""
    fence_match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL | re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()
    # No fences — still strip stray ``` markers that sometimes appear alone
    return re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).strip()


def _extract_json_object_span(raw: str) -> Optional[str]:
    """
    Find the substring spanning the first '{' to its matching closing '}',
    using brace-depth counting (string/escape aware) rather than a greedy
    regex. This survives extra prose before/after the JSON object and is
    far more reliable than a regex when the payload is large.
    """
    start = raw.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(raw)):
        ch = raw[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return raw[start : i + 1]
    return None  # unbalanced — likely truncated mid-generation


def _remove_trailing_commas(text: str) -> str:
    """Remove trailing commas before a closing ] or } — a very common
    artifact when an LLM emits a list/object and over-includes the comma
    from its own formatting template on the final element."""
    return re.sub(r",(\s*[\]}])", r"\1", text)


def _salvage_truncated_array(raw: str) -> Optional[str]:
    """
    Last-resort recovery for a response that was genuinely cut off
    mid-generation — no balanced closing bracket exists anywhere in the
    text, so _extract_questions_array_span() returns None too. Rather than
    discarding the whole batch, this walks the "questions": [ ... array of
    objects, finds the last *complete* object (balanced braces, not inside
    a string) before the truncation point, and closes the array there.
    This recovers every fully-formed question generated before the cutoff
    and discards only the partial one at the very end.

    Returns a valid JSON array string of complete question objects, or None
    if not even one complete object could be recovered.
    """
    key_match = re.search(r'"questions"\s*:\s*\[', raw)
    if not key_match:
        return None

    pos = key_match.end()  # just after the '['
    depth = 0
    in_string = False
    escape = False
    last_complete_end: Optional[int] = None
    obj_start: Optional[int] = None

    i = pos
    while i < len(raw):
        ch = raw[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            i += 1
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and obj_start is not None:
                last_complete_end = i + 1  # one past the closing '}'
                obj_start = None
        i += 1

    if last_complete_end is None:
        return None

    salvaged = raw[pos:last_complete_end].rstrip()
    salvaged = salvaged.rstrip(",")  # trailing comma before our manual close
    return f"[{salvaged}]"


def _extract_questions_array_span(raw: str) -> Optional[str]:
    """
    Fallback for when the *outer* object is unrecoverable (e.g. truncated
    before its closing brace) but the "questions": [ ... ] array itself is
    intact. Uses bracket-depth counting for the same reason
    _extract_json_object_span does — survives malformed text elsewhere in
    the payload as long as the array itself is well-formed.
    """
    key_match = re.search(r'"questions"\s*:\s*\[', raw)
    if not key_match:
        return None

    start = key_match.end() - 1  # position of the '['
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(raw)):
        ch = raw[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return raw[start : i + 1]
    return None


def _try_parse(label: str, text: str) -> Optional[list]:
    """Attempt json.loads on `text`, returning a questions list on success
    or None on any failure. Never raises — every recovery strategy in the
    chain below relies on this being a safe, non-throwing probe."""
    if not text:
        return None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        logger.info("[QUIZ GEN] Parser strategy '%s' failed: %s", label, exc)
        return None

    if isinstance(parsed, list):
        logger.info("[QUIZ GEN] Parser strategy '%s' succeeded (bare array)", label)
        return parsed
    if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
        logger.info("[QUIZ GEN] Parser strategy '%s' succeeded (object.questions)", label)
        return parsed["questions"]
    logger.info("[QUIZ GEN] Parser strategy '%s' produced unexpected shape: %s", label, type(parsed))
    return None


def _parse_questions(raw: str) -> list[dict]:
    """
    Extract and validate question list from LLM raw text.

    The LLM occasionally returns text that is not strictly valid JSON —
    wrapped in markdown fences, preceded/followed by prose, containing a
    trailing comma, or (rarely) truncated mid-array on very long
    generations. Rather than crashing on the first json.loads() failure,
    this runs a chain of increasingly aggressive recovery strategies and
    only gives up once all of them have failed.

    Raises ValueError if no strategy yields a parseable questions list.
    Schema validation of each individual question is unchanged and still
    strictly enforced after extraction.
    """
    logger.info("[QUIZ GEN] Raw LLM response length=%d chars", len(raw))
    logger.info("[QUIZ GEN] Raw LLM response preview: %r", raw[:500])

    cleaned = _strip_code_fences(raw)

    questions = None

    # Strategy 1: direct parse of the fence-stripped text
    questions = _try_parse("direct", cleaned)

    # Strategy 2: direct parse with trailing commas removed
    if questions is None:
        questions = _try_parse("direct_no_trailing_commas", _remove_trailing_commas(cleaned))

    # Strategy 3: brace-depth extraction of the outer {...} object
    if questions is None:
        obj_span = _extract_json_object_span(cleaned)
        if obj_span is None:
            logger.info("[QUIZ GEN] Parser strategy 'object_span' skipped: no balanced object found")
        questions = _try_parse("object_span", obj_span)
        if questions is None and obj_span:
            questions = _try_parse("object_span_no_trailing_commas", _remove_trailing_commas(obj_span))

    # Strategy 4: bracket-depth extraction of just the "questions": [...] array
    # (recovers cases where the outer object is truncated/unbalanced but the
    # array itself closed correctly before the cutoff)
    if questions is None:
        arr_span = _extract_questions_array_span(cleaned)
        if arr_span is None:
            logger.info("[QUIZ GEN] Parser strategy 'array_span' skipped: no balanced array found")
        questions = _try_parse("array_span", arr_span)
        if questions is None and arr_span:
            questions = _try_parse("array_span_no_trailing_commas", _remove_trailing_commas(arr_span))

    # Strategy 5: truncation salvage — the array itself never closed (a
    # genuine mid-generation cutoff), but a prefix of complete question
    # objects can still be recovered and used instead of failing outright.
    if questions is None:
        salvaged = _salvage_truncated_array(cleaned)
        if salvaged is None:
            logger.info("[QUIZ GEN] Parser strategy 'truncation_salvage' skipped: no complete object recovered")
        questions = _try_parse("truncation_salvage", salvaged)

    if questions is None:
        raise ValueError(
            "Could not parse questions from LLM response after all recovery attempts "
            f"(raw_length={len(raw)})"
        )

    valid = _validate_questions(questions)

    logger.info(
        "[QUIZ GEN] Extracted %d raw question objects, %d passed schema validation",
        len(questions), len(valid),
    )

    return valid


def _validate_questions(questions: list) -> list[dict]:
    """
    Strictly validate each question dict against the required schema.
    Explanation field is optional — empty string is fine (generated on demand).
    """
    valid = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        # explanation is now optional — only question/options/answer required
        if not all(k in q for k in ("question", "options", "answer")):
            continue
        if len(q.get("options", [])) != 4:
            continue
        keys = {o.get("key") for o in q["options"] if isinstance(o, dict)}
        if keys != {"A", "B", "C", "D"}:
            continue
        if q["answer"] not in {"A", "B", "C", "D"}:
            continue

        valid.append({
            "id": str(uuid.uuid4()),
            "question": q["question"].strip(),
            "options": q["options"],
            "answer": q["answer"],
            "explanation": q.get("explanation", "").strip(),  # empty until answered wrong
            "difficulty": q.get("difficulty", "medium"),
        })

    return valid


# ─── Public API ──────────────────────────────────────────────────────────────

async def generate_quiz_pool(topic_id: str, topic_name: str, skill: str) -> list[dict]:
    """
    Generate a quiz question pool by issuing multiple small batched LLM
    calls (BATCH_SIZE questions each) instead of one large 35-question
    request, merging validated questions from each batch until POOL_MIN is
    reached or MAX_BATCH_ATTEMPTS is exhausted.

    Returns the merged list of question dicts in the exact same shape as
    before (id/question/options/answer/explanation/difficulty) — callers
    (app/api/v1/quiz.py) are unaffected by the internal batching.

    Raises ValueError on failure — caught by _generate_and_store(), which
    persists status=FAILED, error, and error_type (unchanged by this module).
    """
    logger.info("[QUIZ GEN] Generating pool for topic_id=%s via batched generation", topic_id)

    pool: list[dict] = []
    seen_question_text: set[str] = set()
    batch_index = 0
    batch_failures = 0

    while len(pool) < POOL_MAX and batch_index < MAX_BATCH_ATTEMPTS:
        remaining_needed = POOL_MAX - len(pool)
        count = min(BATCH_SIZE, remaining_needed)
        difficulty_mix = _difficulty_mix_for_batch(batch_index, count)

        prompt = _build_batch_prompt(topic_name, skill, count, difficulty_mix, existing_questions=pool)
        logger.info(
            "[QUIZ GEN] Batch %d/%d: requesting %d questions for topic_id=%s",
            batch_index + 1, MAX_BATCH_ATTEMPTS, count, topic_id,
        )

        try:
            raw = await _call_llm(prompt)
            batch_questions = _parse_questions(raw)
        except ValueError as exc:
            batch_failures += 1
            logger.warning(
                "[QUIZ GEN] Batch %d failed to parse for topic_id=%s: %s",
                batch_index + 1, topic_id, exc,
            )
            batch_index += 1
            continue

        # Merge, de-duplicating on normalized question text so retried/
        # overlapping batches don't inflate the pool with near-duplicates.
        added = 0
        for q in batch_questions:
            norm = q["question"].strip().lower()
            if norm in seen_question_text:
                continue
            seen_question_text.add(norm)
            pool.append(q)
            added += 1

        logger.info(
            "[QUIZ GEN] Batch %d/%d: %d valid, %d new after de-dup (pool size now %d) for topic_id=%s",
            batch_index + 1, MAX_BATCH_ATTEMPTS, len(batch_questions), added, len(pool), topic_id,
        )

        batch_index += 1

    if len(pool) < POOL_MIN:
        raise ValueError(
            f"LLM returned only {len(pool)} valid questions after {batch_index} batches "
            f"({batch_failures} batch parse failures) — minimum {POOL_MIN} required "
            f"for topic_id={topic_id}"
        )

    pool = pool[:POOL_MAX]
    logger.info(
        "[QUIZ GEN] Generated %d questions for topic_id=%s across %d batches (%d failures)",
        len(pool), topic_id, batch_index, batch_failures,
    )
    return pool


async def generate_and_cache_quiz(
    topic_id: str,
    topic_name: str,
    skill: str,
    count: int = 5,
) -> list[dict]:
    """
    Lightweight helper used by the background queue to pre-generate a small
    quiz for the first topic of a new roadmap and cache it in MongoDB.
    Uses the full generate_quiz_pool pipeline but limits scope to `count` questions.
    """
    try:
        pool = await generate_quiz_pool(topic_id=topic_id, topic_name=topic_name, skill=skill)
        return pool[:count]
    except Exception as exc:
        logger.warning("[QUIZ GEN] generate_and_cache_quiz failed for %s: %s", topic_id, exc)
        return []
