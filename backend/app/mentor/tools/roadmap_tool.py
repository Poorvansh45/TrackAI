import logging
from typing import Any, List, Optional, Type
from pydantic import BaseModel, Field, field_validator
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_core.tools import BaseTool

from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.tools.roadmap")


class HelpFromRoadmapInput(BaseModel):
    """Validated input for HelpFromRoadmapTool."""
    question: str = Field(description="The student's question about their learning path")
    roadmap_topic: str = Field(description="Current roadmap section the student is on")
    student_level: str = Field(default="intermediate", description="Current student level")
    completed_topics: Optional[List[str]] = Field(default=None, description="Topics already completed")
    user_id: Optional[str] = Field(default=None, description="The MongoDB user ID of the student")

    @field_validator("roadmap_topic")
    @classmethod
    def validate_topic(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("roadmap_topic cannot be empty")
        return v.strip()


class HelpFromRoadmapTool(BaseTool):
    """
    Provides curriculum-anchored learning guidance using the roadmap structure.
    """
    name: str = "help_from_roadmap"
    description: str = (
        "Use when the student asks about their learning path, what to learn next, "
        "or how a topic fits into the overall curriculum. "
        "Input: student question, current roadmap topic, student level, completed topics, user_id. "
        "Output: personalized, roadmap-anchored guidance."
    )
    args_schema: Type[BaseModel] = HelpFromRoadmapInput
    mentor_llm: Optional[MentorLLM] = Field(default=None)
    roadmap: dict = Field(default_factory=dict)

    model_config = {"arbitrary_types_allowed": True}

    def _get_roadmap_context(self, roadmap_topic: str, completed_topics: Optional[List[str]]) -> str:
        """Fallback: Extract relevant roadmap data from mock map as a formatted string."""
        topic_data = self.roadmap.get(roadmap_topic, {})

        if not topic_data:
            # Fuzzy match topics
            for key in self.roadmap:
                if roadmap_topic.lower() in key.lower():
                    topic_data = self.roadmap[key]
                    roadmap_topic = key
                    break

        if not topic_data:
            return (
                f"No roadmap data found for '{roadmap_topic}'. "
                f"Available sections: {list(self.roadmap.keys())}"
            )

        remaining = [
            t for t in topic_data.get("topics", [])
            if t not in (completed_topics or [])
        ]

        return (
            f"ROADMAP SECTION: {roadmap_topic}\n"
            f"All topics in this section : {', '.join(topic_data.get('topics', []))}\n"
            f"Remaining topics           : {', '.join(remaining) or 'All complete!'}\n"
            f"Next sections after this   : {', '.join(topic_data.get('next_steps', []))}\n"
            f"Prerequisites completed    : {', '.join(topic_data.get('prerequisites', []))}\n"
            f"Estimated hours remaining  : ~{len(remaining) * 3}h (est. 3h per topic)"
        )

    async def _get_mongodb_roadmap_context(self, user_id: str) -> str:
        """Query MongoDB roadmap_progress collection for real user progress context."""
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return "Database connection unavailable."

        try:
            roadmap_doc = await db["roadmap_progress"].find_one({"user_id": user_id})
            if not roadmap_doc:
                return "No active learning roadmap found for the user."

            phases = roadmap_doc.get("phases", [])
            skill = roadmap_doc.get("skill", "Custom Track")
            
            all_topics = []
            completed = []
            active = []
            locked = []
            
            for phase in phases:
                for topic in phase.get("topics", []):
                    tname = topic.get("topic_name", topic["topic_id"])
                    all_topics.append(tname)
                    status = topic.get("status", "locked")
                    if status == "completed":
                        completed.append(tname)
                    elif status == "active":
                        active.append(tname)
                    else:
                        locked.append(tname)

            return (
                f"ACTIVE ROADMAP TRACK: {skill}\n"
                f"Current Active Topic: {', '.join(active) or 'None'}\n"
                f"Completed Topics: {', '.join(completed) or 'None'}\n"
                f"Remaining Locked Topics: {', '.join(locked) or 'None'}\n"
                f"Overall Progress: {len(completed)} / {len(all_topics)} topics complete"
            )
        except Exception as e:
            logger.error(f"Failed to query MongoDB for roadmap context: {e}")
            return "Failed to query real-time roadmap data from database."

    def _run(
        self,
        question: str,
        roadmap_topic: str,
        student_level: str = "intermediate",
        completed_topics: Optional[List[str]] = None,
        user_id: Optional[str] = None,
    ) -> str:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            # If loop is already running, fall back to sync mock data extraction
            roadmap_ctx = self._get_roadmap_context(roadmap_topic, completed_topics)
            system = f"""You are Mentor, the AI tutor for Tracks AI.
You are helping a {student_level} student navigate their learning roadmap.

ROADMAP CONTEXT:
{roadmap_ctx}

GUIDELINES:
- Be specific about which topic to tackle next
- Keep response focused and actionable (under 150 words)"""
            messages = [SystemMessage(content=system), HumanMessage(content=question)]
            return self.mentor_llm.invoke(messages).content
        else:
            return loop.run_until_complete(
                self._arun(question, roadmap_topic, student_level, completed_topics, user_id)
            )

    async def _arun(
        self,
        question: str,
        roadmap_topic: str,
        student_level: str = "intermediate",
        completed_topics: Optional[List[str]] = None,
        user_id: Optional[str] = None,
    ) -> str:
        if self.mentor_llm is None:
            return f"[Mock RoadmapTool] Guidance for: '{question}' on topic '{roadmap_topic}'"
        try:
            if user_id:
                roadmap_ctx = await self._get_mongodb_roadmap_context(user_id)
            else:
                roadmap_ctx = self._get_roadmap_context(roadmap_topic, completed_topics)

            system = f"""You are Mentor, the AI tutor for Tracks AI.
You are helping a {student_level} student navigate their learning roadmap.

ROADMAP CONTEXT (authoritative — do not suggest topics outside this):
{roadmap_ctx}

GUIDELINES:
- Be specific about which topic to tackle next (refer to Active Topic)
- Explain WHY that topic is the right next step based on the curriculum
- If all topics are completed, congratulate the student and suggest career pathways
- Keep response focused and actionable (under 150 words)"""

            messages = [SystemMessage(content=system), HumanMessage(content=question)]
            response = await self.mentor_llm.ainvoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"HelpFromRoadmapTool._arun failed: {e}")
            return f"Error generating roadmap guidance: {e}"
