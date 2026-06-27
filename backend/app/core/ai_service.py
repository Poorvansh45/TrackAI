"""
AI Service - Tracks AI
=======================
The ONE import that every agent, endpoint, and service uses.
Fully async — no sync wrappers, no run_until_complete().

Usage:
    from app.core.ai_service import ai_service, prompts, Task

    # Await directly (agents, endpoints, services — all async)
    result = await ai_service.generate_structured(
        task=Task.ROADMAP_GENERATION,
        prompt=prompts.roadmap(prerequisite_result),
        schema=RoadmapOutput,
    )

    text = await ai_service.generate(
        task=Task.RE_EXPLAIN,
        prompt=prompts.explain(topic, mode),
    )
"""
from __future__ import annotations

from app.core.llm.gateway import LLMGateway
from app.core.prompts.manager import PromptManager
from app.core.llm.config import Task, Provider, Model

# Singletons — instantiated once at import time
_gateway = LLMGateway()
_prompts = PromptManager()


class AIService:
    """Thin async wrapper wiring the gateway and prompt manager together."""

    def __init__(self, gateway: LLMGateway, prompt_manager: PromptManager) -> None:
        self.gateway = gateway
        self.prompts = prompt_manager

    async def generate(self, task: str, prompt: str, use_cache: bool = True) -> str:
        """Generate plain text. Always await this."""
        return await self.gateway.generate(task=task, prompt=prompt, use_cache=use_cache)

    async def generate_structured(self, task: str, prompt: str, schema, use_cache: bool = True):
        """Generate structured Pydantic output. Always await this."""
        return await self.gateway.generate_structured(
            task=task, prompt=prompt, schema=schema, use_cache=use_cache
        )


# Public singletons
ai_service = AIService(gateway=_gateway, prompt_manager=_prompts)
prompts = _prompts

__all__ = ["ai_service", "prompts", "Task", "Provider", "Model"]
