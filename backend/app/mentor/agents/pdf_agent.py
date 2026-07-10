import datetime
import logging
import os
import re
import uuid
import hashlib
from typing import Any, Dict, List, Optional

from langchain_core.documents import Document
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.mentor.schemas.pdf import PDFMetadata
from app.mentor.embeddings.manager import EmbeddingManager
from app.mentor.vectorstore.manager import VectorStoreManager
from app.mentor.providers.base import MentorLLM
from app.core.config import settings
from app.mentor.exceptions import RateLimitExceededException, PDFParsingFailureException


def lexical_rerank(query: str, results: list, top_n: int = 4) -> list:
    """Rerank results based on keyword overlap between query and chunk content."""
    stop_words = {
        "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "to", "of", "in", "on", "at",
        "by", "for", "with", "about", "against", "between", "into", "through",
        "during", "before", "after", "above", "below", "from", "up", "down", "out",
        "off", "over", "under", "and", "but", "or", "not", "how", "why", "when"
    }
    query_words = {w.lower() for w in re.findall(r"\b[a-z]{3,}\b", query.lower()) if w.lower() not in stop_words}
    
    scored_results = []
    for r in results:
        text = r.text if hasattr(r, "text") else getattr(r, "page_content", str(r))
        chunk_words = {w.lower() for w in re.findall(r"\b[a-z]{3,}\b", text.lower())}
        overlap = len(query_words & chunk_words)
        overlap_score = overlap / max(1, len(query_words))
        
        score_val = r.score if hasattr(r, "score") else 0.5
        final_score = 0.5 * score_val + 0.5 * overlap_score
        scored_results.append((final_score, r))
        
    scored_results.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored_results[:top_n]]


logger = logging.getLogger("mentor.agents.pdf")


# In-memory cache for loaded documents
_pdf_cache = {}


def compute_file_hash(file_path: str) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


class PDFProcessor:
    """Handles text extraction from PDF files with scanned PDF OCR fallback."""
    
    @staticmethod
    def extract_text_fitz(pdf_path: str) -> List[Dict[str, Any]]:
        """Extract text, page numbers, and metadata from PDF using PyMuPDF (fitz)."""
        import fitz  # PyMuPDF
        
        pages = []
        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        
        for page_idx in range(total_pages):
            page = doc.load_page(page_idx)
            text = page.get_text()
            
            # If page text is empty/scanned PDF, try OCR fallback
            if not text.strip():
                logger.info(f"Page {page_idx + 1} has no selectable text. Triggering OCR fallback...")
                text = PDFProcessor.ocr_page(page)
                
            pages.append({
                "page_content": text,
                "metadata": {
                    "source": os.path.basename(pdf_path),
                    "page_number": page_idx + 1,
                    "total_pages": total_pages,
                    "extractor": "fitz_ocr" if not text.strip() else "fitz"
                }
            })
            
        doc.close()
        return pages

    @staticmethod
    def ocr_page(page) -> str:
        """OCR page using pytesseract if available, otherwise return placeholder."""
        try:
            import pytesseract
            from PIL import Image
            import io
            
            # Render page to a high-resolution pixmap
            pix = page.get_pixmap(dpi=150)
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # Execute OCR
            text = pytesseract.image_to_string(img)
            return text
        except Exception as e:
            logger.warning(f"pytesseract OCR page fallback failed: {e}. Returning scanned placeholder.")
            return "[Scanned PDF Page Image Placeholder Content]"



def clean_pdf_text(text: str) -> str:
    """
    Post-process extracted PDF text.
    """
    text = re.sub(r"\n{3,}", "\n\n", text)         # Max 2 consecutive newlines
    text = re.sub(r" {2,}", " ", text)              # Remove double spaces
    text = re.sub(r"-\n([a-z])", r"\1", text)       # Fix hyphenated line breaks (corrected regex \1)
    text = re.sub(r"\x0c", "\n\n--- PAGE BREAK ---\n\n", text)  # Form feeds
    return text.strip()


def simulate_pdf_extraction(text: str, source: str = "document.pdf") -> List[Document]:
    """
    Simulate PDF extraction from a text string.
    """
    pages_raw = text.split("\n\n\n")  # Triple newline = page break in mock
    docs = []
    for i, page_text in enumerate(pages_raw):
        if page_text.strip():
            docs.append(Document(
                page_content=clean_pdf_text(page_text),
                metadata={
                    "source": source,
                    "page_number": i + 1,
                    "total_pages": len(pages_raw),
                    "extractor": "mock",
                }
            ))
    return docs


SECTION_PATTERNS = [
    r"^(Chapter|Section|Part|Unit)\s+\d+",
    r"^\d+\.\d*\s+[A-Z]",
    r"^[A-Z][A-Z\s]{5,}$",
    r"^[A-Z][a-zA-Z\s]{3,}:$",
]

def detect_section(text: str) -> Optional[str]:
    """Detect if a chunk starts a new section."""
    lines = text.strip().split("\n")
    if not lines:
        return None
    first_line = lines[0].strip()
    for pattern in SECTION_PATTERNS:
        if re.match(pattern, first_line):
            return first_line[:80]
    return None


def chunk_pdf_pages(
    pages: List[Document],
    chunk_size: int = 800,
    chunk_overlap: int = 150,
) -> List[Document]:
    """
    Chunk PDF pages while preserving page-level metadata.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    all_chunks = []
    for page_doc in pages:
        page_chunks = splitter.split_documents([page_doc])
        for i, chunk in enumerate(page_chunks):
            chunk.metadata["chunk_in_page"] = i
            chunk.metadata["total_in_page"] = len(page_chunks)
            chunk.metadata["global_chunk_id"] = len(all_chunks)
            section = detect_section(chunk.page_content)
            if section:
                chunk.metadata["section"] = section
            all_chunks.append(chunk)

    return all_chunks


def prepare_chunk_metadata(
    chunk: Document,
    doc_id: str,
    title: str,
    doc_hash: str,
    topic: str = "General",
    difficulty: str = "intermediate",
    student_id: Optional[str] = None,
) -> dict:
    """Enrich chunk metadata with document-level and access-control fields."""
    meta = dict(chunk.metadata)
    meta.update({
        "doc_id": doc_id,
        "document_id": doc_id,
        "title": title,
        "filename": title,
        "doc_hash": doc_hash,
        "topic": topic,
        "difficulty": difficulty,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "uploaded_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source_type": "pdf",
        "page_number": chunk.metadata.get("page_number", 1),
        "chunk_index": chunk.metadata.get("global_chunk_id", 0),
    })
    if student_id:
        meta["student_id"] = student_id
        meta["user_id"] = student_id

    return meta


class PDFLearningAgent:
    """Intelligent PDF learning assistant for Tracks AI."""

    RAG_PROMPT = """You are Mentor AI analyzing a document for a student.
Answer the question using ONLY the document excerpts below.
Always cite the page number: "According to page X..." or "On page X...".
If the answer isn't in the excerpts, say: "This isn't covered in the provided section."

Document excerpts:
{context}"""

    def __init__(
        self,
        em: EmbeddingManager,
        llm: Optional[MentorLLM] = None,
        top_k: int = 5,
        chunk_size: int = 800,
    ) -> None:
        self.em = em
        self.llm = llm
        self.top_k = top_k
        self.chunk_size = chunk_size
        self._vsm = VectorStoreManager(em, "pdf_learning")
        self._loaded_docs: Dict[str, PDFMetadata] = {}
        self._active_doc_ids: Dict[str, str] = {}
        self._full_texts: Dict[str, str] = {}


    def load_pdf(
        self,
        pdf_path: str,
        topic: str = "General",
        difficulty: str = "intermediate",
        student_id: Optional[str] = None,
    ) -> PDFMetadata:
        """Load a real PDF file from disk."""
        import time
        title = os.path.basename(pdf_path)
        user_key = student_id or "default"
        
        # Enforce configurable PDF size limit
        max_size = settings.mentor_max_pdf_size_mb * 1024 * 1024
        if os.path.exists(pdf_path) and os.path.getsize(pdf_path) > max_size:
            raise RateLimitExceededException(
                f"PDF file size ({os.path.getsize(pdf_path) / (1024 * 1024):.2f}MB) exceeds maximum limit of {settings.mentor_max_pdf_size_mb}MB."
            )
            
        doc_hash = compute_file_hash(pdf_path)
        
        # Check in-memory cache first
        if doc_hash in _pdf_cache:
            logger.info(f"PDF {title} found in in-memory cache. Reusing.")
            cached = _pdf_cache[doc_hash]
            self._full_texts[user_key] = cached["full_text"]
            self._active_doc_ids[user_key] = cached["doc_id"]
            self._loaded_docs[cached["doc_id"]] = cached["pdf_meta"]
            
            logger.info(
                f"\n========= PDF DEBUG ========="
                f"\nDocument: {title}"
                f"\nPages: {cached['pdf_meta'].total_pages}"
                f"\nChunks: {cached['pdf_meta'].total_chunks}"
                f"\nVector Status: pdf_learning (in-memory cached)"
                f"\nRetrieval Time: N/A"
                f"\n============================="
            )
            return cached["pdf_meta"]
            
        # Check database duplicate check using doc_hash
        existing = self._vsm._collection.get(where={"doc_hash": doc_hash})
        if existing and existing.get("ids"):
            logger.info(f"PDF {title} already indexed in vector database. Reusing vectors.")
            metadatas = existing["metadatas"]
            documents = existing["documents"]
            ids = existing["ids"]
            
            sorted_chunks = sorted(
                zip(ids, documents, metadatas),
                key=lambda x: x[2].get("chunk_index", 0)
            )
            first_meta = sorted_chunks[0][2]
            doc_id = first_meta.get("doc_id")
            
            unique_pages = set()
            for item in sorted_chunks:
                pg = item[2].get("page_number")
                if pg:
                    unique_pages.add(pg)
                    
            self._full_texts[user_key] = " ".join(item[1] for item in sorted_chunks)
            self._active_doc_ids[user_key] = doc_id
            
            pdf_meta = PDFMetadata(
                doc_id=doc_id,
                source=title,
                total_pages=len(unique_pages),
                total_chunks=len(sorted_chunks),
                topic=first_meta.get("topic", topic),
                difficulty=first_meta.get("difficulty", difficulty),
                student_id=first_meta.get("student_id", student_id),
            )
            self._loaded_docs[doc_id] = pdf_meta
            
            # Save to in-memory cache
            _pdf_cache[doc_hash] = {
                "doc_id": doc_id,
                "pdf_meta": pdf_meta,
                "full_text": self._full_texts[user_key],
                "summary": None,
                "revision_notes": None
            }
            
            logger.info(
                f"\n========= PDF DEBUG ========="
                f"\nDocument: {title}"
                f"\nPages: {len(unique_pages)}"
                f"\nChunks: {len(sorted_chunks)}"
                f"\nVector Status: pdf_learning (reused database vectors)"
                f"\nRetrieval Time: N/A"
                f"\n============================="
            )
            return pdf_meta

        # Run extraction using PDFProcessor
        pages_data = PDFProcessor.extract_text_fitz(pdf_path)
        pages = [
            Document(page_content=p["page_content"], metadata=p["metadata"])
            for p in pages_data
        ]
        
        return self._index_pages(pages, title, topic, difficulty, student_id, doc_hash)

    def load_from_text(
        self,
        text: str,
        title: str = "Document",
        topic: str = "General",
        difficulty: str = "intermediate",
        student_id: Optional[str] = None,
    ) -> PDFMetadata:
        """Load from pre-extracted text."""
        pages = simulate_pdf_extraction(text, source=title)
        # Compute hash of text string
        doc_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return self._index_pages(pages, title, topic, difficulty, student_id, doc_hash)

    def _index_pages(
        self, pages: List[Document], title: str, topic: str, difficulty: str, student_id: Optional[str], doc_hash: str
    ) -> PDFMetadata:
        """Internal: chunk, enrich, embed, and index pages."""
        doc_id = str(uuid.uuid4())[:12]
        chunks = chunk_pdf_pages(pages, self.chunk_size)

        texts, metas, ids = [], [], []
        for i, chunk in enumerate(chunks):
            meta = prepare_chunk_metadata(
                chunk, doc_id, title=title, doc_hash=doc_hash, topic=topic, difficulty=difficulty, student_id=student_id
            )
            texts.append(chunk.page_content)
            metas.append(meta)
            ids.append(f"{doc_id}_c{i:04d}")

        self._vsm.add_documents(texts, metas, ids)

        # Track full text for summary
        user_key = student_id or "default"
        self._full_texts[user_key] = " ".join(p.page_content for p in pages)
        self._active_doc_ids[user_key] = doc_id

        pdf_meta = PDFMetadata(
            doc_id=doc_id,
            source=title,
            total_pages=len(pages),
            total_chunks=len(chunks),
            topic=topic,
            difficulty=difficulty,
            student_id=student_id,
        )
        self._loaded_docs[doc_id] = pdf_meta
        
        # Save to cache
        _pdf_cache[doc_hash] = {
            "doc_id": doc_id,
            "pdf_meta": pdf_meta,
            "full_text": self._full_texts[user_key],
            "summary": None,
            "revision_notes": None
        }

        logger.info(
            f"\n========= PDF DEBUG ========="
            f"\nDocument: {title}"
            f"\nPages: {len(pages)}"
            f"\nChunks: {len(chunks)}"
            f"\nVector Status: pdf_learning (newly indexed)"
            f"\nRetrieval Time: N/A"
            f"\n============================="
        )
        return pdf_meta

    async def ask(self, question: str, user_id: Optional[str] = None, doc_id: Optional[str] = None) -> Dict[str, Any]:
        """Answer a question about the PDF with page citations."""
        import time
        start_time = time.time()
        user_key = user_id or "default"
        target_doc_id = doc_id or self._active_doc_ids.get(user_key)
        
        if not target_doc_id:
            return {"answer": "No active PDF document found. Please upload a PDF first.", "citations": [], "chunks_used": 0}

        # Secure compound query filters: filter by doc_id AND user_id
        where = {
            "$and": [
                {"doc_id": {"$eq": target_doc_id}},
                {"user_id": {"$eq": user_key}}
            ]
        }
        
        try:
            # 1. Retrieve more candidates (k=8) using MMR
            results = self._vsm.search(question, top_k=8, where=where, search_type="mmr")
        except Exception as e:
            raise VectorDBFailureException(f"Failed to query vector database: {e}")
            
        elapsed_ms = int((time.time() - start_time) * 1000)

        # 2. Filter by similarity threshold to prevent hallucinations
        min_relevance = getattr(settings, "rag_min_relevance", 0.30)
        filtered_results = [r for r in results if r.score >= min_relevance]

        if not filtered_results:
            logger.info(f"[PDF RAG] No chunks matched min relevance threshold: {min_relevance}")
            return {
                "answer": "I could not find this in the provided content.",
                "citations": [],
                "chunks_used": 0
            }

        # 3. Rerank the best candidate chunks
        reranked_results = lexical_rerank(question, filtered_results, top_n=self.top_k)

        active_meta = self._loaded_docs.get(target_doc_id) if target_doc_id else None
        title = active_meta.source if active_meta else "Unknown"
        pages_count = active_meta.total_pages if active_meta else 0
        chunks_count = active_meta.total_chunks if active_meta else 0

        logger.info(
            f"\n========= PDF DEBUG ========="
            f"\nDocument: {title}"
            f"\nPages: {pages_count}"
            f"\nChunks: {chunks_count}"
            f"\nVector Status: pdf_learning"
            f"\nRetrieval Time: {elapsed_ms}ms"
            f"\nFiltered chunks: {len(filtered_results)} / {len(results)}"
            f"\nReranked chunks: {len(reranked_results)}"
            f"\n============================="
        )

        context_parts = []
        page_citations = []
        for r in reranked_results:
            pg = r.metadata.get("page_number", "?")
            sec = r.metadata.get("section", "")
            hdr = f"[Page {pg}" + (f", {sec}]" if sec else "]")
            context_parts.append(f"{hdr}\n{r.text}")
            if pg not in page_citations and pg != "?":
                page_citations.append(int(pg) if isinstance(pg, (int, float)) or str(pg).isdigit() else pg)

        context = "\n\n".join(context_parts)

        if not self.llm or not self.llm.llm:
            return {
                "answer": f"[Mock] Context from pages {page_citations}. LLM not configured.",
                "citations": page_citations,
                "chunks_used": len(reranked_results),
            }

        messages = [
            SystemMessage(content=self.RAG_PROMPT.replace("{context}", context)),
            HumanMessage(content=question),
        ]
        response = await self.llm.ainvoke(messages)
        return {
            "answer": response.content,
            "citations": sorted(page_citations, key=lambda x: (isinstance(x, int), x)),
            "chunks_used": len(reranked_results),
        }

    async def summarize(self, style: str = "comprehensive", user_id: Optional[str] = None) -> str:
        """Generate a document summary."""
        user_key = user_id or "default"
        active_doc_id = self._active_doc_ids.get(user_key)
        if not active_doc_id:
            return "No active PDF document found. Please upload a PDF first."

        # Check cache first
        for cached in _pdf_cache.values():
            if cached["doc_id"] == active_doc_id and cached.get("summary"):
                logger.info("Summary found in cache. Reusing.")
                return cached["summary"]

        full_text = self._full_texts.get(user_key, "")
        sample = full_text[:5000]
        if not self.llm or not self.llm.llm:
            return f"[Mock Summary] Document with {self._vsm.count} indexed chunks."

        style_guide = {
            "brief": "Write a 3-4 sentence overview.",
            "comprehensive": "Write a structured summary: Overview, Key Concepts (bullet list), Important Formulas/Methods, Conclusion.",
            "bullets": "Write 10-15 bullet points covering the key ideas.",
        }

        active_meta = self._loaded_docs.get(active_doc_id)
        doc_title = active_meta.source if active_meta else "Document"

        messages = [
            SystemMessage(content=f"You are summarizing a learning document: '{doc_title}'\n"
                                  f"Style: {style_guide.get(style, style_guide['comprehensive'])}\n"
                                  "Preserve all technical terms. Be accurate and educational."),
            HumanMessage(content=f"Summarize this document:\n\n{sample}"),
        ]
        response = await self.llm.ainvoke(messages)
        result = response.content
        
        # Save to cache
        for cached in _pdf_cache.values():
            if cached["doc_id"] == active_doc_id:
                cached["summary"] = result

        return result

    async def generate_revision_notes(self, user_id: Optional[str] = None) -> str:
        """Generate structured revision notes from the document."""
        user_key = user_id or "default"
        active_doc_id = self._active_doc_ids.get(user_key)
        if not active_doc_id:
            return "No active PDF document found. Please upload a PDF first."

        # Check cache first
        for cached in _pdf_cache.values():
            if cached["doc_id"] == active_doc_id and cached.get("revision_notes"):
                logger.info("Revision notes found in cache. Reusing.")
                return cached["revision_notes"]

        full_text = self._full_texts.get(user_key, "")
        sample = full_text[:5000]
        if not self.llm or not self.llm.llm:
            return "[Mock] Revision notes for indexed document."

        active_meta = self._loaded_docs.get(active_doc_id)
        doc_title = active_meta.source if active_meta else "Document"

        messages = [
            SystemMessage(content=f"""Create comprehensive revision notes for: '{doc_title}'
Format:
# Revision Notes: [Title]
## Core Concepts
[Key definitions and concepts]
## Key Methods/Algorithms
[Step-by-step explanations]
## Important Formulas
[Formulas with explanations]
## Common Mistakes to Avoid
[Student pitfalls]
## Practice Questions
[5 self-assessment questions]"""),
            HumanMessage(content=f"Create revision notes from:\n\n{sample}"),
        ]
        response = await self.llm.ainvoke(messages)
        result = response.content
        
        # Save to cache
        for cached in _pdf_cache.values():
            if cached["doc_id"] == active_doc_id:
                cached["revision_notes"] = result

        return result

    async def extract_key_concepts(self, n: int = 10, user_id: Optional[str] = None) -> List[str]:
        """Extract key concepts from the document."""
        if not self.llm or not self.llm.llm:
            return ["Linear Regression", "Gradient Descent", "Neural Networks",
                    "Cross-Entropy Loss", "Backpropagation", "Overfitting",
                    "Decision Trees", "Random Forest", "Model Evaluation", "F1 Score"]

        user_key = user_id or "default"
        full_text = self._full_texts.get(user_key, "")
        sample = full_text[:3000]
        messages = [
            SystemMessage(content=f"Extract exactly {n} key technical concepts from this document. "
                                   "Return a numbered list. Each item: specific concept name only."),
            HumanMessage(content=sample),
        ]
        response = await self.llm.ainvoke(messages)
        concepts = []
        for line in response.content.strip().split("\n"):
            clean = re.sub(r"^[\d\.\-\*•]+\s*", "", line).strip()
            if clean:
                concepts.append(clean)
        return concepts[:n]

    async def compare_to_roadmap(self, student_context: Optional[dict], user_id: Optional[str] = None) -> str:
        """Compare PDF key concepts with student active roadmap topic to give progress alignment context."""
        if not student_context or not student_context.get("has_roadmap"):
            return ""

        active_topic = student_context.get("current_active_topic_name")
        if not active_topic:
            return ""

        concepts = await self.extract_key_concepts(n=5, user_id=user_id)
        concepts_str = ", ".join(concepts)

        completed = student_context.get("completed_topics", [])
        locked = student_context.get("locked_topics", [])

        system = f"""You are a curriculum analyst.
Current active topic of student: "{active_topic}"
Completed topics: {completed}
Future/locked topics: {locked}

The student just loaded a PDF document covering these concepts:
[{concepts_str}]

Determine if this PDF helps the student's current active topic, belongs to their completed topics, or belongs to a future phase of their roadmap.
Return exactly one of these formats:
"This PDF matches your current topic: {active_topic}" if it strongly aligns with the current topic.
"This belongs to a future phase" if the topics in the PDF are mostly in the future/locked list.
"This covers completed topics" if the topics in the PDF have already been completed.

Briefly explain why in 1 sentence. Keep response extremely concise."""

        messages = [
            SystemMessage(content=system),
            HumanMessage(content="Analyze this PDF's alignment with my roadmap.")
        ]

        try:
            response = await self.llm.ainvoke(messages)
            return response.content.strip()
        except Exception as e:
            logger.warning(f"compare_to_roadmap failed: {e}")
            return ""

    @property
    def loaded_document_count(self) -> int:
        return len(self._loaded_docs)

