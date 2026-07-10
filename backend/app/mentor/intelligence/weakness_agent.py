from typing import Optional
from langchain_core.messages import SystemMessage, HumanMessage
from app.mentor.providers.base import MentorLLM
from app.mentor.intelligence.learning_profile import StudentLearningProfile

class WeaknessAnalyzerAgent:
    def __init__(self, llm: Optional[MentorLLM] = None) -> None:
        self.llm = llm

    async def diagnose(self, profile: StudentLearningProfile) -> str:
        """
        Analyze the student's strengths and weaknesses to generate a learning diagnosis.
        Calculations and metrics are computed deterministically; the LLM is only utilized 
        for synthesizing the final textual feedback.
        """
        if not profile.weaknesses and not profile.strengths:
            return "We don't have enough progress data yet to generate a learning diagnosis. Complete quizzes or chat with me to get started!"

        if not self.llm or not self.llm.llm:
            weak_topics = [w.topic for w in profile.weaknesses]
            return f"[Mock Diagnosis] You are doing well in {', '.join(profile.strengths or ['basics'])}, but need to focus on {', '.join(weak_topics or ['advanced concepts'])}."

        strengths_str = ", ".join(profile.strengths) or "None recorded yet"
        weakness_details = []
        for w in profile.weaknesses:
            weakness_details.append(f"- {w.topic} (Confidence of weakness: {w.confidence}%, Reason: {w.reason})")
        weaknesses_str = "\n".join(weakness_details) or "None recorded yet"

        system_prompt = """You are an expert educational counselor and learning diagnosis agent.
Analyze the student's strengths and weaknesses.
Generate a concise, constructive learning diagnosis of 2-3 sentences.
Highlight their conceptual gap, learning patterns, or behavior based on the reasons.
Do not list bullet points. Speak directly to the student ("You understand... but struggle with...").
Be encouraging and highly specific to the topics listed. Do not invent facts not present in the data."""

        human_prompt = f"""Student Profile:
Strengths:
{strengths_str}

Weaknesses & Challenges:
{weaknesses_str}

Provide the learning diagnosis."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=human_prompt),
        ]
        
        try:
            response = await self.llm.ainvoke(messages)
            return response.content.strip()
        except Exception as e:
            return f"Diagnosis generation failed: {e}"
