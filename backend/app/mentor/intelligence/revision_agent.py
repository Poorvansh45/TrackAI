from typing import Optional, Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from app.mentor.providers.base import MentorLLM
from app.mentor.intelligence.learning_profile import StudentLearningProfile

class RevisionPlannerAgent:
    def __init__(self, llm: Optional[MentorLLM] = None) -> None:
        self.llm = llm

    async def generate_plan(self, profile: StudentLearningProfile, student_context: Optional[Dict[str, Any]] = None) -> str:
        """
        Generates a personalized daily learning plan prioritizing:
        Weak Topic > Current Active Topic > Future Topics.
        """
        student_context = student_context or {}
        active_topic = student_context.get("current_active_topic_name")
        future_topics = student_context.get("locked_topics", [])[:2]
        
        sorted_weaknesses = sorted(profile.weaknesses, key=lambda x: x.confidence, reverse=True)
        weak_topics = [w.topic for w in sorted_weaknesses]

        # Prioritize study topics deterministically
        prioritized_list = []
        for wt in weak_topics:
            prioritized_list.append(f"Weak Topic: {wt}")
        if active_topic and active_topic not in weak_topics:
            prioritized_list.append(f"Current Roadmap Topic: {active_topic}")
        for ft in future_topics:
            if ft not in weak_topics and ft != active_topic:
                prioritized_list.append(f"Future Topic: {ft}")

        if not prioritized_list:
            return "No topic progress available to create a study plan. Complete some checklist items or take a quiz to initialize your roadmap!"

        if not self.llm or not self.llm.llm:
            return (
                "Today:\n"
                f"- 30 min: Focus on revising {weak_topics[0] if weak_topics else 'basics'}\n"
                f"- 20 min: Practice active topic {active_topic or 'general concepts'}\n"
                "- 15 min: Retake quiz to test your understanding."
            )

        topics_to_study_str = "\n".join([f"- {item}" for item in prioritized_list])

        system_prompt = """You are a professional study coordinator and revision planner.
Generate a structured, encouraging daily study plan for the student based on the prioritized topics.
Use the exact time allocations:
- 30 min: Revise the top priority weak topic (or active topic if no weak topic exists)
- 20 min: Practice the second priority topic (active topic or practice checklist)
- 15 min: Retake quiz or self-assess.

Format your output EXACTLY like this:
Today:
- 30 min: [Revise topic detail/action]
- 20 min: [Practice topic detail/action]
- 15 min: [Retake quiz/assessment action]

Keep the plan realistic, actionable, and very concise."""

        human_prompt = f"""Prioritized Study Topics:
{topics_to_study_str}

Create Today's learning plan."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt),
        ]
        
        try:
            response = await self.llm.ainvoke(messages)
            return response.content.strip()
        except Exception as e:
            return f"Plan generation failed: {e}"
