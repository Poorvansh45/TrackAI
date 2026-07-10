"""
RAG Quality Evaluator
======================

Heuristic (zero-LLM-cost) evaluation of RAG retrieval quality.

Metrics:
  context_relevance   — how well retrieved chunks match the question
  answer_groundedness — how well the answer is grounded in the context
  retrieval_score     — harmonic mean of the above (F1-style)

All metrics are keyword-overlap based — fast, deterministic, free.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import List, Optional

logger = logging.getLogger("mentor.observability.rag_evaluator")


# ─── Result Schema ─────────────────────────────────────────────────────────────

@dataclass
class RAGEvalResult:
    """Evaluation scores for a single RAG retrieval + answer pair."""
    context_relevance: float    # 0.0 – 1.0: do chunks answer the question?
    answer_groundedness: float  # 0.0 – 1.0: is the answer grounded in context?
    retrieval_score: float      # harmonic mean of the two above
    num_chunks: int             # number of chunks retrieved
    notes: List[str] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        """Returns True if retrieval quality is acceptable (score ≥ 0.4)."""
        return self.retrieval_score >= 0.4

    def to_dict(self) -> dict:
        return {
            "context_relevance": round(self.context_relevance, 3),
            "answer_groundedness": round(self.answer_groundedness, 3),
            "retrieval_score": round(self.retrieval_score, 3),
            "num_chunks": self.num_chunks,
            "passed": self.passed,
            "notes": self.notes,
        }


# ─── Tokeniser ─────────────────────────────────────────────────────────────────

_STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "used", "to", "of", "in", "on", "at", "by", "for", "with", "about",
    "against", "between", "into", "through", "during", "before", "after",
    "above", "below", "from", "up", "down", "out", "off", "over", "under",
    "again", "then", "once", "i", "me", "my", "we", "our", "you", "your",
    "he", "she", "it", "they", "them", "this", "that", "these", "those",
    "what", "which", "who", "whom", "how", "why", "when", "where",
    "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
}


def _tokenize(text: str) -> set:
    """Lower-case, strip punctuation, remove stop words."""
    tokens = re.findall(r"\b[a-z]{3,}\b", text.lower())
    return {t for t in tokens if t not in _STOP_WORDS}


def _overlap_score(set_a: set, set_b: set) -> float:
    """Jaccard-like overlap: |intersection| / |union|."""
    if not set_a or not set_b:
        return 0.0
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union)


def _harmonic_mean(a: float, b: float) -> float:
    if a + b == 0:
        return 0.0
    return 2 * a * b / (a + b)


# ─── Core Evaluator ────────────────────────────────────────────────────────────

def evaluate_retrieval(
    question: str,
    retrieved_chunks: List[str],
    answer: str,
) -> RAGEvalResult:
    """
    Evaluate RAG retrieval quality for a single question-answer pair.

    Args:
        question:         The user's original question.
        retrieved_chunks: List of text chunks returned by the vector search.
        answer:           The model's generated answer.

    Returns:
        RAGEvalResult with context_relevance, answer_groundedness, retrieval_score.
    """
    notes = []
    num_chunks = len(retrieved_chunks)

    if not retrieved_chunks:
        notes.append("No chunks retrieved — cannot evaluate context relevance.")
        return RAGEvalResult(
            context_relevance=0.0,
            answer_groundedness=0.0,
            retrieval_score=0.0,
            num_chunks=0,
            notes=notes,
        )

    # ── Context relevance: do chunks contain keywords from the question? ──────
    question_tokens = _tokenize(question)
    chunk_text = " ".join(retrieved_chunks)
    chunk_tokens = _tokenize(chunk_text)

    context_relevance = _overlap_score(question_tokens, chunk_tokens)
    if context_relevance < 0.15:
        notes.append(f"Low context relevance ({context_relevance:.2f}) — chunks may not match the question.")

    # ── Answer groundedness: is the answer derived from the chunks? ───────────
    answer_tokens = _tokenize(answer)
    groundedness_scores = []
    for chunk in retrieved_chunks:
        chunk_tok = _tokenize(chunk)
        groundedness_scores.append(_overlap_score(answer_tokens, chunk_tok))

    answer_groundedness = max(groundedness_scores) if groundedness_scores else 0.0
    if answer_groundedness < 0.15:
        notes.append(f"Low answer groundedness ({answer_groundedness:.2f}) — answer may not reference context.")

    # ── Retrieval score (harmonic mean) ───────────────────────────────────────
    retrieval_score = _harmonic_mean(context_relevance, answer_groundedness)

    if not notes:
        notes.append(f"Retrieval OK — {num_chunks} chunks, score={retrieval_score:.2f}")

    return RAGEvalResult(
        context_relevance=context_relevance,
        answer_groundedness=answer_groundedness,
        retrieval_score=retrieval_score,
        num_chunks=num_chunks,
        notes=notes,
    )


def evaluate_pdf_retrieval(
    question: str,
    retrieved_chunks: List[str],
    answer: str,
) -> RAGEvalResult:
    """Convenience wrapper for PDF agent retrieval evaluation."""
    result = evaluate_retrieval(question, retrieved_chunks, answer)
    result.notes.insert(0, "[PDF]")
    return result


def evaluate_youtube_retrieval(
    question: str,
    retrieved_chunks: List[str],
    answer: str,
) -> RAGEvalResult:
    """Convenience wrapper for YouTube agent retrieval evaluation."""
    result = evaluate_retrieval(question, retrieved_chunks, answer)
    result.notes.insert(0, "[YouTube]")
    return result
