import logging
import time
from typing import Dict, Any, List, Optional, AsyncIterator, Union
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

from app.mentor.vectorstore.manager import VectorStoreManager
from app.mentor.schemas.rag import RAGConfig, RAGResponse, DEFAULT_RAG_SYSTEM_PROMPT
from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.rag")

def format_docs_for_prompt(docs: list) -> str:
    """
    Format retrieved documents for injection into the RAG prompt.
    Numbered sections help the LLM distinguish sources.
    """
    if not docs:
        return "No relevant context found."
    parts = []
    for i, doc in enumerate(docs):
        # Handle dict or Document object
        if isinstance(doc, dict):
            source = doc.get("metadata", {}).get("title", f"Source {i+1}")
            text = doc.get("text", "")
        elif hasattr(doc, "metadata") and hasattr(doc, "page_content"):
            source = doc.metadata.get("title", f"Source {i+1}")
            text = doc.page_content
        else:
            # Fallback if SearchResult model is passed
            source = getattr(doc, "metadata", {}).get("title", f"Source {i+1}")
            text = getattr(doc, "text", str(doc))
            
        parts.append(f"[{i+1}] {source}:\n{text}")
    return "\n\n".join(parts)


class RAGPipeline:
    """
    Retrieves context from VectorStoreManager and generates a grounded response using LLM.
    Supports sync, async, and streaming queries.
    """

    def __init__(
        self,
        vsm: VectorStoreManager,
        llm: Union[MentorLLM, Any],
        config: Optional[RAGConfig] = None,
        top_k: Optional[int] = None,
    ) -> None:
        self.vsm = vsm
        cfg = config or RAGConfig()
        if top_k is not None:
            self.config = cfg.model_copy(update={"top_k": top_k})
        else:
            self.config = cfg
        if not isinstance(llm, MentorLLM):
            self.mentor_llm = MentorLLM(llm=llm)
        else:
            self.mentor_llm = llm
        self._chain = self._build_chain()
        logger.info(f"RAGPipeline initialized | k={self.config.top_k}")

    def _build_chain(self):
        """Build the LangChain Expression Language (LCEL) RAG chain."""
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.config.system_prompt),
            ("human", "{question}"),
        ])

        retriever = self.vsm.as_retriever(k=self.config.top_k)
        format_fn = RunnableLambda(lambda docs: format_docs_for_prompt(docs))

        # Using direct llm underneath MentorLLM
        chain = (
            {
                "context": retriever | format_fn,
                "question": RunnablePassthrough(),
            }
            | prompt
            | self.mentor_llm.llm
            | StrOutputParser()
        )
        return chain

    def query(self, question: str, where: Optional[Dict[str, Any]] = None) -> RAGResponse:
        """Synchronous RAG query."""
        t0 = time.time()
        sources = self.vsm.search(question, top_k=self.config.top_k, where=where)
        context = format_docs_for_prompt(sources)

        messages = [
            SystemMessage(content=self.config.system_prompt.replace("{context}", context)),
            HumanMessage(content=question),
        ]
        
        # Invoke LLM
        response = self.mentor_llm.invoke(messages)
        answer = response.content

        elapsed = int((time.time() - t0) * 1000)
        return RAGResponse(
            question=question,
            answer=answer,
            sources=[
                {
                    "title": getattr(s, "metadata", {}).get("title", "?") if not isinstance(s, dict) else s.get("metadata", {}).get("title", "?"),
                    "topic": getattr(s, "metadata", {}).get("topic", "?") if not isinstance(s, dict) else s.get("metadata", {}).get("topic", "?"),
                    "score": getattr(s, "score", 0.0) if not isinstance(s, dict) else s.get("score", 0.0)
                }
                for s in sources
            ],
            top_k_used=len(sources),
            query_time_ms=elapsed,
        )

    async def aquery(self, question: str, where: Optional[Dict[str, Any]] = None) -> RAGResponse:
        """Async RAG query for FastAPI."""
        t0 = time.time()
        sources = self.vsm.search(question, top_k=self.config.top_k, where=where)
        context = format_docs_for_prompt(sources)

        if self._chain:
            # We use the built chain for cleaner execution
            # Wait, chain expects context to be loaded from retriever
            # Let's ensure filters are respected if 'where' is passed
            if where:
                # If custom filters are provided, fallback to direct messages list format
                messages = [
                    SystemMessage(content=self.config.system_prompt.replace("{context}", context)),
                    HumanMessage(content=question),
                ]
                response = await self.mentor_llm.ainvoke(messages)
                answer = response.content
            else:
                answer = await self._chain.ainvoke(question)
        else:
            messages = [
                SystemMessage(content=self.config.system_prompt.replace("{context}", context)),
                HumanMessage(content=question),
            ]
            response = await self.mentor_llm.ainvoke(messages)
            answer = response.content

        elapsed = int((time.time() - t0) * 1000)
        return RAGResponse(
            question=question,
            answer=answer,
            sources=[
                {
                    "title": getattr(s, "metadata", {}).get("title", "?") if not isinstance(s, dict) else s.get("metadata", {}).get("title", "?"),
                    "topic": getattr(s, "metadata", {}).get("topic", "?") if not isinstance(s, dict) else s.get("metadata", {}).get("topic", "?"),
                    "score": getattr(s, "score", 0.0) if not isinstance(s, dict) else s.get("score", 0.0)
                }
                for s in sources
            ],
            top_k_used=len(sources),
            query_time_ms=elapsed,
        )

    async def astream(self, question: str, where: Optional[Dict[str, Any]] = None) -> AsyncIterator[str]:
        """Async streaming RAG yields response tokens as they arrive."""
        sources = self.vsm.search(question, top_k=self.config.top_k, where=where)
        context = format_docs_for_prompt(sources)

        messages = [
            SystemMessage(content=self.config.system_prompt.replace("{context}", context)),
            HumanMessage(content=question),
        ]
        async for chunk in self.mentor_llm.astream(messages):
            if chunk.content:
                yield chunk.content

    async def aquery_filtered(
        self,
        question: str,
        difficulty: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> RAGResponse:
        """Performs a query with metadata filters on student difficulty or topic."""
        where = {}
        if difficulty:
            where["difficulty"] = difficulty
        if topic:
            where["topic"] = topic
            
        if len(where) > 1:
            where = {"$and": [{k: v} for k, v in where.items()]}
            
        return await self.aquery(question, where=where if where else None)
