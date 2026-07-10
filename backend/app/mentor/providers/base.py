import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import AsyncIterator, List, Optional, Union
from pydantic import BaseModel, Field, field_validator
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage
from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    InternalServerError,
    NotFoundError,
    RateLimitError,
)

logger = logging.getLogger("mentor.providers")

class LLMProvider(str, Enum):
    """Supported LLM providers for Mentor AI."""
    OPENAI = "openai"
    AZURE_OPENAI = "azure"


class OpenAIConfig(BaseModel):
    """Configuration for OpenAI provider."""
    api_key: str
    model: str = "gpt-4o-mini"
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, gt=0)
    max_retries: int = Field(default=2, ge=0)
    timeout: int = Field(default=60, gt=0)

    @field_validator("api_key")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        if not v:
            raise ValueError("OpenAI API key cannot be empty")
        return v

    model_config = {"frozen": True}


class AzureOpenAIConfig(BaseModel):
    """Configuration for Azure OpenAI provider."""
    api_key: str
    azure_endpoint: str
    api_version: str = "2024-02-15-preview"
    deployment_name: str
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, gt=0)
    max_retries: int = Field(default=2, ge=0)
    timeout: int = Field(default=60, gt=0)

    @field_validator("azure_endpoint")
    @classmethod
    def validate_endpoint(cls, v: str) -> str:
        if not v.startswith("https://"):
            raise ValueError("Azure endpoint must start with https://")
        return v.rstrip("/")

    @field_validator("deployment_name")
    @classmethod
    def validate_deployment(cls, v: str) -> str:
        if not v:
            raise ValueError("Azure deployment name cannot be empty")
        return v

    model_config = {"frozen": True}


@dataclass
class LLMMetrics:
    """Tracks LLM usage for cost monitoring and billing."""
    total_requests: int = 0
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    total_errors: int = 0

    _INPUT_COST_PER_1M: float = field(default=0.150, init=False, repr=False)
    _OUTPUT_COST_PER_1M: float = field(default=0.600, init=False, repr=False)

    @property
    def total_tokens(self) -> int:
        return self.total_prompt_tokens + self.total_completion_tokens

    @property
    def estimated_cost_usd(self) -> float:
        """Rough cost estimate for gpt-4o-mini."""
        i = self.total_prompt_tokens * self._INPUT_COST_PER_1M / 1_000_000
        o = self.total_completion_tokens * self._OUTPUT_COST_PER_1M / 1_000_000
        return i + o

    @property
    def error_rate(self) -> float:
        total = self.total_requests + self.total_errors
        return self.total_errors / total if total else 0.0

    def update_from_response(self, response: AIMessage) -> None:
        self.total_requests += 1
        usage = response.response_metadata.get("token_usage", {})
        self.total_prompt_tokens += usage.get("prompt_tokens", 0)
        self.total_completion_tokens += usage.get("completion_tokens", 0)

    def record_error(self) -> None:
        self.total_errors += 1

    def __str__(self) -> str:
        return (
            f"Requests={self.total_requests} | "
            f"Tokens={self.total_tokens:,} | "
            f"Cost=${self.estimated_cost_usd:.4f} | "
            f"Errors={self.total_errors} ({self.error_rate:.1%})"
        )


def safe_invoke(
    llm: BaseChatModel,
    messages: List[BaseMessage],
    fallback_llm: Optional[BaseChatModel] = None,
    max_retries: int = 3,
    retry_delay: float = 1.0,
) -> AIMessage:
    """Production-safe LLM invocation with retry logic and fallback support."""
    last_error = None

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"LLM invoke attempt {attempt}/{max_retries}")
            response = llm.invoke(messages)
            logger.info("LLM invoke succeeded")
            return response

        except AuthenticationError:
            logger.error("Authentication failed. Check your API key immediately.")
            raise

        except BadRequestError as e:
            logger.error(f"Bad request: {e}. Check prompt format and token limits.")
            raise

        except RateLimitError as e:
            last_error = e
            wait_time = retry_delay * (2 ** (attempt - 1))
            logger.warning(f"Rate limit. Waiting {wait_time:.1f}s before retry {attempt}.")
            time.sleep(wait_time)

        except (APITimeoutError, APIConnectionError) as e:
            last_error = e
            logger.warning(f"Connection issue on attempt {attempt}: {type(e).__name__}")
            if attempt < max_retries:
                time.sleep(retry_delay)

        except InternalServerError as e:
            last_error = e
            logger.warning(f"Provider server error on attempt {attempt}. Retrying.")
            time.sleep(retry_delay)

        except APIError as e:
            last_error = e
            if hasattr(e, "status_code") and e.status_code and e.status_code >= 500:
                logger.warning(f"Server error {e.status_code}. Retrying.")
                time.sleep(retry_delay)
            else:
                raise

    if fallback_llm is not None:
        logger.warning("Primary LLM failed after all retries. Switching to fallback.")
        try:
            response = fallback_llm.invoke(messages)
            logger.info("Fallback LLM succeeded.")
            return response
        except Exception as fallback_error:
            logger.error(f"Fallback LLM also failed: {fallback_error}")
            raise fallback_error

    logger.error(f"All {max_retries} attempts failed. Last: {last_error}")
    raise last_error


class MentorLLM:
    """
    Production-ready LLM interface wrapping a BaseChatModel with metrics,
    retry error handling, and optional fallback support.
    """
    def __init__(
        self,
        llm: BaseChatModel,
        fallback_llm: Optional[BaseChatModel] = None,
        provider: LLMProvider = LLMProvider.OPENAI
    ):
        self._llm = llm
        self._fallback_llm = fallback_llm
        self.provider = provider
        self.metrics = LLMMetrics()
        self._logger = logging.getLogger(f"mentor.providers.llm.{self.provider.value}")

    def invoke(self, messages: List[BaseMessage]) -> AIMessage:
        try:
            response = safe_invoke(
                llm=self._llm,
                messages=messages,
                fallback_llm=self._fallback_llm,
            )
            self.metrics.update_from_response(response)
            return response
        except Exception as e:
            self.metrics.record_error()
            self._logger.error(f"invoke() failed: {e}")
            raise

    async def ainvoke(self, messages: List[BaseMessage]) -> AIMessage:
        try:
            try:
                response = await self._llm.ainvoke(messages)
                
                # Check response quality guard (retry once if too short / empty)
                if hasattr(response, "content") and isinstance(response.content, str):
                    content = response.content.strip()
                    # Skip checking for structured output format (which can be short or list/dict-like)
                    is_structured_output = (
                        len(messages) > 0 
                        and isinstance(messages[-1].content, str) 
                        and "classify" in messages[-1].content.lower()
                    )
                    if (not content or len(content) < 50) and not is_structured_output:
                        logger.warning(f"Response too short ({len(content)} chars). Retrying primary LLM invoke once.")
                        response = await self._llm.ainvoke(messages)
                        
                self.metrics.update_from_response(response)
                return response
            except Exception as e:
                self.metrics.record_error()
                self._logger.error(f"Primary async invoke failed: {e}")
                if self._fallback_llm:
                    self._logger.warning("Falling back to secondary LLM provider.")
                    response = await self._fallback_llm.ainvoke(messages)
                    
                    # Apply retry guard to fallback LLM too
                    if hasattr(response, "content") and isinstance(response.content, str):
                        content = response.content.strip()
                        is_structured_output = (
                            len(messages) > 0 
                            and isinstance(messages[-1].content, str) 
                            and "classify" in messages[-1].content.lower()
                        )
                        if (not content or len(content) < 50) and not is_structured_output:
                            logger.warning(f"Fallback response too short ({len(content)} chars). Retrying fallback LLM invoke once.")
                            response = await self._fallback_llm.ainvoke(messages)
                            
                    self.metrics.update_from_response(response)
                    return response
                raise
        except Exception as e:
            self.metrics.record_error()
            self._logger.error(f"ainvoke() failed: {e}")
            raise

    def stream(self, messages: List[BaseMessage]):
        return self._llm.stream(messages)

    async def astream(self, messages: List[BaseMessage]) -> AsyncIterator:
        """Stream tokens from primary LLM; fall back to secondary on deployment/provider errors."""
        try:
            async for chunk in self._llm.astream(messages):
                yield chunk
        except Exception as e:
            self.metrics.record_error()
            self._logger.error(f"Primary stream failed: {e}")
            if self._fallback_llm:
                self._logger.warning("Falling back to secondary LLM provider during streaming.")
                async for chunk in self._fallback_llm.astream(messages):
                    yield chunk
            else:
                raise

    def get_metrics(self) -> LLMMetrics:
        return self.metrics

    def reset_metrics(self) -> None:
        self.metrics = LLMMetrics()
        self._logger.info("Metrics reset.")

    @property
    def llm(self) -> BaseChatModel:
        return self._llm

    def __repr__(self) -> str:
        model = getattr(self._llm, "model_name", "unknown")
        return f"MentorLLM(provider={self.provider.value!r}, model={model!r})"
