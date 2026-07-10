import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.core.database import get_database
from app.mentor.schemas.context import StudentLearningContext

logger = logging.getLogger("app.mentor.context.service")


class StudentLearningContextService:
    """
    Centralized service to aggregate a student's real-time Tracks AI learning progress.
    Gathers info across users, roadmap_progress, and quiz_attempts collections.
    """

    @staticmethod
    def _calculate_streak(completed_dates: List[str]) -> int:
        """
        Calculates the consecutive learning streak based on ISO dates (YYYY-MM-DD).
        """
        valid_dates = set()
        for d_str in completed_dates:
            if not d_str:
                continue
            # Extract YYYY-MM-DD from ISO string (e.g., 2026-06-12T00:00:00)
            valid_dates.add(d_str[:10])

        if not valid_dates:
            return 0

        try:
            sorted_dates = sorted(
                [datetime.strptime(d, "%Y-%m-%d").date() for d in valid_dates],
                reverse=True
            )
        except Exception as e:
            logger.warning(f"Error parsing completion dates for streak: {e}")
            return 0

        today = date.today()
        yesterday = today - timedelta(days=1)

        # If the most recent completion is neither today nor yesterday, streak is broken
        if sorted_dates[0] != today and sorted_dates[0] != yesterday:
            return 0

        streak = 0
        expected_date = sorted_dates[0]
        
        for d in sorted_dates:
            if d == expected_date:
                streak += 1
                expected_date -= timedelta(days=1)
            elif d > expected_date:
                # Duplicate date in sequence, skip
                continue
            else:
                # Gap found
                break

        return streak

    @classmethod
    async def get_student_context(cls, user_id: str) -> StudentLearningContext:
        """
        Assembles a comprehensive StudentLearningContext from MongoDB.
        """
        db = get_database()
        if db is None:
            logger.error("Database connection unavailable for StudentLearningContextService")
            return StudentLearningContext(user_id=user_id)

        # 1. Fetch User Profile
        user_name = None
        user_email = None
        career_goal = None
        try:
            try:
                user_doc = await db["users"].find_one({"_id": ObjectId(user_id)})
            except Exception:
                user_doc = await db["users"].find_one({"_id": user_id})

            if user_doc:
                user_name = user_doc.get("name")
                user_email = user_doc.get("email")
                career_goal = user_doc.get("career_goal")
        except Exception as e:
            logger.warning(f"Failed to fetch user profile for context: {e}")

        # 2. Fetch Roadmap Progress
        roadmap_doc = None
        try:
            roadmap_doc = await db["roadmap_progress"].find_one({"user_id": user_id})
        except Exception as e:
            logger.warning(f"Failed to fetch roadmap progress for context: {e}")

        if not roadmap_doc:
            return StudentLearningContext(
                user_id=user_id,
                name=user_name,
                email=user_email,
                career_goal=career_goal,
                has_roadmap=False,
            )

        # Parse Roadmap Topics
        roadmap_name = roadmap_doc.get("skill", "Custom Track")
        completed_topics = []
        locked_topics = []
        active_topic_id = None
        active_topic_name = None
        active_topic_progress = 0
        current_phase_num = None
        current_phase_title = None
        
        total_topics = 0
        completed_count = 0
        roadmap_xp = 0
        
        completion_timestamps = []
        recent_activities_events = []

        for phase in roadmap_doc.get("phases", []):
            phase_num = phase.get("phase_number")
            phase_title = phase.get("phase_title")
            for topic in phase.get("topics", []):
                total_topics += 1
                t_name = topic.get("topic_name", topic["topic_id"])
                t_status = topic.get("status", "locked")
                roadmap_xp += topic.get("xp_earned", 0)

                if t_status == "completed":
                    completed_count += 1
                    completed_topics.append(t_name)
                    comp_at = topic.get("completed_at")
                    if comp_at:
                        completion_timestamps.append(comp_at)
                        recent_activities_events.append({
                            "timestamp": comp_at,
                            "description": f"Completed topic: {t_name}"
                        })
                elif t_status == "active":
                    active_topic_id = topic["topic_id"]
                    active_topic_name = t_name
                    active_topic_progress = topic.get("progress_pct", 0)
                    current_phase_num = phase_num
                    current_phase_title = phase_title
                else:
                    locked_topics.append(t_name)

        overall_progress = round((completed_count / total_topics) * 100) if total_topics > 0 else 0

        # 3. Fetch Quiz Performance
        quiz_attempts = []
        quiz_xp = 0
        try:
            quiz_attempts = await db["quiz_attempts"].find({"user_id": user_id}).to_list(None)
        except Exception as e:
            logger.warning(f"Failed to fetch quiz attempts for context: {e}")

        quiz_attempts_count = 0
        weak_topics = []
        
        # Build mapping of topic slug to topic name
        topic_names = {}
        for phase in roadmap_doc.get("phases", []):
            for topic in phase.get("topics", []):
                topic_names[topic["topic_id"]] = topic.get("topic_name", topic["topic_id"])

        for attempt in quiz_attempts:
            tid = attempt.get("topic_id")
            tname = topic_names.get(tid, tid)
            status = attempt.get("quiz_status", "IN_PROGRESS")
            latest_score = attempt.get("latest_score", 0.0)
            attempt_count = attempt.get("attempt_count", 0)
            
            history = attempt.get("attempt_history", [])
            quiz_attempts_count += len(history)

            # Sum Quiz XP
            for h in history:
                quiz_xp += h.get("xp_earned", 0)
                comp_at = h.get("completed_at")
                if comp_at:
                    completion_timestamps.append(comp_at)
                    passed_str = "Passed" if h.get("passed", False) else "Failed"
                    recent_activities_events.append({
                        "timestamp": comp_at,
                        "description": f"Attempted quiz for {tname} ({passed_str}, Score: {h.get('score', 0)}%)"
                    })

            # Check Weak Areas
            # A topic is weak if needs revision, latest score < 70, or passed but took > 2 attempts
            is_weak = False
            if status == "NEEDS_REVISION":
                is_weak = True
            elif latest_score < 70.0 and len(history) > 0:
                is_weak = True
            elif attempt_count > 2 and status in ("VERIFIED", "CHALLENGE_AVAILABLE"):
                is_weak = True

            if is_weak:
                weak_topics.append(tname)

        # Compute Streak
        streak_days = cls._calculate_streak(completion_timestamps)

        # Sort Recent Activities Descending by timestamp and retrieve top 5 descriptions
        recent_activities_events.sort(key=lambda x: x["timestamp"], reverse=True)
        recent_activities = [e["description"] for e in recent_activities_events[:5]]

        return StudentLearningContext(
            user_id=user_id,
            name=user_name,
            email=user_email,
            career_goal=career_goal,
            has_roadmap=True,
            roadmap_name=roadmap_name,
            current_phase_number=current_phase_num,
            current_phase_title=current_phase_title,
            current_active_topic_id=active_topic_id,
            current_active_topic_name=active_topic_name,
            completed_topics=completed_topics,
            locked_topics=locked_topics,
            active_topic_progress_pct=active_topic_progress,
            overall_progress_pct=overall_progress,
            total_xp=roadmap_xp + quiz_xp,
            streak_days=streak_days,
            quiz_attempts_count=quiz_attempts_count,
            weak_quiz_areas=weak_topics,
            recent_activities=recent_activities,
        )
