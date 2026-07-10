import logging
import os
from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from langchain_core.documents import Document
from langchain_chroma import Chroma
import chromadb

from app.mentor.config.settings import get_settings
from app.mentor.embeddings.manager import EmbeddingManager

logger = logging.getLogger("mentor.vectorstore")

class VectorStoreConfig(BaseModel):
    """Configuration for VectorStoreManager."""
    collection_name: str = "mentor_docs"
    persist_directory: Optional[str] = None


class SearchResult(BaseModel):
    """Schema representing a single search result from ChromaDB."""
    text: str = Field(description="Content of the document")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Document metadata")
    score: float = Field(description="Similarity score (lower is more similar for L2, higher is more similar for cosine/ip)")


class VectorStoreManager:
    """
    Manages the ChromaDB client, collections, document additions,
    metadata sanitization, and LangChain retriever conversion.
    """

    def __init__(
        self,
        embedding_manager: EmbeddingManager,
        config: Optional[Union[VectorStoreConfig, str]] = None,
        chroma_client: Optional[chromadb.ClientAPI] = None,
        collection_name: Optional[str] = None
    ) -> None:
        self.em = embedding_manager
        
        # Coerce string config parameter to collection_name for backwards compatibility
        if isinstance(config, str):
            collection_name = config
            config = None

        # Load config
        settings = get_settings()
        coll_name = collection_name or (config.collection_name if config else settings.chroma_collection_name)
        persist_dir = config.persist_directory if config else settings.chroma_persist_dir

        self.config = config or VectorStoreConfig(
            collection_name=coll_name,
            persist_directory=persist_dir
        )
        
        # Initialize native ChromaDB client
        if chroma_client is not None:
            self._client = chroma_client
            logger.info("Using pre-configured ChromaDB client.")
        elif self.config.persist_directory:
            os.makedirs(self.config.persist_directory, exist_ok=True)
            self._client = chromadb.PersistentClient(path=self.config.persist_directory)
            logger.info(f"Initialized ChromaDB persistent client at: {self.config.persist_directory}")
        else:
            self._client = chromadb.EphemeralClient()
            logger.info("Initialized ChromaDB ephemeral (in-memory) client.")

        self._collection = self._client.get_or_create_collection(
            name=self.config.collection_name,
            metadata={"hnsw:space": "cosine"}  # use cosine similarity
        )
        
        # Wrap with LangChain Chroma instance
        self._vectorstore = Chroma(
            client=self._client,
            collection_name=self.config.collection_name,
            embedding_function=self.em.langchain_embeddings
        )
        
        logger.info(f"Initialized VectorStoreManager collection: {self.config.collection_name}")

    def add_documents(
        self,
        texts: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        ids: Optional[List[str]] = None
    ) -> List[str]:
        """
        Adds texts with optional metadata to vector store.
        Sanitizes metadatas (ChromaDB only supports primitive types: str, int, float, bool).
        """
        if metadatas is not None:
            sanitized_metadatas = []
            for meta in metadatas:
                sanitized = {}
                for k, v in meta.items():
                    if isinstance(v, (str, int, float, bool)):
                        sanitized[k] = v
                    elif v is None:
                        continue
                    else:
                        sanitized[k] = str(v)  # Force non-primitive to string
                sanitized_metadatas.append(sanitized)
        else:
            sanitized_metadatas = None

        documents = [
            Document(page_content=t, metadata=m or {})
            for t, m in zip(texts, sanitized_metadatas or [{}] * len(texts))
        ]
        
        added_ids = self._vectorstore.add_documents(documents, ids=ids)
        logger.info(f"Added {len(texts)} documents to vector store collection '{self.config.collection_name}'.")
        return added_ids

    def search(
        self,
        query: str,
        top_k: int = 5,
        where: Optional[Dict[str, Any]] = None,
        search_type: str = "similarity"
    ) -> List[SearchResult]:
        """Performs a search returning structured SearchResult models. Supports similarity and MMR search types."""
        if search_type == "mmr":
            # 1. Retrieve diverse documents using max marginal relevance search
            docs = self._vectorstore.max_marginal_relevance_search(
                query=query,
                k=top_k,
                filter=where
            )
            
            # 2. Fetch similarity scores for mapping (to allow similarity threshold checks)
            sim_results = self._vectorstore.similarity_search_with_relevance_scores(
                query=query,
                k=max(20, top_k * 3),
                filter=where
            )
            score_map = {doc.page_content: score for doc, score in sim_results}
            
            formatted_results = []
            for doc in docs:
                # Default to 0.5 (reasonable similarity match) if not in the top similarity results
                score = score_map.get(doc.page_content, 0.5)
                formatted_results.append(
                    SearchResult(
                        text=doc.page_content,
                        metadata=doc.metadata,
                        score=float(score)
                    )
                )
            return formatted_results
        else:
            # Standard similarity search
            results = self._vectorstore.similarity_search_with_relevance_scores(
                query=query,
                k=top_k,
                filter=where
            )
            
            formatted_results = []
            for doc, score in results:
                formatted_results.append(
                    SearchResult(
                        text=doc.page_content,
                        metadata=doc.metadata,
                        score=float(score)
                    )
                )
            return formatted_results

    def as_retriever(self, k: int = 5, where: Optional[Dict[str, Any]] = None):
        """Converts to a LangChain BaseRetriever for LCEL chains using MMR search."""
        search_kwargs: Dict[str, Any] = {"k": k}
        if where:
            search_kwargs["filter"] = where
            
        return self._vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs=search_kwargs
        )

    @property
    def count(self) -> int:
        """Returns the number of documents in the collection."""
        return self._collection.count()

    def clear(self) -> None:
        """Deletes all documents from the collection."""
        # Unfortunately LangChain Chroma doesn't expose a simple clear, we delete via the collection API
        all_ids = self._collection.get()["ids"]
        if all_ids:
            self._collection.delete(ids=all_ids)
            logger.info(f"Cleared vector store collection '{self.config.collection_name}'.")
        else:
            logger.info("Collection is already empty.")

    @property
    def vectorstore(self) -> Chroma:
        """Exposes the raw LangChain Chroma instance."""
        return self._vectorstore
