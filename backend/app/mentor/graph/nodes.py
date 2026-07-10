import logging
import time
from typing import List, Dict, Any, Optional

from app.core.config import settings

from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage

from app.mentor.graph.state import MentorState
from app.mentor.schemas.chat import IntentType
from app.mentor.router.detector import IntentDetector
from app.mentor.memory.manager import MemoryManager
from app.mentor.vectorstore.manager import VectorStoreManager
from app.mentor.tools.registry import ToolRegistry
from app.mentor.rag.pipeline import RAGPipeline
from app.mentor.agents.youtube_agent import YouTubeLearningAgent
from app.mentor.agents.pdf_agent import PDFLearningAgent
from app.mentor.agents.quiz_agent import QuizAgent
from app.mentor.providers.base import MentorLLM
from app.mentor.tools.explain_tool import clean_concept
from app.mentor.intelligence.weakness_agent import WeaknessAnalyzerAgent
from app.mentor.intelligence.revision_agent import RevisionPlannerAgent


logger = logging.getLogger("mentor.graph.nodes")


def build_context_system_prompt(student_context: Optional[dict]) -> str:
    """
    Builds a dynamic context-aware system prompt for the Mentor AI.
    """
    base = """You are Tracks AI Mentor — a precise, expert AI teaching assistant.
Personality:
- You teach based on the student's exact learning roadmap and their question.
- You are focused, clear, and never explain unrelated concepts.
- Every answer directly addresses what the student asked — nothing more, nothing less.
- You are encouraging but efficient. Avoid unnecessary filler or preambles.
- When explaining topics, always ground answers in the student's active roadmap topic."""
    if not student_context or not student_context.get("has_roadmap"):
        return base + "\nNote: The user currently has NO active roadmap. Remind them to generate a learning roadmap first using the onboarding/assessment flow so you can guide them better!"

    # We have a roadmap! Format the student context details
    career_goal = student_context.get("career_goal") or "not specified"
    roadmap_name = student_context.get("roadmap_name") or "custom roadmap"
    
    current_phase = "None"
    if student_context.get("current_phase_number") is not None:
        current_phase = f"Phase {student_context.get('current_phase_number')}: {student_context.get('current_phase_title')}"
        
    active_topic = student_context.get("current_active_topic_name") or "None"
    completed = ", ".join(student_context.get("completed_topics", [])) or "None (just started)"
    locked = ", ".join(student_context.get("locked_topics", [])) or "None"
    progress = f"{student_context.get('overall_progress_pct')}% overall, active topic progress: {student_context.get('active_topic_progress_pct')}%"
    xp = student_context.get("total_xp", 0)
    streak = student_context.get("streak_days", 0)
    weak_areas = ", ".join(student_context.get("weak_quiz_areas", [])) or "None detected yet"
    recent = "\n".join([f"- {act}" for act in student_context.get("recent_activities", [])[:3]]) or "No recent activity logged."

    context_str = f"""
Here is the student's real-time Tracks AI learning progress:
- Career Goal: {career_goal}
- Active Roadmap: {roadmap_name}
- Current Phase: {current_phase}
- Active Topic: {active_topic}
- Completed Topics: {completed}
- Locked Topics: {locked}
- Overall Progress: {progress}
- Total XP: {xp} XP
- Streak: {streak} days
- Weak Quiz Areas: {weak_areas}
- Recent Learning Activities:
{recent}

Use this information to answer the student's questions, tailoring your guidance, examples, and motivation. If they ask what to study next, point to the Active Topic. Encourage them to review their Weak Quiz Areas.
"""
    return base + context_str


class NodeProvider:
    """
    Houses node functions for the LangGraph orchestration.
    Maintains clean reference pointers to active subsystem managers.
    """

    GENERAL_CHAT_SYSTEM = """You are Mentor, the friendly AI tutor for Tracks AI.
You help students learn programming and AI concepts.
For general questions and greetings, be warm and encouraging.
Gently guide students toward asking specific learning questions.
Keep responses concise (under 100 words)."""

    ONBOARDING_FALLBACK_TEXT = "It looks like you haven't generated a learning roadmap yet. To help you master skills step-by-step, please generate a roadmap first using the onboarding/assessment flow!"

    def __init__(
        self,
        llm: MentorLLM,
        memory_manager: MemoryManager,
        vector_store_manager: VectorStoreManager,
        tool_registry: ToolRegistry,
        rag_pipeline: RAGPipeline,
        yt_agent: YouTubeLearningAgent,
        pdf_agent: PDFLearningAgent,
        quiz_agent: QuizAgent,
    ) -> None:
        self.llm = llm
        self.memory = memory_manager
        self.vsm = vector_store_manager
        self.registry = tool_registry
        self.rag_pipeline = rag_pipeline
        self.yt_agent = yt_agent
        self.pdf_agent = pdf_agent
        self.quiz_agent = quiz_agent
        self.detector = IntentDetector(llm=self.llm)
        self.weakness_agent = WeaknessAnalyzerAgent(llm=self.llm)
        self.revision_agent = RevisionPlannerAgent(llm=self.llm)


    def _check_roadmap_fallback(self, state: MentorState) -> Optional[dict]:
        """Utility to check if student has no roadmap and return onboarding fallback instructions."""
        ctx = state.get("student_context")
        if ctx is not None and not ctx.get("has_roadmap", False):
            return {"tool_result": self.ONBOARDING_FALLBACK_TEXT, "error": None}
        return None

    async def load_memory_node(self, state: MentorState) -> dict:
        """Node: Load conversation history from MemoryManager."""
        try:
            session = await self.memory.get_or_create_session(
                user_id=state["user_id"],
                session_id=state.get("session_id"),
                metadata={"student_level": state.get("student_level", "intermediate")},
            )
            # Load last 10 messages for context
            history = session.get_messages_as_base()[-10:]
            if settings.mentor_debug:
                logger.info(
                    f"\n========= MENTOR DEBUG =========\n"
                    f"RAW USER MESSAGE    : {state.get('user_input', '')[:120]}\n"
                    f"SESSION ID          : {session.session_id}\n"
                    f"LOADED HISTORY COUNT: {len(history)} messages\n"
                    f"================================"
                )
            return {
                "messages": history,
                "session_id": session.session_id,
            }
        except Exception as e:
            logger.error(f"load_memory_node failed: {e}")
            return {"error": f"Failed to load memory: {e}"}

    async def detect_intent_node(self, state: MentorState) -> dict:
        """Node: Classify intent and extract arguments."""
        fallback = self._check_roadmap_fallback(state)
        if fallback:
            return {"intent_type": IntentType.GENERAL_CHAT.value, "intent_params": {}}

        try:
            user_input = state["user_input"]
            history = state.get("messages", [])
            intent_result = await self.detector.detect(user_input, history)

            # Preserve detected params as-is; only fill missing level from state
            params = dict(intent_result.tool_params)
            if "level" not in params:
                params["level"] = state.get("student_level", "intermediate")

            if settings.mentor_debug:
                logger.info(
                    f"\n========= MENTOR DEBUG =========\n"
                    f"DETECTED INTENT     : {intent_result.intent_type.value}\n"
                    f"CONFIDENCE          : {intent_result.confidence}\n"
                    f"DETECTED BY         : {intent_result.detected_by}\n"
                    f"SELECTED TOOL       : {'ExplainConceptTool' if intent_result.intent_type.value == 'explain_concept' else intent_result.intent_type.value}\n"
                    f"INTENT PARAMS       : {params}\n"
                    f"================================"
                )

            return {
                "intent_type": intent_result.intent_type.value,
                "intent_params": params
            }
        except Exception as e:
            logger.error(f"detect_intent_node failed: {e}")
            return {
                "intent_type": IntentType.GENERAL_CHAT.value,
                "intent_params": {},
                "error": f"Intent detection failed: {e}"
            }

    async def run_explain_node(self, state: MentorState) -> dict:
        """Node: Execute ExplainConceptTool with domain awareness and roadmap context injection."""
        fallback = self._check_roadmap_fallback(state)
        if fallback:
            return fallback

        try:
            tool = self.registry.get("explain_concept")
            if tool is None:
                raise ValueError("ExplainConceptTool is not registered.")

            params = state.get("intent_params", {})
            raw_concept = params.get("concept", state["user_input"])

            # Strip common prefixes ("Explain this subtopic: X" → "X")
            concept = clean_concept(raw_concept)

            level = params.get("level", state.get("student_level", "intermediate"))

            # Inject student roadmap context as priority context
            ctx = state.get("student_context") or {}
            active_topic = ctx.get("current_active_topic_name")
            career_goal = ctx.get("career_goal")
            roadmap_name = ctx.get("roadmap_name")

            # Resolve current topic references if active topic exists
            concept_lower = concept.lower().strip()
            if concept_lower in {
                "my current topic", "current topic", "active topic",
                "explain my current topic", "explain current topic",
                "this subtopic", "this topic", "current active topic"
            }:
                if active_topic:
                    concept = active_topic

            roadmap_context_parts = []
            if roadmap_name:
                roadmap_context_parts.append(f"Roadmap: {roadmap_name}")
            if career_goal:
                roadmap_context_parts.append(f"Career Goal: {career_goal}")
            if active_topic:
                roadmap_context_parts.append(f"Current Active Topic: {active_topic}")
            roadmap_context = "\n".join(roadmap_context_parts) or None

            logger.info(
                f"[run_explain_node] Concept: '{concept}' | Level: {level} | "
                f"Active Topic: {active_topic or 'N/A'}"
            )
            result = await tool.ainvoke({
                "concept": concept,
                "level": level,
                "context": None,  # Conversation history not needed; roadmap_context is priority
                "roadmap_context": roadmap_context,
            })
            return {"tool_result": result, "error": None}
        except Exception as e:
            logger.error(f"run_explain_node failed: {e}")
            return {"tool_result": f"Error explaining concept: {e}", "error": str(e)}

    async def run_quiz_node(self, state: MentorState) -> dict:
        """Node: Execute QuizAgent."""
        fallback = self._check_roadmap_fallback(state)
        if fallback:
            return fallback

        try:
            params = state.get("intent_params", {})
            topic = params.get("topic", state["user_input"][:50])
            n = min(params.get("num_questions", 3), 5)
            diff = params.get("difficulty", state.get("student_level", "intermediate"))

            ctx = state.get("student_context") or {}
            active_topic = ctx.get("current_active_topic_name")

            # Resolve generic quiz requests to the active topic if possible
            topic_lower = topic.lower().strip()
            if topic_lower in {
                "quiz me", "quiz", "test me", "test my knowledge",
                "create questions", "practice questions", "generate quiz",
                "quiz on current topic", "quiz on active topic", "quiz on current active topic"
            }:
                if active_topic:
                    topic = active_topic

            # Map standard string difficulty to DifficultyLevel enum
            from app.mentor.schemas.quiz import DifficultyLevel
            try:
                diff_enum = DifficultyLevel(diff.lower())
            except ValueError:
                diff_enum = DifficultyLevel.INTERMEDIATE

            logger.info(f"[run_quiz_node] Topic: '{topic}' | Questions: {n} | Difficulty: {diff_enum}")
            quiz = await self.quiz_agent.generate_quiz(topic=topic, difficulty=diff_enum, n_questions=n)
            return {"tool_result": quiz.format_for_display(), "error": None}
        except Exception as e:
            logger.error(f"run_quiz_node failed: {e}")
            return {"tool_result": f"Error generating quiz: {e}", "error": str(e)}



    async def run_summarize_node(self, state: MentorState) -> dict:
        """Node: Execute SummarizeTextTool."""
        fallback = self._check_roadmap_fallback(state)
        if fallback:
            return fallback

        try:
            tool = self.registry.get("summarize_text")
            if tool is None:
                raise ValueError("SummarizeTextTool is not registered.")

            params = state.get("intent_params", {})
            text = params.get("text", state["user_input"])
            style = params.get("style", "brief")

            logger.info(f"[run_summarize_node] Summarizing {len(text)} chars with style: {style}")
            result = await tool.ainvoke({"text": text, "style": style})
            return {"tool_result": result, "error": None}
        except Exception as e:
            logger.error(f"run_summarize_node failed: {e}")
            return {"tool_result": f"Error summarizing text: {e}", "error": str(e)}

    async def run_rag_node(self, state: MentorState) -> dict:
        """Node: Run RAGPipeline for document-search questions."""
        fallback = self._check_roadmap_fallback(state)
        if fallback:
            return fallback

        try:
            params = state.get("intent_params", {})
            question = params.get("question", state["user_input"])
            logger.info(f"[run_rag_node] Query: '{question[:50]}'")
            
            result = await self.rag_pipeline.aquery(question)
            return {"tool_result": result.answer, "rag_context": result.sources, "error": None}
        except Exception as e:
            logger.error(f"run_rag_node failed: {e}")
            return {"tool_result": f"RAG Query failed: {e}", "error": str(e)}

    async def run_roadmap_help_node(self, state: MentorState) -> dict:
        """Node: Execute HelpFromRoadmapTool querying MongoDB progress."""
        fallback = self._check_roadmap_fallback(state)
        if fallback:
            return fallback

        try:
            tool = self.registry.get("help_from_roadmap")
            if tool is None:
                raise ValueError("HelpFromRoadmapTool is not registered.")

            params = state.get("intent_params", {})
            question = params.get("question", state["user_input"])
            
            ctx = state.get("student_context") or {}
            
            roadmap_topic = params.get("roadmap_topic")
            if not roadmap_topic:
                roadmap_topic = ctx.get("current_active_topic_name") or "General"

            completed = params.get("completed_topics")
            if not completed:
                completed = ctx.get("completed_topics", [])

            level = params.get("student_level", state.get("student_level", "intermediate"))
            user_id = state.get("user_id")

            logger.info(f"[run_roadmap_help_node] Query: '{question[:50]}' | user_id: {user_id}")
            result = await tool.ainvoke({
                "question": question,
                "roadmap_topic": roadmap_topic,
                "student_level": level,
                "completed_topics": completed,
                "user_id": user_id
            })
            return {"tool_result": result, "error": None}
        except Exception as e:
            logger.error(f"run_roadmap_help_node failed: {e}")
            return {"tool_result": f"Roadmap guidance failed: {e}", "error": str(e)}

    async def run_pdf_node(self, state: MentorState) -> dict:
        """Node: PDF Q&A querying the PDF learning agent."""
        fallback = self._check_roadmap_fallback(state)
        if fallback:
            return fallback

        try:
            params = state.get("intent_params", {})
            question = params.get("question", state["user_input"])
            user_id = state.get("user_id") or "default"
            logger.info(f"[run_pdf_node] Query: '{question[:50]}' | user_id: {user_id}")

            question_lower = question.lower().strip()
            
            # Check 1: Summarize / "What is this PDF about?"
            if "about this pdf" in question_lower or "what is this pdf about" in question_lower or "summarize this pdf" in question_lower or "summarize this document" in question_lower:
                summary = await self.pdf_agent.summarize(user_id=user_id)
                
                # Check roadmap comparison context
                roadmap_info = await self.pdf_agent.compare_to_roadmap(state.get("student_context"), user_id=user_id)
                if roadmap_info:
                    summary = f"{roadmap_info}\n\n{summary}"
                return {"tool_result": summary, "error": None}
                
            # Check 2: Create notes / "Create notes"
            if "create notes" in question_lower or "generate notes" in question_lower or "revision notes" in question_lower or "notes from this pdf" in question_lower or "notes from this document" in question_lower:
                notes = await self.pdf_agent.generate_revision_notes(user_id=user_id)
                return {"tool_result": notes, "error": None}
                
            # Check 3: Quiz me / "Quiz me from this PDF"
            if "quiz me" in question_lower or "test me" in question_lower or "generate quiz" in question_lower:
                concepts = await self.pdf_agent.extract_key_concepts(n=3, user_id=user_id)
                topic = concepts[0] if concepts else "Document Content"
                
                # Ground QuizAgent temporarily in the PDF vector store manager
                original_vsm = self.quiz_agent.vsm
                from app.mentor.vectorstore.manager import VectorStoreManager
                pdf_vsm = VectorStoreManager(self.pdf_agent.em, collection_name="pdf_learning")
                self.quiz_agent.vsm = pdf_vsm
                
                # Secure PDF Quiz search filter
                active_doc_id = self.pdf_agent._active_doc_ids.get(user_id)
                pdf_where = {
                    "$and": [
                        {"doc_id": {"$eq": active_doc_id}},
                        {"user_id": {"$eq": user_id}}
                    ]
                } if active_doc_id else None
                
                try:
                    quiz = await self.quiz_agent.generate_quiz(
                        topic=topic,
                        n_questions=3,
                        where=pdf_where
                    )
                    return {"tool_result": quiz.format_for_display(), "error": None}
                finally:
                    self.quiz_agent.vsm = original_vsm

            # Check 4: Regular Q&A
            res = await self.pdf_agent.ask(question, user_id=user_id)
            return {"tool_result": res["answer"], "error": None}
            
        except Exception as e:
            logger.error(f"run_pdf_node failed: {e}")
            return {"tool_result": f"PDF query failed: {e}", "error": str(e)}

    async def run_youtube_node(self, state: MentorState) -> dict:
        """Node: YouTube Q&A querying the YouTube learning agent."""
        fallback = self._check_roadmap_fallback(state)
        if fallback:
            return fallback

        try:
            user_id = state.get("user_id")
            params = state.get("intent_params", {})
            question = params.get("question", state["user_input"])
            logger.info(f"[run_youtube_node] Query: '{question[:50]}'")

            question_lower = question.lower()
            if "youtube.com" in question_lower or "youtu.be" in question_lower:
                # Call standardized summary method which internally handles loading
                summary = await self.yt_agent.summarize(url=question, user_id=user_id)
                
                # Get roadmap alignment info
                roadmap_info = await self.yt_agent.compare_to_roadmap(state.get("student_context"), user_id=user_id)
                if roadmap_info:
                    result_text = f"{roadmap_info}\n\n{summary}"
                else:
                    result_text = summary
                    
                return {"tool_result": result_text, "error": None}

            # Call standardized Q&A method
            res = await self.yt_agent.ask(url=None, question=question, user_id=user_id)
            return {"tool_result": res["answer"], "error": None}
        except Exception as e:
            logger.error(f"run_youtube_node failed: {e}")
            return {"tool_result": f"YouTube video processing failed: {e}", "error": str(e)}

    async def run_weakness_diagnosis_node(self, state: MentorState) -> dict:
        """Node: Weakness diagnosis using WeaknessAnalyzerAgent."""
        try:
            user_id = state.get("user_id")
            logger.info(f"[run_weakness_diagnosis_node] Diagnosing user_id: {user_id}")
            
            # Fetch / build learning profile
            from app.mentor.intelligence.learning_profile import LearningProfileBuilder
            profile = await LearningProfileBuilder.build_and_save_profile(user_id)
            
            diagnosis = await self.weakness_agent.diagnose(profile)
            return {"tool_result": diagnosis, "error": None}
        except Exception as e:
            logger.error(f"run_weakness_diagnosis_node failed: {e}")
            return {"tool_result": f"Diagnosis failed: {e}", "error": str(e)}

    async def run_revision_plan_node(self, state: MentorState) -> dict:
        """Node: Revision planning using RevisionPlannerAgent."""
        try:
            user_id = state.get("user_id")
            logger.info(f"[run_revision_plan_node] Generating revision plan for user_id: {user_id}")
            
            # Fetch / build learning profile
            from app.mentor.intelligence.learning_profile import LearningProfileBuilder
            profile = await LearningProfileBuilder.build_and_save_profile(user_id)
            
            plan = await self.revision_agent.generate_plan(profile, state.get("student_context"))
            return {"tool_result": plan, "error": None}
        except Exception as e:
            logger.error(f"run_revision_plan_node failed: {e}")
            return {"tool_result": f"Revision plan failed: {e}", "error": str(e)}




    async def direct_response_node(self, state: MentorState) -> dict:
        """Node: Handle general conversation directly using the LLM with context system prompt."""
        # NOTE: Do NOT call _check_roadmap_fallback here — general chat is always allowed.
        # Greetings like 'hi' must always reach the LLM, not be blocked.
        try:
            user_input = state["user_input"]
            logger.info(f"[direct_response_node] Chat query: '{user_input[:60]}'")

            if self.llm is None or self.llm.llm is None:
                return {"tool_result": "[Mock] General chat response — no LLM configured.", "error": None}

            # Compile dynamic context system prompt
            system_prompt = build_context_system_prompt(state.get("student_context"))

            # Build message list: system + trimmed history + current user input
            # CRITICAL: only include human messages from history as context hints,
            # never prepend raw AI responses as if they are the answer to THIS question.
            messages = [SystemMessage(content=system_prompt)]

            history = state.get("messages", [])
            # Include at most the last 6 history messages (3 full turns) for context
            recent_history = history[-6:] if len(history) > 6 else history
            messages.extend(recent_history)

            messages.append(HumanMessage(content=user_input))

            # Build prompt preview for debug log (truncated)
            prompt_preview = " | ".join(
                f"{type(m).__name__}:{m.content[:40].replace(chr(10), ' ')}"
                for m in messages
            )

            if settings.mentor_debug:
                logger.info(
                    f"\n========= MENTOR DEBUG =========\n"
                    f"FINAL PROMPT SENT TO LLM:\n  {prompt_preview[:400]}\n"
                    f"================================"
                )

            response = await self.llm.ainvoke(messages)
            answer = response.content.strip()

            if not answer or len(answer) < 50:
                logger.warning("direct_response_node: Response is still under 50 characters after quality guard check.")
                answer = "I'm sorry, I couldn't generate a complete response. Could you please ask again or try a different topic?"

            if settings.mentor_debug:
                logger.info(
                    f"\n========= MENTOR DEBUG =========\n"
                    f"LLM RESPONSE FIRST 100 CHARS: {answer[:100]}\n"
                    f"================================"
                )

            return {"tool_result": answer, "error": None}
        except Exception as e:
            logger.error(f"direct_response_node failed: {e}")
            return {
                "tool_result": "I'm having trouble responding right now. Please try again.",
                "error": str(e)
            }

    async def format_response_node(self, state: MentorState) -> dict:
        """Node: Post-process results and prepare conversational output."""
        tool_result = state.get("tool_result", "")
        error = state.get("error")

        if error:
            final = f"I encountered an issue processing your request: {error}\n\nPlease try again."
        elif not tool_result:
            final = "I'm sorry, I couldn't generate a response. Could you please rephrase?"
        else:
            final = tool_result

        return {"final_response": final}

    async def save_memory_node(self, state: MentorState) -> dict:
        """Node: Save the turn to MemoryManager."""
        try:
            session = await self.memory.get_or_create_session(state["user_id"], state["session_id"])
            if session:
                await self.memory.persist_turn(session, state["user_input"], state.get("final_response", ""))
                logger.debug(f"[save_memory_node] Saved turn for session: {state['session_id']}")
            return {}
        except Exception as e:
            logger.error(f"save_memory_node failed: {e}")
            return {}
