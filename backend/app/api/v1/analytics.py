from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import dateutil.parser
import statistics

from app.api.deps import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# ─── Schemas ──────────────────────────────────────────────────────────────────

class TrendPoint(BaseModel):
    date: str
    average_score: float
    attempts: int

class WeakTopic(BaseModel):
    topic_id: str
    topic_name: str
    latest_score: float
    average_score: float
    attempt_count: int
    quiz_status: str

class RevisionTopic(BaseModel):
    topic_id: str
    topic_name: str
    priority: str # "High", "Medium", "Low"
    latest_score: float
    attempt_count: int

class QuizAnalyticsResponse(BaseModel):
    total_quizzes_taken: int
    total_attempts: int
    overall_average_score: float
    overall_pass_rate: float
    verification_rate: float
    score_trend: List[TrendPoint]
    weak_topics: List[WeakTopic]
    revision_queue: List[RevisionTopic]

# ─── Internal helpers ────────────────────────────────────────────────────────

def _user_id(current_user: dict) -> str:
    return str(current_user["_id"])

def _get_week_key(iso_str: str) -> str:
    try:
        dt = dateutil.parser.isoparse(iso_str)
        # return ISO week format: YYYY-Www
        # For simplicity, we can just group by day or week. Let's do week (YYYY-Www)
        # Using isocalendar
        year, week, _ = dt.isocalendar()
        return f"{year}-W{week:02d}"
    except:
        return "Unknown"

# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/quiz", response_model=QuizAnalyticsResponse)
async def get_quiz_analytics(current_user: dict = Depends(get_current_user)):
    """
    Returns aggregated knowledge analytics for the user.
    Calculates summary metrics, weak topics, and revision queue priority.
    """
    from app.core.database import get_database
    db = get_database()
    if db is None:
        raise HTTPException(503, "Database unavailable")

    uid = _user_id(current_user)

    # Fetch roadmap to get topic names
    roadmap_doc = await db["roadmap_progress"].find_one({"user_id": uid})
    topic_names = {}
    if roadmap_doc:
        for phase in roadmap_doc.get("phases", []):
            for topic in phase.get("topics", []):
                topic_names[topic["topic_id"]] = topic.get("topic_name", topic["topic_id"])

    # Fetch all quiz attempts for this user
    attempts = await db["quiz_attempts"].find({"user_id": uid}).to_list(None)

    total_attempts = 0
    all_scores = []
    passed_attempts = 0
    verified_topics_count = 0
    
    trend_map = {} # week_key -> list of scores
    weak_topics = []
    revision_queue = []

    for att in attempts:
        tid = att["topic_id"]
        tname = topic_names.get(tid, tid)
        status = att.get("quiz_status", "NOT_AVAILABLE")
        
        if status in ("VERIFIED", "CHALLENGE_AVAILABLE"):
            verified_topics_count += 1
            
        history = att.get("attempt_history", [])
        if not history:
            continue
            
        total_attempts += len(history)
        
        topic_scores = []
        for h in history:
            score = h.get("score", 0)
            all_scores.append(score)
            topic_scores.append(score)
            if h.get("passed", False):
                passed_attempts += 1
                
            # Aggregate for trend
            completed_at = h.get("completed_at")
            if completed_at:
                week_key = _get_week_key(completed_at)
                if week_key not in trend_map:
                    trend_map[week_key] = []
                trend_map[week_key].append(score)

        avg_topic_score = sum(topic_scores) / len(topic_scores) if topic_scores else 0
        latest_score = att.get("latest_score", 0)
        attempt_count = att.get("attempt_count", 0)

        # 1. Revision Queue Logic
        if status == "NEEDS_REVISION":
            # Priority logic: 
            # High if latest score < 50 OR attempted > 2 times and still failing
            # Low if score >= 70 (almost passed)
            # Medium otherwise
            priority = "Medium"
            if latest_score < 50 or attempt_count > 2:
                priority = "High"
            elif latest_score >= 70:
                priority = "Low"
                
            revision_queue.append(RevisionTopic(
                topic_id=tid,
                topic_name=tname,
                priority=priority,
                latest_score=latest_score,
                attempt_count=attempt_count
            ))

        # 2. Weak Topic Logic
        # A topic is weak if:
        # - It is currently NEEDS_REVISION
        # - OR average score is < 70
        # - OR they passed, but it took them > 2 attempts
        is_weak = False
        if status == "NEEDS_REVISION":
            is_weak = True
        elif avg_topic_score < 70:
            is_weak = True
        elif attempt_count > 2 and status in ("VERIFIED", "CHALLENGE_AVAILABLE"):
            is_weak = True
            
        if is_weak:
            weak_topics.append(WeakTopic(
                topic_id=tid,
                topic_name=tname,
                latest_score=latest_score,
                average_score=avg_topic_score,
                attempt_count=attempt_count,
                quiz_status=status
            ))

    # Calculate global metrics
    overall_avg = sum(all_scores) / len(all_scores) if all_scores else 0
    overall_pass_rate = (passed_attempts / total_attempts * 100) if total_attempts > 0 else 0
    verification_rate = (verified_topics_count / len(attempts) * 100) if attempts else 0

    # Build trend
    score_trend = []
    for wk, scores in trend_map.items():
        score_trend.append(TrendPoint(
            date=wk,
            average_score=sum(scores) / len(scores),
            attempts=len(scores)
        ))
    
    # Sort trend by date ascending
    score_trend.sort(key=lambda x: x.date)

    # Sort weak topics (lowest avg score first)
    weak_topics.sort(key=lambda x: x.average_score)
    
    # Sort revision queue (High priority first, then lowest score)
    priority_order = {"High": 0, "Medium": 1, "Low": 2}
    revision_queue.sort(key=lambda x: (priority_order.get(x.priority, 1), x.latest_score))

    return QuizAnalyticsResponse(
        total_quizzes_taken=len(attempts),
        total_attempts=total_attempts,
        overall_average_score=overall_avg,
        overall_pass_rate=overall_pass_rate,
        verification_rate=verification_rate,
        score_trend=score_trend,
        weak_topics=weak_topics,
        revision_queue=revision_queue
    )
