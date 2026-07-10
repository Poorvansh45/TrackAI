import logging
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_core.embeddings import Embeddings
from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

from app.mentor.config.settings import Settings, get_settings

logger = logging.getLogger("mentor.embeddings")

class EmbeddingProvider(str, Enum):
    OPENAI = "openai"
    AZURE = "azure"
    HUGGINGFACE = "huggingface"


class EmbeddingConfig(BaseModel):
    """Configuration schema for Embeddings."""
    provider: EmbeddingProvider = EmbeddingProvider.OPENAI
    model: str = "text-embedding-3-small"
    dimensions: Optional[int] = 1536
    api_key: Optional[str] = None
    azure_endpoint: Optional[str] = None
    api_version: Optional[str] = "2024-02-15-preview"
    deployment_name: Optional[str] = None


class MockEmbeddings(Embeddings):
    """Fallback mock embeddings when no API key is present (useful for tests/local dev)."""
    
    def __init__(self, dimensions: int = 1536) -> None:
        self.dimensions = dimensions

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        # Return deterministic mock vectors based on text length
        return [[float(len(t) % (i + 1)) / (i + 1) for i in range(self.dimensions)] for t in texts]

    def embed_query(self, text: str) -> List[float]:
        return [float(len(text) % (i + 1)) / (i + 1) for i in range(self.dimensions)]


class EmbeddingManager:
    """
    Manages embedding model creation and decoupling of provider specific APIs.
    """

    def __init__(self, config: Optional[EmbeddingConfig] = None, **kwargs) -> None:
        if config is not None:
            self.config = config
        elif kwargs:
            provider_str = kwargs.get("provider", "openai")
            self.config = EmbeddingConfig(
                provider=EmbeddingProvider(provider_str),
                model=kwargs.get("model", "text-embedding-3-small"),
                dimensions=kwargs.get("dimensions", 1536),
                api_key=kwargs.get("api_key"),
            )
        else:
            self.config = self._load_config_from_settings()
        self._embeddings = self._build_embeddings()
        self._query_cache = {}
        self._doc_cache = {}
        logger.info(f"Initialized EmbeddingManager | provider={self.config.provider.value} | model={self.config.model}")

    def _load_config_from_settings(self) -> EmbeddingConfig:
        settings = get_settings()
        provider = EmbeddingProvider(settings.embedding_provider)
        
        return EmbeddingConfig(
            provider=provider,
            model=settings.embedding_model,
            dimensions=settings.embedding_dimensions,
            api_key=settings.azure_openai_api_key if provider == EmbeddingProvider.AZURE else settings.openai_api_key,
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
            deployment_name=settings.azure_openai_embedding_dep,
        )

    def _build_embeddings(self) -> Embeddings:
        """Build the LangChain Embeddings instance based on config."""
        try:
            if self.config.provider == EmbeddingProvider.OPENAI:
                if not self.config.api_key:
                    logger.warning("OPENAI_API_KEY missing. Falling back to MockEmbeddings.")
                    return MockEmbeddings(dimensions=self.config.dimensions or 1536)
                
                return OpenAIEmbeddings(
                    api_key=self.config.api_key,
                    model=self.config.model,
                    dimensions=self.config.dimensions
                )
            
            elif self.config.provider == EmbeddingProvider.AZURE:
                if not self.config.api_key or not self.config.azure_endpoint:
                    logger.warning("Azure OpenAI Embeddings credentials missing. Falling back to MockEmbeddings.")
                    return MockEmbeddings(dimensions=self.config.dimensions or 1536)
                
                return AzureOpenAIEmbeddings(
                    api_key=self.config.api_key,
                    azure_endpoint=self.config.azure_endpoint,
                    api_version=self.config.api_version or "2024-02-15-preview",
                    azure_deployment=self.config.deployment_name or "text-embedding-3-small",
                )
            
            elif self.config.provider == EmbeddingProvider.HUGGINGFACE:
                logger.info("Initializing HuggingFaceEmbeddings (runs locally).")
                return HuggingFaceEmbeddings(model_name=self.config.model)
            
            else:
                raise ValueError(f"Unknown embedding provider: {self.config.provider}")
        except Exception as e:
            logger.error(f"Failed to build embeddings provider: {e}. Defaulting to MockEmbeddings.")
            return MockEmbeddings(dimensions=self.config.dimensions or 1536)

    def embed_query(self, text: str) -> List[float]:
        if text not in self._query_cache:
            self._query_cache[text] = self._embeddings.embed_query(text)
        return self._query_cache[text]

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        uncached = []
        for t in texts:
            if t not in self._doc_cache:
                uncached.append(t)
        if uncached:
            embeddings = self._embeddings.embed_documents(uncached)
            for t, emb in zip(uncached, embeddings):
                self._doc_cache[t] = emb
        return [self._doc_cache[t] for t in texts]

    @property
    def langchain_embeddings(self) -> Embeddings:
        """Returns the raw LangChain Embeddings instance."""
        return self._embeddings
