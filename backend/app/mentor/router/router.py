import logging
import time
from typing import Dict, Any, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage

from app.mentor.schemas.chat import RouterResponse, IntentResult, IntentType
from app.mentor.router.detector import IntentDetector
from app.mentor.tools.registry import ToolRegistry
from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.router")

class ChatRouter:
    """
    Routes user messages to the appropriate tool or direct LLM response.
    """

    GENERAL_CHAT_SYSTEM = """You are Mentor, the friendly AI tutor for Tracks AI.
You help students learn programming and AI concepts.
For general questions and greetings, be warm and encouraging.
Gently guide students toward asking specific learning questions.
Keep responses concise (under 100 words)."""

    def __init__(
        self,
        llm: MentorLLM,
        registry: ToolRegistry,
        detector: Optional[IntentDetector] = None,
    ) -> None:
        self._llm = llm
        self._registry = registry
        self._detector = detector or IntentDetector(llm=llm)

    async def route(
        self,
        user_input: str,
        chat_history: Optional[List[BaseMessage]] = None,
        session_meta: Optional[Dict[str, Any]] = None,
    ) -> RouterResponse:
        """
        Route a user message to the appropriate handler.
        """
        start_time = time.time()

        # 1. Detect intent
        intent = await self._detector.detect(user_input, chat_history)
        logger.info(f"Detected intent: {intent}")

        # 2. Inject session metadata into tool params
        if session_meta:
            self._inject_session_meta(intent, session_meta)

        # 3. Route to tool or direct LLM
        if intent.requires_tool:
            content = await self._execute_tool(intent, user_input)
            tool_used = intent.tool_name
        else:
            content = await self._general_chat(user_input, chat_history)
            tool_used = None

        elapsed_ms = int((time.time() - start_time) * 1000)

        response = RouterResponse(
            content=content,
            intent_type=intent.intent_type.value,
            tool_used=tool_used,
            confidence=intent.confidence,
            detected_by=intent.detected_by,
            processing_ms=elapsed_ms,
        )
        logger.info(f"Router response generated in {elapsed_ms}ms: {response}")
        return response

    async def _execute_tool(self, intent: IntentResult, original_input: str) -> str:
        """Execute the tool selected by intent detection."""
        tool = self._registry.get(intent.tool_name)
        if tool is None:
            logger.error(f"Tool {intent.tool_name!r} not found in registry. Falling back to chat.")
            return await self._general_chat(original_input)

        try:
            logger.info(f"Executing tool {intent.tool_name} with params: {intent.tool_params}")
            result = await tool.ainvoke(intent.tool_params)
            return result
        except Exception as e:
            logger.error(f"Tool {intent.tool_name} failed: {e}. Falling back to chat.")
            return await self._general_chat(original_input)

    async def _general_chat(
        self,
        user_input: str,
        chat_history: Optional[List[BaseMessage]] = None,
    ) -> str:
        """Handle general conversation without a specific tool."""
        if self._llm is None or self._llm.llm is None:
            return "[Mock] General chat response."

        messages: List[BaseMessage] = [SystemMessage(content=self.GENERAL_CHAT_SYSTEM)]
        if chat_history:
            messages.extend(chat_history[-6:])  # last 3 turns
        messages.append(HumanMessage(content=user_input))

        try:
            response = await self._llm.ainvoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"General chat failed: {e}")
            return "I'm having trouble responding right now. Please try again."

    def _inject_session_meta(self, intent: IntentResult, meta: Dict[str, Any]) -> None:
        """Inject session metadata into tool params when relevant."""
        if "student_level" in meta and "level" in intent.tool_params:
            intent.tool_params.setdefault("level", meta["student_level"])
        if "current_topic" in meta and intent.intent_type == IntentType.ROADMAP_HELP:
            intent.tool_params.setdefault("roadmap_topic", meta["current_topic"])
        if "completed_topics" in meta and intent.intent_type == IntentType.ROADMAP_HELP:
            intent.tool_params.setdefault("completed_topics", meta["completed_topics"])
