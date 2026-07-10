import datetime
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from bson import ObjectId

from app.core.database import get_database
from app.mentor.context.service import StudentLearningContextService

logger = logging.getLogger("mentor.intelligence.learning_profile")

class WeaknessItem(BaseModel):
    topic: str
    confidence: int
    reason: str

class StudentLearningProfile(BaseModel):
    user_id: str
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[WeaknessItem] = Field(default_factory=list)
    recommended_revision: List[str] = Field(default_factory=list)
    updated_at: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())

class LearningProfileBuilder:
    @staticmethod
    async def get_collection():
        db = get_database()
        if db is None:
            raise RuntimeError("Database connection not initialized")
        return db["learning_profiles"]

    @staticmethod
    async def build_profile(user_id: str) -> StudentLearningProfile:
        """
        Aggregate learning data across:
        - roadmap_progress (via StudentLearningContextService)
        - quiz_attempts
        - mentor_sessions (chat message history analysis)
        to construct a StudentLearningProfile.
        """
        # 1. Fetch current context
        ctx = await StudentLearningContextService.get_student_context(user_id)
        
        # Unique list of topic names across roadmap
        roadmap_topics = set(ctx.completed_topics + ctx.locked_topics)
        if ctx.current_active_topic_name:
            roadmap_topics.add(ctx.current_active_topic_name)
            
        # 2. Gather Strengths
        # Completed topics with high scores or passed status
        strengths = []
        db = get_database()
        
        # Pull roadmap_progress doc for scores/status
        roadmap_doc = await db["roadmap_progress"].find_one({"user_id": user_id})
        quiz_verified_topics = {}
        if roadmap_doc:
            for phase in roadmap_doc.get("phases", []):
                for topic in phase.get("topics", []):
                    t_name = topic.get("topic_name", topic["topic_id"])
                    if topic.get("status") == "completed":
                        quiz_verified = topic.get("quiz_verified", False)
                        quiz_score = topic.get("quiz_score", 0.0)
                        if quiz_verified and quiz_score >= 80:
                            strengths.append(t_name)
                        elif not quiz_verified:
                            strengths.append(t_name)
                    quiz_verified_topics[t_name] = {
                        "verified": topic.get("quiz_verified", False),
                        "score": topic.get("quiz_score", 0.0)
                    }

        # 3. Gather Weaknesses
        weaknesses_map = {}
        
        # A. Quiz weaknesses
        quiz_attempts = await db["quiz_attempts"].find({"user_id": user_id}).to_list(None)
        for attempt in quiz_attempts:
            topic_id = attempt.get("topic_id")
            # Map topic slug to topic name
            t_name = topic_id
            if roadmap_doc:
                for phase in roadmap_doc.get("phases", []):
                    for topic in phase.get("topics", []):
                        if topic["topic_id"] == topic_id:
                            t_name = topic.get("topic_name", topic_id)
                            break
            
            status = attempt.get("quiz_status", "")
            latest_score = attempt.get("latest_score", 0.0)
            attempt_count = attempt.get("attempt_count", 0)
            
            is_weak = False
            confidence = 0
            reason = ""
            
            if status == "NEEDS_REVISION":
                is_weak = True
                confidence = 50
                reason = "Needs revision"
            elif latest_score < 70.0 and attempt_count > 0:
                is_weak = True
                confidence = int(100 - latest_score)
                reason = f"Low quiz score ({latest_score}%)"
            elif attempt_count > 2:
                is_weak = True
                confidence = 40
                reason = f"Took {attempt_count} attempts to pass"
                
            if is_weak:
                weaknesses_map[t_name] = WeaknessItem(
                    topic=t_name,
                    confidence=confidence,
                    reason=reason
                )

        # B. Chat repeats weakness detection
        # Retrieve all human messages from user's sessions
        sessions = []
        cursor = db["mentor_sessions"].find({"user_id": user_id})
        async for doc in cursor:
            sessions.append(doc)
            
        chat_mentions = {}
        for s in sessions:
            for m in s.get("messages", []):
                if m.get("role") == "human":
                    content_lower = m.get("content", "").lower()
                    # Check if user mentioned any of our roadmap topics
                    for t_name in roadmap_topics:
                        t_lower = t_name.lower()
                        if t_lower in content_lower:
                            chat_mentions[t_name] = chat_mentions.get(t_name, 0) + 1

        # Check repeatedly asked topics (>= 3 times)
        for t_name, count in chat_mentions.items():
            if count >= 3:
                confidence = min(90, 40 + count * 5)
                reason = f"Repeatedly asked in chat ({count} times)"
                
                if t_name in weaknesses_map:
                    # Merge: keep highest confidence, join reasons
                    existing = weaknesses_map[t_name]
                    merged_conf = max(existing.confidence, confidence)
                    merged_reason = f"{existing.reason}; {reason}"
                    weaknesses_map[t_name] = WeaknessItem(
                        topic=t_name,
                        confidence=merged_conf,
                        reason=merged_reason
                    )
                else:
                    weaknesses_map[t_name] = WeaknessItem(
                        topic=t_name,
                        confidence=confidence,
                        reason=reason
                    )

        weaknesses = list(weaknesses_map.values())
        
        # Determine recommended revision
        recommended_revision = []
        for w in weaknesses:
            recommended_revision.append(f"{w.topic} basics")

        # Strengths should not overlap with weaknesses
        strengths = [s for s in strengths if s not in weaknesses_map]

        profile = StudentLearningProfile(
            user_id=user_id,
            strengths=strengths,
            weaknesses=weaknesses,
            recommended_revision=recommended_revision
        )
        return profile

    @staticmethod
    async def get_profile(user_id: str) -> Optional[StudentLearningProfile]:
        """Load profile from database cache if exists."""
        coll = await LearningProfileBuilder.get_collection()
        doc = await coll.find_one({"user_id": user_id})
        if doc:
            doc.pop("_id", None)
            return StudentLearningProfile(**doc)
        return None

    @staticmethod
    async def build_and_save_profile(user_id: str) -> StudentLearningProfile:
        """Build and cache profile in MongoDB."""
        profile = await LearningProfileBuilder.build_profile(user_id)
        coll = await LearningProfileBuilder.get_collection()
        doc = profile.model_dump()
        await coll.update_one(
            {"user_id": user_id},
            {"$set": doc},
            upsert=True
        )
        logger.info(f"Successfully cached learning profile for user_id={user_id}")
        return profile
