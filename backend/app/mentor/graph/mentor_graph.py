import asyncio
import logging
import time
from typing import AsyncIterator, Dict, Any, Optional

from app.core.config import settings
from app.mentor.observability.tracer import create_run_config
from app.mentor.observability.cost_tracker import (
    log_usage,
    extract_token_usage,
    get_model_name_from_llm,
    get_provider_name_from_llm,
)

from langchain_core.messages import SystemMessage, HumanMessage

from app.mentor.graph.state import MentorState
from app.mentor.graph.nodes import NodeProvider
from app.mentor.router.detector import IntentType
from app.mentor.memory.manager import MemoryManager
from app.mentor.vectorstore.manager import VectorStoreManager
from app.mentor.tools.registry import ToolRegistry
from app.mentor.rag.pipeline import RAGPipeline
from app.mentor.agents.youtube_agent import YouTubeLearningAgent
from app.mentor.agents.pdf_agent import PDFLearningAgent
from app.mentor.agents.quiz_agent import QuizAgent
from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.graph")

try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    END = "__end__"


class MentorGraph:
    """
    Main orchestration class for the Mentor AI StateGraph.
    Coordinates all agents, tools, memory managers, and RAG pipelines.
    """

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
        default_student_level: str = "intermediate",
    ) -> None:
        self.llm = llm
        self.memory = memory_manager
        self.vsm = vector_store_manager
        self.registry = tool_registry
        self.rag_pipeline = rag_pipeline
        self.yt_agent = yt_agent
        self.pdf_agent = pdf_agent
        self.quiz_agent = quiz_agent
        self.default_level = default_student_level

        # Instantiate node provider
        self.provider = NodeProvider(
            llm=llm,
            memory_manager=memory_manager,
            vector_store_manager=vector_store_manager,
            tool_registry=tool_registry,
            rag_pipeline=rag_pipeline,
            yt_agent=yt_agent,
            pdf_agent=pdf_agent,
            quiz_agent=quiz_agent,
        )

        # Build and compile graph
        self._compiled_graph = self._build_graph()

    def _build_graph(self) -> Optional[Any]:
        """Compile the LangGraph workflow if available, else return None."""
        if not LANGGRAPH_AVAILABLE:
            logger.warning("langgraph is not installed. MentorGraph will run in sequential fallback mode.")
            return None

        try:
            workflow = StateGraph(MentorState)

            # Register all nodes
            workflow.add_node("load_memory", self.provider.load_memory_node)
            workflow.add_node("detect_intent", self.provider.detect_intent_node)
            workflow.add_node("run_explain", self.provider.run_explain_node)
            workflow.add_node("run_quiz", self.provider.run_quiz_node)
            workflow.add_node("run_summarize", self.provider.run_summarize_node)
            workflow.add_node("run_roadmap_help", self.provider.run_roadmap_help_node)
            workflow.add_node("run_pdf", self.provider.run_pdf_node)
            workflow.add_node("run_youtube", self.provider.run_youtube_node)
            workflow.add_node("run_weakness_diagnosis", self.provider.run_weakness_diagnosis_node)
            workflow.add_node("run_revision_plan", self.provider.run_revision_plan_node)
            workflow.add_node("direct_response", self.provider.direct_response_node)
            workflow.add_node("format_response", self.provider.format_response_node)
            workflow.add_node("save_memory", self.provider.save_memory_node)

            # Define edges
            workflow.set_entry_point("load_memory")
            workflow.add_edge("load_memory", "detect_intent")

            # Intent router logic mapping state.intent_type to target nodes
            def route_intent(state: MentorState) -> str:
                intent = state.get("intent_type", "general_chat")
                mapping = {
                    "explain_concept": "run_explain",
                    "generate_quiz": "run_quiz",
                    "summarize_text": "run_summarize",
                    "roadmap_help": "run_roadmap_help",
                    "pdf_question": "run_pdf",
                    "youtube_question": "run_youtube",
                    "weakness_diagnosis": "run_weakness_diagnosis",
                    "revision_plan": "run_revision_plan",
                    "general_chat": "direct_response",
                }
                return mapping.get(intent, "direct_response")

            tool_nodes = [
                "run_explain", "run_quiz", "run_summarize", "run_roadmap_help",
                "run_pdf", "run_youtube", "run_weakness_diagnosis", "run_revision_plan", "direct_response"
            ]

            workflow.add_conditional_edges(
                "detect_intent",
                route_intent,
                {node: node for node in tool_nodes},
            )

            # All paths lead to formatting and then memory persistence
            for tool_node in tool_nodes:
                workflow.add_edge(tool_node, "format_response")

            workflow.add_edge("format_response", "save_memory")
            workflow.add_edge("save_memory", END)

            return workflow.compile()
        except Exception as e:
            logger.error(f"Failed to compile StateGraph: {e}. Falling back to sequential execution.")
            return None

    def _initial_state(
        self,
        user_input: str,
        user_id: str,
        session_id: Optional[str],
        student_level: Optional[str],
        current_topic: Optional[str],
        student_context: Optional[dict] = None,
    ) -> MentorState:
        """Create the initial graph state."""
        return {
            "messages": [],
            "user_id": user_id,
            "session_id": session_id or "",
            "user_input": user_input,
            "intent_type": "",
            "intent_params": {},
            "tool_result": "",
            "rag_context": "",
            "final_response": "",
            "student_level": student_level or self.default_level,
            "current_topic": current_topic or "",
            "student_context": student_context,
            "error": None,
        }

    async def _run_fallback(self, state: MentorState) -> MentorState:
        """Sequential fallback engine executing nodes in order without LangGraph dependency."""
        # 1. Load memory
        state.update(await self.provider.load_memory_node(state))
        if state.get("error"):
            return state

        # 2. Detect Intent
        state.update(await self.provider.detect_intent_node(state))

        # 3. Route to Node
        intent = state.get("intent_type", "general_chat")
        if intent == "explain_concept":
            state.update(await self.provider.run_explain_node(state))
        elif intent == "generate_quiz":
            state.update(await self.provider.run_quiz_node(state))
        elif intent == "summarize_text":
            state.update(await self.provider.run_summarize_node(state))
        elif intent == "roadmap_help":
            state.update(await self.provider.run_roadmap_help_node(state))
        elif intent == "pdf_question":
            state.update(await self.provider.run_pdf_node(state))
        elif intent == "youtube_question":
            state.update(await self.provider.run_youtube_node(state))
        elif intent == "weakness_diagnosis":
            state.update(await self.provider.run_weakness_diagnosis_node(state))
        elif intent == "revision_plan":
            state.update(await self.provider.run_revision_plan_node(state))
        else:
            state.update(await self.provider.direct_response_node(state))

        # 4. Format and save
        state.update(await self.provider.format_response_node(state))
        state.update(await self.provider.save_memory_node(state))

        return state

    async def chat(
        self,
        user_input: str,
        user_id: str,
        session_id: Optional[str] = None,
        student_level: Optional[str] = None,
        current_topic: Optional[str] = None,
        student_context: Optional[dict] = None,
    ) -> Dict[str, Any]:
        """
        Process a single chat transaction through the full state graph.
        """
        start_time = time.time()

        logger.info(
            f"[MENTOR PIPELINE] USER INPUT RECEIVED: '{user_input[:80]}' "
            f"| user_id={user_id} | session_id={session_id or 'new'} | level={student_level}"
        )

        state = self._initial_state(
            user_input=user_input,
            user_id=user_id,
            session_id=session_id,
            student_level=student_level,
            current_topic=current_topic,
            student_context=student_context,
        )

        try:
            if self._compiled_graph:
                result = await self._compiled_graph.ainvoke(state)
            else:
                result = await self._run_fallback(state)

            elapsed_ms = int((time.time() - start_time) * 1000)
            final_response = result.get("final_response", "")
            intent = result.get("intent_type", "general_chat")
            provider_repr = repr(self.llm) if self.llm else "None"

            # Check mapping for Tool name
            tool_name = "NONE"
            if intent == "explain_concept":
                tool_name = "ExplainConceptTool"
            elif intent == "generate_quiz":
                tool_name = "QuizTool"
            elif intent == "roadmap_help":
                tool_name = "HelpFromRoadmapTool"
            elif intent == "youtube_question":
                tool_name = "youtube_tool"
            elif intent == "summarize_text":
                tool_name = "SummarizeTextTool"
            elif intent == "pdf_question":
                tool_name = "PDFLearningAgent"
            elif intent == "weakness_diagnosis":
                tool_name = "WeaknessAnalyzerAgent"
            elif intent == "revision_plan":
                tool_name = "RevisionPlannerAgent"

            # ── LangSmith Tracing: pass RunnableConfig with metadata ──────────
            run_config = create_run_config(
                user_id=user_id,
                session_id=session_id,
                intent=intent,
                tool_used=tool_name if tool_name != "NONE" else None,
                student_level=student_level,
            )

            if settings.mentor_debug:
                logger.info(
                    f"\n========= MENTOR DEBUG =========\n"
                    f"Intent: {intent}\n"
                    f"Selected Tool: {tool_name}\n"
                    f"Execution Time: {elapsed_ms}ms\n"
                    f"================================"
                )

            # ── Async cost logging (non-blocking, best-effort) ────────────────
            model_name = get_model_name_from_llm(self.llm.llm if self.llm else None)
            provider_name = get_provider_name_from_llm(self.llm.llm if self.llm else None)
            asyncio.ensure_future(log_usage(
                user_id=user_id,
                model=model_name,
                provider=provider_name,
                input_tokens=0,   # token extraction from streamed responses not feasible here;
                output_tokens=0,  # usage logs capture request count + latency reliably
                tool_used=tool_name if tool_name != "NONE" else None,
                intent=intent,
                session_id=session_id,
                latency_ms=elapsed_ms,
            ))

            return {
                "response": final_response,
                "session_id": result.get("session_id", ""),
                "intent_type": intent,
                "error": result.get("error"),
                "elapsed_ms": elapsed_ms,
                "run_config": run_config,
            }

        except Exception as e:
            logger.error(f"[MENTOR PIPELINE] Graph execution failed: {e}")
            return {
                "response": "I encountered an unexpected error. Please try again.",
                "session_id": session_id or "",
                "intent_type": "error",
                "error": str(e),
                "elapsed_ms": int((time.time() - start_time) * 1000),
            }

    async def stream_chat(
        self,
        user_input: str,
        user_id: str,
        session_id: Optional[str] = None,
        student_level: Optional[str] = None,
        current_topic: Optional[str] = None,
        student_context: Optional[dict] = None,
    ) -> AsyncIterator[str]:
        """
        Stream chat responses. Tool results are yielded as a single block;
        general conversational turns are streamed token-by-token.
        """
        start_time = time.time()
        state = self._initial_state(
            user_input=user_input,
            user_id=user_id,
            session_id=session_id,
            student_level=student_level,
            current_topic=current_topic,
            student_context=student_context,
        )

        # Check onboarding fallback before streaming
        fallback = self.provider._check_roadmap_fallback(state)
        if fallback:
            yield fallback["tool_result"]
            return

        # Run setup and intent routing synchronously first
        state.update(await self.provider.load_memory_node(state))
        state.update(await self.provider.detect_intent_node(state))

        intent = state.get("intent_type", "general_chat")

        logger.info(
            f"[MENTOR PIPELINE] USER INPUT RECEIVED: '{user_input[:80]}' "
            f"| session_id={session_id or 'new'} | level={student_level}"
        )
        logger.info(f"[MENTOR PIPELINE] INTENT: {intent}")

        if intent == "general_chat":
            if self.llm and self.llm.llm:
                if settings.mentor_debug:
                    provider_repr = repr(self.llm)
                    logger.info(f"[MENTOR PIPELINE] TOOL USED: direct_llm | LLM PROVIDER USED: {provider_repr}")
                from app.mentor.graph.nodes import build_context_system_prompt
                system_prompt = build_context_system_prompt(state.get("student_context"))

                messages = [SystemMessage(content=system_prompt)]
                # Include last 6 history messages for context (capped to avoid stale context bleed)
                history = state.get("messages", [])
                recent_history = history[-6:] if len(history) > 6 else history
                messages.extend(recent_history)
                messages.append(HumanMessage(content=user_input))

                if settings.mentor_debug:
                    prompt_preview = " | ".join(
                        f"{type(m).__name__}:{m.content[:40].replace(chr(10),' ')}"
                        for m in messages
                    )
                    logger.info(
                        f"\n========= MENTOR DEBUG =========\n"
                        f"FINAL PROMPT SENT TO LLM:\n  {prompt_preview[:400]}\n"
                        f"================================"
                    )

                full_response = []
                async for chunk in self.llm.astream(messages):
                    if chunk.content:
                        full_response.append(chunk.content)
                        yield chunk.content

                joined = "".join(full_response)
                if settings.mentor_debug:
                    logger.info(
                        f"\n========= MENTOR DEBUG =========\n"
                        f"LLM RESPONSE FIRST 100 CHARS: {joined[:100]}\n"
                        f"================================"
                    )

                # Persist streamed message to history
                session = await self.memory.get_or_create_session(user_id, state["session_id"])
                if session:
                    session.add_human_message(user_input)
                    session.add_ai_message(joined)
                    await self.memory.save_session(session)

                if settings.mentor_debug:
                    elapsed_ms = int((time.time() - start_time) * 1000)
                    logger.info(
                        f"\n========= MENTOR DEBUG =========\n"
                        f"Intent: {intent}\n"
                        f"Selected Tool: NONE\n"
                        f"Execution Time: {elapsed_ms}ms\n"
                        f"================================"
                    )

            else:
                logger.error("[MENTOR PIPELINE] LLM is None — no provider configured. Cannot stream.")
                yield "I'm not connected to an AI provider right now. Please check the backend configuration."
        else:
            # For tool executions, run the graph path fully and yield the unified result
            logger.info(f"[MENTOR PIPELINE] TOOL USED: {intent}")
            result = await self.chat(
                user_input=user_input,
                user_id=user_id,
                session_id=session_id,
                student_level=student_level,
                current_topic=current_topic,
                student_context=student_context,
            )
            yield result["response"]

