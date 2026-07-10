from functools import lru_cache
import logging
import os
from typing import Optional
import chromadb
from fastapi import Depends

from app.core.config import settings
from app.mentor.providers.factory import ProviderFactory
from app.mentor.providers.base import MentorLLM
from app.mentor.memory.stores.mongodb import MongoDBStore
from app.mentor.memory.manager import MemoryManager
from app.mentor.embeddings.manager import EmbeddingManager
from app.mentor.vectorstore.manager import VectorStoreManager
from app.mentor.rag.pipeline import RAGPipeline
from app.mentor.tools.registry import build_tool_registry, ToolRegistry
from app.mentor.agents.youtube_agent import YouTubeLearningAgent
from app.mentor.agents.pdf_agent import PDFLearningAgent
from app.mentor.agents.quiz_agent import QuizAgent
from app.mentor.graph.mentor_graph import MentorGraph

# Centralize auth dependency from core
from app.api.deps import get_current_user

logger = logging.getLogger("app.mentor.deps")


@lru_cache(maxsize=1)
def get_mentor_llm() -> MentorLLM:
    return ProviderFactory.build_mentor_llm(settings)


@lru_cache(maxsize=1)
def get_mongodb_store() -> MongoDBStore:
    return MongoDBStore(
        collection_name=settings.mongodb_collection_sessions,
    )


@lru_cache(maxsize=1)
def get_memory_manager() -> MemoryManager:
    return MemoryManager(
        store=get_mongodb_store(),
        strategy=settings.memory_strategy,
        window_size=settings.memory_window_size,
    )


@lru_cache(maxsize=1)
def get_embedding_manager() -> EmbeddingManager:
    return EmbeddingManager(
        provider=settings.embedding_provider,
        model=settings.embedding_model,
    )


@lru_cache(maxsize=1)
def get_chroma_client():
    if settings.chroma_mode == "server":
        logger.info(f"Connecting to Chroma HttpClient at {settings.chroma_host}:{settings.chroma_port}")
        return chromadb.HttpClient(host=settings.chroma_host, port=settings.chroma_port)
    elif settings.chroma_mode == "persistent":
        logger.info(f"Connecting to Chroma PersistentClient at {settings.chroma_persist_dir}")
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        return chromadb.PersistentClient(path=settings.chroma_persist_dir)
    else:
        logger.info("Initializing Chroma EphemeralClient (In-Memory)")
        return chromadb.EphemeralClient()


@lru_cache(maxsize=1)
def get_vector_store_manager() -> VectorStoreManager:
    return VectorStoreManager(
        embedding_manager=get_embedding_manager(),
        chroma_client=get_chroma_client(),
        collection_name=settings.chroma_collection_name,
    )


@lru_cache(maxsize=1)
def get_rag_pipeline() -> RAGPipeline:
    return RAGPipeline(
        vsm=get_vector_store_manager(),
        llm=get_mentor_llm().llm,
        top_k=settings.rag_top_k,
    )


@lru_cache(maxsize=1)
def get_tool_registry() -> ToolRegistry:
    return build_tool_registry(llm=get_mentor_llm(), roadmap={})


@lru_cache(maxsize=1)
def get_yt_agent() -> YouTubeLearningAgent:
    return YouTubeLearningAgent(
        em=get_embedding_manager(),
        llm=get_mentor_llm(),
        chunk_size=800,
        top_k=settings.rag_top_k,
    )


@lru_cache(maxsize=1)
def get_pdf_agent() -> PDFLearningAgent:
    return PDFLearningAgent(
        em=get_embedding_manager(),
        llm=get_mentor_llm(),
        top_k=settings.rag_top_k,
        chunk_size=800,
    )


@lru_cache(maxsize=1)
def get_quiz_agent() -> QuizAgent:
    return QuizAgent(
        vsm=get_vector_store_manager(),
        llm=get_mentor_llm(),
    )


@lru_cache(maxsize=1)
def get_mentor_graph() -> MentorGraph:
    return MentorGraph(
        llm=get_mentor_llm(),
        memory_manager=get_memory_manager(),
        vector_store_manager=get_vector_store_manager(),
        tool_registry=get_tool_registry(),
        rag_pipeline=get_rag_pipeline(),
        yt_agent=get_yt_agent(),
        pdf_agent=get_pdf_agent(),
        quiz_agent=get_quiz_agent(),
        default_student_level=settings.memory_strategy,
    )
