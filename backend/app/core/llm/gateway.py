"""
LLM Gateway - Tracks AI
========================
Fully async. No run_until_complete(), no nested event loops.

Flow:
    FastAPI endpoint (async)
      -> await ai_service.generate(...)
         -> await gateway._generate(...)
            -> asyncio.get_running_loop().run_in_executor(sync_provider_call)
               -> LangChain .invoke() [sync, correctly isolated in thread]

Usage:
    from app.core.ai_service import ai_service, prompts, Task

    text   = await ai_service.generate(task=Task.RE_EXPLAIN, prompt=prompt)
    result = await ai_service.generate_structured(task=Task.ROADMAP_GENERATION,
                                                  prompt=prompt, schema=RoadmapOutput)
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Optional, Type

from pydantic import BaseModel
from app.core.llm.config import TASK_ROUTING, CACHE_TTL_DAYS, Provider, Model

logger = logging.getLogger("uvicorn.error")

_QUOTA_SIGNALS = ("quota", "rate limit", "429", "resource exhausted", "too many requests", "billing", "exceeded")


def _is_quota_error(exc: Exception) -> bool:
    return any(sig in str(exc).lower() for sig in _QUOTA_SIGNALS)


class LLMGateway:
    """
    Centralised async LLM dispatcher.
      - Task-based provider routing
      - MongoDB response cache
      - Immediate Groq fallback on any Gemini error (no retry loops)
      - Structured logging per invocation
    """

    async def generate(
        self,
        task: str,
        prompt: str,
        use_cache: bool = True,
    ) -> str:
        """Generate a plain-text response. Fully async — safe to await directly."""
        return await self._generate(task=task, prompt=prompt, schema=None, use_cache=use_cache)

    async def generate_structured(
        self,
        task: str,
        prompt: str,
        schema: Type[BaseModel],
        use_cache: bool = True,
    ) -> Any:
        """Generate a Pydantic-validated response. Fully async — safe to await directly."""
        return await self._generate(task=task, prompt=prompt, schema=schema, use_cache=use_cache)

    # ------------------------------------------------------------------
    # Core implementation
    # ------------------------------------------------------------------

    async def _generate(
        self,
        task: str,
        prompt: str,
        schema: Optional[Type[BaseModel]],
        use_cache: bool,
    ) -> Any:
        route = TASK_ROUTING.get(task)
        if route is None:
            raise ValueError(f"Unknown task: {task!r}. Register it in app/core/llm/config.py")

        ttl_days = CACHE_TTL_DAYS.get(task, 0)

        # ── 1. Cache check ──────────────────────────────────────────────
        if use_cache and ttl_days > 0:
            from app.core.llm.cache import cache_get
            cached = await cache_get(task=task, prompt=prompt, ttl_days=ttl_days)
            if cached is not None:
                logger.info("[AIGateway] CACHE HIT task=%s", task)
                if schema is not None and isinstance(cached, dict):
                    return schema(**cached)
                return cached

        # ── 2. Resolve primary provider ─────────────────────────────────
        from app.core.llm.router import get_provider_for_task, get_groq_fallback

        primary_provider, primary_route = get_provider_for_task(task)
        actual_provider_name = primary_route["provider"]
        actual_model = primary_route["model"]
        t_start = time.perf_counter()

        # ── 3. Attempt primary provider ─────────────────────────────────
        # LangChain .invoke() is synchronous — run it in a thread pool
        # executor using get_running_loop() which is safe from any async context.
        loop = asyncio.get_running_loop()
        result = None
        try:
            result = await loop.run_in_executor(
                None,
                self._invoke_provider,
                primary_provider, prompt, schema, primary_route["max_tokens"],
            )
            logger.info(
                "[AIGateway] task=%s provider=%s model=%s cache_hit=false fallback=false elapsed_ms=%.0f",
                task, actual_provider_name, actual_model,
                (time.perf_counter() - t_start) * 1000,
            )
        except Exception as primary_exc:
            logger.warning(
                "[AIGateway] Primary %s failed for task=%s (quota=%s): %s",
                actual_provider_name, task, _is_quota_error(primary_exc), primary_exc,
            )

            # ── 4. Immediate Groq fallback — one attempt, no retry ──────
            if actual_provider_name == Provider.GEMINI:
                groq_fallback = get_groq_fallback(max_tokens=primary_route["max_tokens"])
                if groq_fallback:
                    actual_provider_name = Provider.GROQ
                    actual_model = Model.GROQ_LLAMA_8B
                    try:
                        result = await loop.run_in_executor(
                            None,
                            self._invoke_provider,
                            groq_fallback, prompt, schema, primary_route["max_tokens"],
                        )
                        logger.info(
                            "[AIGateway] task=%s provider=groq(fallback) model=%s elapsed_ms=%.0f",
                            task, actual_model,
                            (time.perf_counter() - t_start) * 1000,
                        )
                    except Exception as fallback_exc:
                        logger.error("[AIGateway] Groq fallback also failed for task=%s: %s", task, fallback_exc)
                        raise RuntimeError(
                            f"All providers failed for task={task}. "
                            f"Primary: {primary_exc}. Fallback: {fallback_exc}"
                        ) from fallback_exc
                else:
                    raise RuntimeError(
                        f"Gemini failed and Groq not configured. Set GROQ_API_KEY. Error: {primary_exc}"
                    ) from primary_exc
            else:
                raise  # Groq was primary and failed — no further fallback

        # ── 5. Cache the result ─────────────────────────────────────────
        if use_cache and ttl_days > 0 and result is not None:
            from app.core.llm.cache import cache_set
            cache_value = result.model_dump() if hasattr(result, "model_dump") else result
            await cache_set(task=task, prompt=prompt, value=cache_value)

        return result

    # ------------------------------------------------------------------
    # Sync provider invocation — runs inside run_in_executor thread
    # ------------------------------------------------------------------

    @staticmethod
    def _invoke_provider(
        provider,
        prompt: str,
        schema: Optional[Type[BaseModel]],
        max_tokens: int,
    ) -> Any:
        """
        Pure synchronous call to the LangChain provider.
        Must NOT use asyncio here — this runs in a thread pool executor.
        """
        if schema is not None:
            return provider.generate_structured(prompt=prompt, schema=schema, max_tokens=max_tokens)
        return provider.generate(prompt=prompt, max_tokens=max_tokens)
