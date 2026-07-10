"""
Quiz API — Tracks AI
=====================

Endpoints:
  POST /quiz/trigger            — Trigger background quiz generation after topic completion
  GET  /quiz/status/{topic_id}  — Poll quiz readiness (used by sidebar widget)
  GET  /quiz/available          — List all quizzes available to the authenticated user
  POST /quiz/start              — Start a quiz attempt (returns 10 questions)
  POST /quiz/submit             — Submit answers, calculate score, update status
  POST /quiz/challenge/start    — Start challenge mode (90%+ score required)
  GET  /quiz/history/{topic_id} — Attempt history for the authenticated user / topic

Security:
  All endpoints use Depends(get_current_user) — user_id is ALWAYS derived from the
  validated JWT token. Frontend-supplied user_id values in request bodies are
  IGNORED in favour of the authenticated identity.

Quiz lifecycle statuses:
  NOT_AVAILABLE → GENERATING → READY → IN_PROGRESS → VERIFIED | NEEDS_REVISION
  VERIFIED + score ≥ 90% → CHALLENGE_AVAILABLE
  FAILED (generation error, safe to retry)

MongoDB collections:
  quiz_pools    — one doc per topic_id (shared across all users)
  quiz_attempts — one doc per (user_id, topic_id) pair

Idempotency:
  - Pool creation uses upsert with $setOnInsert so concurrent triggers cannot
    create duplicate documents.
  - Trigger endpoint skips generation if the pool is already READY or GENERATING.
  - A unique index on quiz_pools.topic_id (applied at startup) enforces this
    at the database layer as well.
"""

import logging
import random
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user

logger = logging.getLogger("uvicorn.error")

router = APIRouter(prefix="/quiz", tags=["Quiz"])

# ─── XP constants ────────────────────────────────────────────────────────────

QUIZ_XP_VERIFIED  = 50   # base XP for passing (≥ 80 %)
QUIZ_XP_CHALLENGE = 30   # bonus XP for completing challenge mode
QUIZ_XP_PERFECT   = 20   # bonus for a 100 % score

PASS_THRESHOLD      = 80   # %
CHALLENGE_THRESHOLD = 90   # %
QUESTIONS_PER_ATTEMPT = 10


# ─── Pydantic schemas ─────────────────────────────────────────────────────────

class TriggerRequest(BaseModel):
    topic_id:   str
    topic_name: str
    skill:      str = "General"


class TriggerResponse(BaseModel):
    success:     bool
    quiz_status: str
    message:     str


class QuizStatusResponse(BaseModel):
    topic_id:        str
    topic_name:      str
    quiz_status:     str
    questions_count: int
    is_ready:        bool


class AvailableQuiz(BaseModel):
    topic_id:      str
    topic_name:    str
    quiz_status:   str
    xp_reward:     int
    user_score:    Optional[float] = None
    attempt_count: int


class StartRequest(BaseModel):
    topic_id: str


class QuizQuestion(BaseModel):
    id:       str
    question: str
    options:  list[dict]   # [{"key": "A", "text": "…"}, …]


class StartResponse(BaseModel):
    attempt_id:      str
    topic_id:        str
    topic_name:      str
    questions:       list[QuizQuestion]
    total_questions: int
    is_challenge:    bool


class AnswerItem(BaseModel):
    question_id:  str
    selected_key: str


class SubmitRequest(BaseModel):
    attempt_id:   str
    topic_id:     str
    answers:      list[AnswerItem]
    is_challenge: bool = False


class SubmitResponse(BaseModel):
    success:           bool
    score:             float
    correct_count:     int
    total_questions:   int
    passed:            bool
    quiz_status:       str
    challenge_unlocked: bool
    xp_earned:         int
    results:           list[dict]


class ChallengeStartRequest(BaseModel):
    topic_id: str


# ─── DB helpers ───────────────────────────────────────────────────────────────

async def _pools():
    from app.core.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(503, "Database unavailable")
    coll = db["quiz_pools"]
    # Ensure unique index on topic_id (no-op if it already exists)
    await coll.create_index("topic_id", unique=True, background=True)
    return coll


async def _attempts():
    from app.core.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(503, "Database unavailable")
    coll = db["quiz_attempts"]
    # Compound unique index — one attempt-doc per (user_id, topic_id)
    await coll.create_index(
        [("user_id", 1), ("topic_id", 1)], unique=True, background=True
    )
    return coll


def _xp_for_score(score: float, is_challenge: bool) -> int:
    if is_challenge:
        base = QUIZ_XP_CHALLENGE
    else:
        base = QUIZ_XP_VERIFIED if score >= PASS_THRESHOLD else 0
    bonus = QUIZ_XP_PERFECT if score == 100 else 0
    return base + bonus


def _user_id(current_user: dict) -> str:
    """Return the canonical string user_id from the authenticated user dict."""
    return str(current_user["_id"])


# ─── Background generation ────────────────────────────────────────────────────

async def _generate_and_store(topic_id: str, topic_name: str, skill: str) -> None:
    """
    Background task: generate quiz pool and persist it to MongoDB.
    Transitions status: GENERATING → READY | FAILED.
    Fully idempotent — if the document already has status READY when this
    task finally runs, it exits without touching the DB.
    """
    now = datetime.now(timezone.utc)
    pools_coll = await _pools()

    # Re-check under lock — another concurrent trigger may have finished first
    existing = await pools_coll.find_one({"topic_id": topic_id})
    if existing and existing.get("status") == "READY":
        logger.info("[QUIZ BG] Pool already READY for topic_id=%s — skipping", topic_id)
        return

    # Mark as GENERATING (upsert — creates doc if somehow missing)
    await pools_coll.update_one(
        {"topic_id": topic_id},
        {
            "$set": {
                "topic_id":   topic_id,
                "topic_name": topic_name,
                "skill":      skill,
                "status":     "GENERATING",
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    try:
        from app.services.ai.quiz_generator import generate_quiz_pool
        questions = await generate_quiz_pool(topic_id, topic_name, skill)

        await pools_coll.update_one(
            {"topic_id": topic_id},
            {
                "$set": {
                    "questions":     questions,
                    "status":        "READY",
                    "generated_at":  datetime.now(timezone.utc),
                    "updated_at":    datetime.now(timezone.utc),
                }
            },
        )
        logger.info(
            "[QUIZ BG] Pool READY for topic_id=%s (%d questions)", topic_id, len(questions)
        )
    except Exception as exc:
        logger.error(
            "[QUIZ BG] Generation FAILED for topic_id=%s | exc_type=%s | exc=%s",
            topic_id, type(exc).__name__, exc, exc_info=True,
        )
        await pools_coll.update_one(
            {"topic_id": topic_id},
            {
                "$set": {
                    "status":     "FAILED",
                    "error":      str(exc),
                    "error_type": type(exc).__name__,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/trigger", response_model=TriggerResponse)
async def trigger_quiz_generation(
    payload: TriggerRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """
    Called immediately after a topic is marked complete.
    Non-blocking — returns instantly; generation runs in background.

    Idempotency rules:
    - If the pool is already READY  → return immediately, no re-generation.
    - If the pool is GENERATING     → return immediately, generation already running.
    - If the pool is FAILED or missing → schedule fresh generation.

    User identity is derived from the validated JWT token; the frontend
    does not need to supply a user_id.
    """
    pools_coll = await _pools()
    existing = await pools_coll.find_one({"topic_id": payload.topic_id})

    if existing and existing.get("status") in ("READY", "GENERATING"):
        logger.info(
            "[QUIZ TRIGGER] Skipping — pool already %s for topic_id=%s (user=%s)",
            existing["status"], payload.topic_id, _user_id(current_user),
        )
        return TriggerResponse(
            success=True,
            quiz_status=existing["status"],
            message=f"Quiz pool already {existing['status']} — no regeneration needed",
        )

    background_tasks.add_task(
        _generate_and_store,
        payload.topic_id,
        payload.topic_name,
        payload.skill,
    )
    logger.info(
        "[QUIZ TRIGGER] Background generation started for topic_id=%s (user=%s)",
        payload.topic_id, _user_id(current_user),
    )
    return TriggerResponse(
        success=True,
        quiz_status="GENERATING",
        message="Quiz generation started in background",
    )


@router.get("/status/{topic_id}", response_model=QuizStatusResponse)
async def get_quiz_status(
    topic_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Poll quiz readiness. Used by the sidebar widget."""
    pools_coll = await _pools()
    doc = await pools_coll.find_one({"topic_id": topic_id})

    if not doc:
        return QuizStatusResponse(
            topic_id=topic_id,
            topic_name=topic_id.replace("-", " ").title(),
            quiz_status="NOT_AVAILABLE",
            questions_count=0,
            is_ready=False,
        )

    return QuizStatusResponse(
        topic_id=topic_id,
        topic_name=doc.get("topic_name", topic_id),
        quiz_status=doc.get("status", "NOT_AVAILABLE"),
        questions_count=len(doc.get("questions", [])),
        is_ready=doc.get("status") == "READY",
    )


@router.get("/available", response_model=list[AvailableQuiz])
async def get_available_quizzes(
    current_user: dict = Depends(get_current_user),
):
    print("ENTERED /quiz/available")
    """
    Returns quizzes that are READY (or already attempted) for the authenticated
    user, derived from completed topics in their roadmap_progress.
    """
    from app.core.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    uid = _user_id(current_user)

    roadmap_doc = await db["roadmap_progress"].find_one({"user_id": uid})
    if not roadmap_doc:
        return []

    completed_ids: list[str] = []
    for phase in roadmap_doc.get("phases", []):
        for topic in phase.get("topics", []):
            if topic.get("status") == "completed":
                completed_ids.append(topic["topic_id"])

    if not completed_ids:
        return []

    pools_coll  = await _pools()
    attempts_coll = await _attempts()

    result: list[AvailableQuiz] = []
    async for pool in pools_coll.find({"topic_id": {"$in": completed_ids}}):
        pool_status = pool.get("status", "NOT_AVAILABLE")
        if pool_status not in ("READY", "GENERATING", "FAILED"):
            continue

        attempt_doc   = await attempts_coll.find_one({"user_id": uid, "topic_id": pool["topic_id"]})
        user_score    = None
        attempt_count = 0
        user_quiz_status = pool_status

        if attempt_doc:
            attempt_count    = attempt_doc.get("attempt_count", 0)
            history          = attempt_doc.get("attempt_history", [])
            if history:
                user_score       = history[-1]["score"]
                user_quiz_status = attempt_doc.get("quiz_status", pool_status)

        result.append(
            AvailableQuiz(
                topic_id=pool["topic_id"],
                topic_name=pool.get("topic_name", pool["topic_id"]),
                quiz_status=user_quiz_status,
                xp_reward=QUIZ_XP_VERIFIED,
                user_score=user_score,
                attempt_count=attempt_count,
            )
        )

    return result


@router.post("/start", response_model=StartResponse)
async def start_quiz(
    payload: StartRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Start a quiz attempt — serve 10 randomly selected questions the user
    has not yet seen. Falls back to full pool reuse when pool is exhausted.
    """
    uid = _user_id(current_user)

    pools_coll   = await _pools()
    attempts_coll = await _attempts()

    pool = await pools_coll.find_one({"topic_id": payload.topic_id})
    if not pool or pool.get("status") != "READY":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Quiz for topic '{payload.topic_id}' is not ready yet "
                f"(status: {pool.get('status', 'NOT_AVAILABLE') if pool else 'NOT_AVAILABLE'})"
            ),
        )

    all_questions: list[dict] = pool.get("questions", [])
    attempt_doc = await attempts_coll.find_one({"user_id": uid, "topic_id": payload.topic_id})
    used_ids: set[str] = set(attempt_doc.get("used_question_ids", [])) if attempt_doc else set()

    unused = [q for q in all_questions if q["id"] not in used_ids]
    if len(unused) < QUESTIONS_PER_ATTEMPT:
        # Pool exhausted — reset used IDs and start fresh
        unused  = all_questions
        used_ids = set()
        logger.info(
            "[QUIZ START] Pool exhausted for user=%s topic=%s — resetting used IDs",
            uid, payload.topic_id,
        )

    selected     = random.sample(unused, min(QUESTIONS_PER_ATTEMPT, len(unused)))
    selected_ids = [q["id"] for q in selected]
    attempt_id   = str(uuid.uuid4())
    now          = datetime.now(timezone.utc)

    await attempts_coll.update_one(
        {"user_id": uid, "topic_id": payload.topic_id},
        {
            "$set": {
                "user_id":                        uid,
                "topic_id":                       payload.topic_id,
                "current_attempt_id":             attempt_id,
                "current_attempt_question_ids":   selected_ids,
                "current_attempt_started_at":     now,
                "updated_at":                     now,
            },
            "$addToSet": {"used_question_ids": {"$each": selected_ids}},
            "$setOnInsert": {
                "attempt_count": 0,
                "quiz_status":   "IN_PROGRESS",
                "created_at":    now,
            },
        },
        upsert=True,
    )

    # Strip correct answers before sending to client
    clean_questions = [
        QuizQuestion(id=q["id"], question=q["question"], options=q["options"])
        for q in selected
    ]

    return StartResponse(
        attempt_id=attempt_id,
        topic_id=payload.topic_id,
        topic_name=pool.get("topic_name", payload.topic_id),
        questions=clean_questions,
        total_questions=len(clean_questions),
        is_challenge=False,
    )


@router.post("/submit", response_model=SubmitResponse)
async def submit_quiz(
    payload: SubmitRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Grade answers, update attempt history, award XP, update quiz + roadmap status.
    """
    from app.core.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    uid = _user_id(current_user)

    pools_coll    = await _pools()
    attempts_coll = await _attempts()

    pool = await pools_coll.find_one({"topic_id": payload.topic_id})
    if not pool:
        raise HTTPException(404, "Quiz pool not found")

    attempt_doc = await attempts_coll.find_one({"user_id": uid, "topic_id": payload.topic_id})
    if not attempt_doc:
        raise HTTPException(404, "No active attempt found — call /quiz/start first")

    # Verify this submission belongs to the active attempt
    if attempt_doc.get("current_attempt_id") != payload.attempt_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="attempt_id does not match the active attempt — possible duplicate submission",
        )

    questions_map = {q["id"]: q for q in pool.get("questions", [])}

    # Grade
    correct_count = 0
    results: list[dict] = []
    for answer in payload.answers:
        q = questions_map.get(answer.question_id)
        if not q:
            continue
        is_correct = q["answer"] == answer.selected_key
        if is_correct:
            correct_count += 1
        results.append({
            "question_id":  answer.question_id,
            "question":     q["question"],
            "selected_key": answer.selected_key,
            "correct_key":  q["answer"],
            "is_correct":   is_correct,
            "explanation":  q.get("explanation", ""),
        })

    total = len(payload.answers)
    score = round((correct_count / total) * 100, 1) if total > 0 else 0.0
    passed              = score >= PASS_THRESHOLD
    challenge_unlocked  = score >= CHALLENGE_THRESHOLD
    xp_earned           = _xp_for_score(score, payload.is_challenge)

    # Determine new quiz status
    if payload.is_challenge:
        new_quiz_status = "VERIFIED"
    elif passed and challenge_unlocked:
        new_quiz_status = "CHALLENGE_AVAILABLE"
    elif passed:
        new_quiz_status = "VERIFIED"
    else:
        new_quiz_status = "NEEDS_REVISION"

    now = datetime.now(timezone.utc)
    attempt_entry = {
        "attempt_id":      payload.attempt_id,
        "score":           score,
        "correct_count":   correct_count,
        "total_questions": total,
        "passed":          passed,
        "is_challenge":    payload.is_challenge,
        "xp_earned":       xp_earned,
        "completed_at":    now.isoformat(),
    }

    await attempts_coll.update_one(
        {"user_id": uid, "topic_id": payload.topic_id},
        {
            "$set": {
                "quiz_status":  new_quiz_status,
                "latest_score": score,
                "xp_earned":    xp_earned,
                "updated_at":   now,
            },
            "$inc":  {"attempt_count": 1},
            "$push": {"attempt_history": attempt_entry},
            "$unset": {"current_attempt_id": ""},   # clear active attempt slot
        },
    )

    # Mirror verification into roadmap_progress so the Learning Graph reflects it
    if passed:
        try:
            await db["roadmap_progress"].update_one(
                {"user_id": uid, "phases.topics.topic_id": payload.topic_id},
                {
                    "$set": {
                        "phases.$[].topics.$[t].quiz_verified": True,
                        "phases.$[].topics.$[t].quiz_score":    score,
                        "updated_at":                           now,
                    }
                },
                array_filters=[{"t.topic_id": payload.topic_id}],
            )
        except Exception as exc:
            logger.warning("[QUIZ SUBMIT] roadmap_progress update failed: %s", exc)

    # Trigger adaptive learning profile rebuild
    try:
        from app.mentor.intelligence.learning_profile import LearningProfileBuilder
        await LearningProfileBuilder.build_and_save_profile(uid)
    except Exception as exc:
        logger.error("[QUIZ SUBMIT] Failed to update learning profile: %s", exc)

    logger.info(
        "[QUIZ SUBMIT] user=%s topic=%s score=%.1f%% passed=%s status=%s xp=%d",
        uid, payload.topic_id, score, passed, new_quiz_status, xp_earned,
    )

    return SubmitResponse(
        success=True,
        score=score,
        correct_count=correct_count,
        total_questions=total,
        passed=passed,
        quiz_status=new_quiz_status,
        challenge_unlocked=challenge_unlocked,
        xp_earned=xp_earned,
        results=results,
    )


@router.post("/challenge/start", response_model=StartResponse)
async def start_challenge(
    payload: ChallengeStartRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Start challenge mode — only available after the user scored ≥ 90 %.
    Serves a fresh 10-question set from the unused portion of the pool.
    """
    uid = _user_id(current_user)

    pools_coll    = await _pools()
    attempts_coll = await _attempts()

    attempt_doc = await attempts_coll.find_one({"user_id": uid, "topic_id": payload.topic_id})
    if not attempt_doc or attempt_doc.get("quiz_status") not in (
        "CHALLENGE_AVAILABLE", "VERIFIED"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Challenge mode requires a score of 90 % or higher on the main quiz",
        )

    pool = await pools_coll.find_one({"topic_id": payload.topic_id})
    if not pool or pool.get("status") != "READY":
        raise HTTPException(400, "Quiz pool not ready")

    all_questions: list[dict] = pool.get("questions", [])
    used_ids = set(attempt_doc.get("used_question_ids", []))
    unused   = [q for q in all_questions if q["id"] not in used_ids]

    if len(unused) < QUESTIONS_PER_ATTEMPT:
        # Pool exhausted for challenge — reset and reuse
        unused = all_questions

    selected     = random.sample(unused, min(QUESTIONS_PER_ATTEMPT, len(unused)))
    selected_ids = [q["id"] for q in selected]
    attempt_id   = str(uuid.uuid4())
    now          = datetime.now(timezone.utc)

    await attempts_coll.update_one(
        {"user_id": uid, "topic_id": payload.topic_id},
        {
            "$set": {
                "current_attempt_id":           attempt_id,
                "current_attempt_question_ids": selected_ids,
                "current_attempt_started_at":   now,
                "quiz_status":                  "IN_PROGRESS",
                "updated_at":                   now,
            },
            "$addToSet": {"used_question_ids": {"$each": selected_ids}},
        },
    )

    clean_questions = [
        QuizQuestion(id=q["id"], question=q["question"], options=q["options"])
        for q in selected
    ]

    return StartResponse(
        attempt_id=attempt_id,
        topic_id=payload.topic_id,
        topic_name=pool.get("topic_name", payload.topic_id),
        questions=clean_questions,
        total_questions=len(clean_questions),
        is_challenge=True,
    )


@router.get("/history/{topic_id}")
async def get_quiz_history(
    topic_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Attempt history for the authenticated user / topic pair."""
    uid = _user_id(current_user)
    attempts_coll = await _attempts()
    doc = await attempts_coll.find_one({"user_id": uid, "topic_id": topic_id})
    if not doc:
        return {"attempt_count": 0, "quiz_status": "NOT_AVAILABLE", "history": []}

    return {
        "attempt_count": doc.get("attempt_count", 0),
        "quiz_status":   doc.get("quiz_status", "NOT_AVAILABLE"),
        "latest_score":  doc.get("latest_score"),
        "xp_earned":     doc.get("xp_earned", 0),
        "history":       doc.get("attempt_history", []),
    }
