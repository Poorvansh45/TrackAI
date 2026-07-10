"""
Mentor Response Quality Evaluator
===================================

Rule-based quality checks on Mentor AI responses.
Detects:
  - empty_response         : response is too short to be useful
  - hallucination_risk     : answer makes factual claims without RAG context
  - wrong_tool_usage       : detected intent does not match the tool used
  - missing_citations      : RAG-based answer lacks source references

Zero LLM API calls — all checks are heuristic/rule-based.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger("mentor.observability.mentor_evaluator")


# ─── Intent → Tool mapping (canonical) ─────────────────────────────────────

INTENT_TOOL_MAP: Dict[str, str] = {
    "explain_concept":    "ExplainConceptTool",
    "generate_quiz":      "QuizTool",
    "summarize_text":     "SummarizeTextTool",
    "roadmap_help":       "HelpFromRoadmapTool",
    "pdf_question":       "PDFLearningAgent",
    "youtube_question":   "youtube_tool",
    "weakness_diagnosis": "WeaknessAnalyzerAgent",
    "revision_plan":      "RevisionPlannerAgent",
    "general_chat":       None,  # no tool
}

# RAG-based tools that should cite sources
RAG_TOOLS = {"pdf", "youtube", "roadmap"}

# Citation patterns we look for in RAG answers
CITATION_PATTERNS = [
    r"\d{1,2}:\d{2}",          # timestamps: 02:30, 12:05
    r"page\s+\d+",             # page references
    r"chapter\s+\d+",          # chapter references
    r"section\s+\d+",          # section references
    r"according to",           # attribution phrases
    r"the (document|pdf|video|transcript) (says|shows|mentions|states)",
    r"at \d{1,2}:\d{2}",       # "At 02:30, ..."
    r"\[source\]",             # explicit source tags
]

# Patterns indicating factual-sounding claims (hallucination risk signals)
FACTUAL_CLAIM_PATTERNS = [
    r"\bin \d{4}\b",           # year references
    r"\bis (defined|known|called) as\b",
    r"\baccording to\b",
    r"\bstudies show\b",
    r"\bresearch (shows|indicates|suggests|proves)\b",
    r"\bproven\b",
    r"\bscientifically\b",
    r"\bstatistically\b",
    r"\bthe (official|standard|accepted) (definition|approach|method)\b",
]


# ─── Result Schema ──────────────────────────────────────────────────────────

@dataclass
class EvalResult:
    """Quality evaluation result for a single Mentor AI response."""
    passed: bool
    score: float              # 0.0 – 1.0 overall quality score
    flags: List[str] = field(default_factory=list)
    notes: List[str] = field(default_factory=list)
    checks: Dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "passed": self.passed,
            "score": round(self.score, 3),
            "flags": self.flags,
            "notes": self.notes,
            "checks": self.checks,
        }


# ─── Individual check functions ────────────────────────────────────────────

def _check_empty_response(response: str) -> tuple[bool, str]:
    """Flag if response is below minimum useful length."""
    stripped = response.strip()
    if len(stripped) < 20:
        return True, f"Response too short ({len(stripped)} chars) — likely an empty or error response."
    if stripped.lower() in {
        "i don't know.", "i cannot answer this.", "sorry.", "n/a", "none",
        "i'm not sure.", "i am not sure.", "unknown",
    }:
        return True, f"Response appears to be a low-information placeholder: '{stripped[:50]}'"
    return False, ""


def _check_hallucination_risk(response: str, rag_context: Optional[str]) -> tuple[bool, str]:
    """
    Flag if response makes factual-sounding claims but RAG context is empty.
    High risk: factual claims without any supporting context.
    """
    # Only flag hallucination risk when no RAG context was provided
    if rag_context and len(rag_context.strip()) > 50:
        return False, ""

    # Check if response contains factual claim markers
    response_lower = response.lower()
    matched_patterns = []
    for pattern in FACTUAL_CLAIM_PATTERNS:
        if re.search(pattern, response_lower):
            matched_patterns.append(pattern)

    if matched_patterns:
        return True, (
            f"Hallucination risk: response contains {len(matched_patterns)} factual claim pattern(s) "
            f"but no RAG context was retrieved. Patterns: {matched_patterns[:3]}"
        )
    return False, ""


def _check_wrong_tool_usage(intent: Optional[str], tool_used: Optional[str]) -> tuple[bool, str]:
    """
    Flag if the tool invoked doesn't match the detected intent.
    Skips check if intent is general_chat (no tool expected).
    """
    if not intent or not tool_used:
        return False, ""
    if intent == "general_chat":
        return False, ""

    expected_tool = INTENT_TOOL_MAP.get(intent)
    if expected_tool is None:
        return False, ""

    # Normalize comparison — strip all delimiters to do a clean substring match
    tool_lower = tool_used.lower().replace("-", "").replace("_", "").replace(" ", "")
    expected_lower = expected_tool.lower().replace("-", "").replace("_", "").replace(" ", "")

    if expected_lower not in tool_lower and tool_lower not in expected_lower:
        return True, (
            f"Tool mismatch: intent='{intent}' expected tool like '{expected_tool}' "
            f"but got '{tool_used}'."
        )
    return False, ""


def _check_missing_citations(
    intent: Optional[str],
    tool_used: Optional[str],
    response: str,
    rag_context: Optional[str],
) -> tuple[bool, str]:
    """
    Flag if a RAG-based answer lacks source citations.
    Only applies when tool is a RAG tool AND context was retrieved.
    """
    if not tool_used or not rag_context:
        return False, ""

    tool_lower = tool_used.lower().replace("-", "_").replace(" ", "_")
    is_rag_tool = any(rag_tool in tool_lower for rag_tool in RAG_TOOLS)
    if not is_rag_tool:
        return False, ""

    # Check context was actually non-trivial
    if len(rag_context.strip()) < 50:
        return False, ""

    # Check if any citation pattern appears in the response
    response_lower = response.lower()
    has_citation = any(
        re.search(pattern, response_lower)
        for pattern in CITATION_PATTERNS
    )

    if not has_citation:
        return True, (
            f"Missing citations: '{tool_used}' is a RAG tool but response "
            f"contains no source references (timestamps, page numbers, etc.)."
        )
    return False, ""


# ─── Main Evaluator ─────────────────────────────────────────────────────────

class MentorEvaluator:
    """
    Evaluates Mentor AI response quality using heuristic rule checks.

    All checks are deterministic and require zero LLM API calls.
    """

    def evaluate_response(
        self,
        question: str,
        intent: Optional[str],
        tool_used: Optional[str],
        response: str,
        rag_context: Optional[str] = None,
    ) -> EvalResult:
        """
        Run all quality checks on a single mentor response.

        Args:
            question:    The user's original input.
            intent:      Detected intent type string.
            tool_used:   Tool that was invoked for this response.
            response:    The final response text shown to the user.
            rag_context: Retrieved context chunks (for RAG tools), if any.

        Returns:
            EvalResult with pass/fail, score, flags, and per-check results.
        """
        flags = []
        notes = []
        checks = {}

        # 1. Empty response check
        empty, empty_note = _check_empty_response(response)
        checks["empty_response"] = empty
        if empty:
            flags.append("empty_response")
            notes.append(empty_note)

        # 2. Hallucination risk check
        halluc, halluc_note = _check_hallucination_risk(response, rag_context)
        checks["hallucination_risk"] = halluc
        if halluc:
            flags.append("hallucination_risk")
            notes.append(halluc_note)

        # 3. Wrong tool usage check
        wrong_tool, tool_note = _check_wrong_tool_usage(intent, tool_used)
        checks["wrong_tool_usage"] = wrong_tool
        if wrong_tool:
            flags.append("wrong_tool_usage")
            notes.append(tool_note)

        # 4. Missing citations check
        no_citations, citation_note = _check_missing_citations(intent, tool_used, response, rag_context)
        checks["missing_citations"] = no_citations
        if no_citations:
            flags.append("missing_citations")
            notes.append(citation_note)

        # ── Score calculation ───────────────────────────────────────────────
        # Start at 1.0, deduct per flag with different weights
        deductions = {
            "empty_response":    0.5,
            "hallucination_risk": 0.25,
            "wrong_tool_usage":  0.15,
            "missing_citations": 0.10,
        }
        score = 1.0
        for flag in flags:
            score -= deductions.get(flag, 0.1)
        score = max(0.0, score)

        passed = len(flags) == 0 or (
            "empty_response" not in flags
            and "wrong_tool_usage" not in flags
        )

        if not notes:
            notes.append("All quality checks passed.")

        logger.debug(
            f"[MentorEvaluator] intent={intent} tool={tool_used} "
            f"score={score:.2f} flags={flags}"
        )

        return EvalResult(
            passed=passed,
            score=score,
            flags=flags,
            notes=notes,
            checks=checks,
        )


# ── Singleton for import convenience ────────────────────────────────────────
mentor_evaluator = MentorEvaluator()
