import logging
import re
from typing import Any, List, Optional, Type

from pydantic import BaseModel, Field, field_validator
from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_core.tools import BaseTool

from app.mentor.providers.base import MentorLLM

logger = logging.getLogger("mentor.tools.explain")


# ─────────────────────────────────────────────────────────────────────────────
# Domain detection helpers
# ─────────────────────────────────────────────────────────────────────────────

DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "programming_basics": [
        "variable", "variables", "assignment", "data type", "integer", "string", "boolean",
        "operator", "operators", "expression", "statement", "comment", "print", "input",
        "syntax", "indentation", "keyword", "identifier", "literal", "constant",
        "loop", "for loop", "while loop", "if statement", "conditional", "elif", "else",
        "function", "def", "return", "argument", "parameter", "scope", "global", "local",
        "list", "tuple", "dictionary", "set", "array", "index", "slice",
        "string formatting", "f-string", "type casting", "type conversion",
        "immutable", "mutable", "pass by reference", "pass by value",
        "module", "import", "pip", "package", "library",
    ],
    "cs_fundamentals": [
        "data structure", "data structures", "algorithm", "algorithms", "complexity",
        "big o", "time complexity", "space complexity",
        "array", "linked list", "stack", "queue", "deque", "heap", "tree", "binary tree",
        "binary search tree", "graph", "hash table", "hash map", "trie",
        "sorting", "searching", "recursion", "dynamic programming", "greedy",
        "depth first", "breadth first", "dfs", "bfs", "traversal",
        "pointer", "node", "edge", "vertex", "adjacency", "cycle",
    ],
    "machine_learning": [
        "machine learning", "ml", "model", "training", "test", "validation",
        "feature", "label", "supervised", "unsupervised", "reinforcement",
        "regression", "classification", "clustering", "neural network",
        "gradient descent", "loss function", "cost function", "backpropagation",
        "overfitting", "underfitting", "bias", "variance", "regularization",
        "learning rate", "epoch", "batch", "optimizer", "activation function",
        "relu", "sigmoid", "softmax", "cross entropy", "accuracy", "precision", "recall",
        "decision tree", "random forest", "svm", "k-means", "pca", "embedding",
        "transformer", "attention", "bert", "gpt", "llm", "fine-tuning",
    ],
    "web_development": [
        "html", "css", "javascript", "react", "next.js", "typescript",
        "api", "rest", "http", "request", "response", "endpoint", "route",
        "frontend", "backend", "fullstack", "server", "client", "database",
        "sql", "nosql", "mongodb", "postgres", "authentication", "jwt",
        "dom", "component", "hook", "state", "props", "context",
        "async", "promise", "fetch", "axios", "cors", "middleware",
    ],
    "python_advanced": [
        "decorator", "generator", "iterator", "comprehension", "lambda",
        "class", "object", "inheritance", "polymorphism", "encapsulation",
        "dunder", "magic method", "metaclass", "mixin", "abstract",
        "context manager", "with statement", "exception", "try except",
        "threading", "multiprocessing", "asyncio", "coroutine", "await",
        "closure", "higher order function", "first class function",
    ],
}

DOMAIN_GUIDANCE: dict[str, str] = {
    "programming_basics": (
        "This is a PROGRAMMING BASICS topic. "
        "- Use Python code examples with clear inline comments.\n"
        "- Show variable declarations, assignment operators (`=`), and type examples.\n"
        "- Highlight common beginner errors (confusing `=` with `==`, etc.).\n"
        "- Keep explanations conversational and grounded."
    ),
    "cs_fundamentals": (
        "This is a COMPUTER SCIENCE FUNDAMENTALS topic. "
        "- Include a diagram description (e.g., 'imagine a node pointing left and right').\n"
        "- Show time and space complexity using Big O notation.\n"
        "- Provide Python code implementing the core operation.\n"
        "- Highlight real-world use cases (databases, file systems, etc.)."
    ),
    "machine_learning": (
        "This is a MACHINE LEARNING topic. "
        "- Include a mathematical intuition in plain English before any formula.\n"
        "- Show a Python implementation (using NumPy, sklearn, or PyTorch as appropriate).\n"
        "- Explain what happens when the concept is applied incorrectly.\n"
        "- Connect to loss functions and optimization when relevant."
    ),
    "web_development": (
        "This is a WEB DEVELOPMENT topic. "
        "- Include a working code snippet (HTML/CSS/JS/React as relevant).\n"
        "- Explain the client-server relationship where appropriate.\n"
        "- Mention browser or runtime environment context.\n"
        "- Highlight security considerations if relevant (XSS, CORS, JWT, etc.)."
    ),
    "python_advanced": (
        "This is a PYTHON ADVANCED topic. "
        "- Show the concept with a minimal working example first, then a complex one.\n"
        "- Explain WHY Python implements it this way (CPython internals if relevant).\n"
        "- Compare to simpler constructs (e.g., 'a generator is like a list but lazy').\n"
        "- Highlight performance and memory implications."
    ),
    "general": (
        "This is a general concept. "
        "- Use an analogy to everyday life to introduce the concept.\n"
        "- Provide a code example or pseudocode if the topic is technical.\n"
        "- Relate the concept to the student's learning path where possible."
    ),
}


def detect_domain(concept: str) -> str:
    """Detect the subject domain of the requested concept."""
    lower = concept.lower()
    best_domain = "general"
    best_score = 0

    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in lower)
        if score > best_score:
            best_score = score
            best_domain = domain

    return best_domain


def clean_concept(concept: str) -> str:
    """
    Strip common prefixes so the extracted concept is clean.
    E.g. 'Explain this subtopic: Variables and Assignment' → 'Variables and Assignment'
    """
    patterns = [
        r"^explain\s+this\s+subtopic\s*[:\-]\s*",
        r"^explain\s+the\s+subtopic\s*[:\-]\s*",
        r"^explain\s+subtopic\s*[:\-]\s*",
        r"^explain\s+concept\s*[:\-]\s*",
        r"^explain\s+this\s+concept\s*[:\-]\s*",
        r"^explain\s+",
        r"^what\s+is\s+",
        r"^what\s+are\s+",
        r"^define\s+",
        r"^teach\s+me\s+",
    ]
    stripped = concept.strip()
    for pat in patterns:
        cleaned = re.sub(pat, "", stripped, flags=re.IGNORECASE).strip()
        if cleaned and cleaned != stripped:
            return cleaned
    return stripped


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic schema
# ─────────────────────────────────────────────────────────────────────────────

class ExplainConceptInput(BaseModel):
    """Validated input for ExplainConceptTool."""
    concept: str = Field(
        description="The concept or subtopic to explain (e.g., 'Variables and Assignment', 'Gradient Descent')"
    )
    level: str = Field(
        default="intermediate",
        description="Student level: 'beginner' | 'intermediate' | 'advanced'"
    )
    context: Optional[str] = Field(
        default=None,
        description="Optional: roadmap/learning context from prior conversation or student progress"
    )
    roadmap_context: Optional[str] = Field(
        default=None,
        description="Optional: student's active roadmap topic for contextualizing the explanation"
    )

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in {"beginner", "intermediate", "advanced"}:
            raise ValueError(f"level must be one of beginner/intermediate/advanced, got {v!r}")
        return v

    @field_validator("concept")
    @classmethod
    def validate_concept(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("concept cannot be empty")
        return v.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Main Tool
# ─────────────────────────────────────────────────────────────────────────────

class ExplainConceptTool(BaseTool):
    """
    Teaches programming, CS, and AI concepts with strict topic adherence,
    domain-aware pedagogy, and structured response format.
    """
    name: str = "explain_concept"
    description: str = (
        "Use when the student wants to understand a concept or subtopic. "
        "Input: exact concept/subtopic name, student level (beginner/intermediate/advanced), "
        "optional conversation context, optional roadmap context. "
        "Output: strict structured explanation focused ONLY on the requested concept."
    )
    args_schema: Type[BaseModel] = ExplainConceptInput
    mentor_llm: Optional[MentorLLM] = Field(default=None)

    model_config = {"arbitrary_types_allowed": True}

    _LEVEL_GUIDANCE = {
        "beginner": (
            "The student is a BEGINNER. Use extremely simple language. "
            "No jargon — define every technical term you introduce. "
            "Use relatable everyday analogies. Keep code examples short (under 10 lines)."
        ),
        "intermediate": (
            "The student has basic programming knowledge. "
            "You may use standard terminology but briefly explain advanced terms. "
            "Include realistic code examples with 10-20 lines and inline comments."
        ),
        "advanced": (
            "The student is ADVANCED. Be precise and technically rigorous. "
            "Include edge cases, performance characteristics, and design trade-offs. "
            "Code examples may be complex and production-grade."
        ),
    }

    def _build_system_prompt(
        self,
        clean_topic: str,
        level: str,
        domain: str,
        roadmap_context: Optional[str],
    ) -> str:
        level_guide = self._LEVEL_GUIDANCE[level]
        domain_guide = DOMAIN_GUIDANCE.get(domain, DOMAIN_GUIDANCE["general"])
        roadmap_note = ""
        if roadmap_context:
            roadmap_note = (
                f"\n\nSTUDENT ROADMAP CONTEXT:\n"
                f"The student is currently studying: {roadmap_context}\n"
                f"Frame your explanation to build on their existing roadmap knowledge where relevant."
            )

        return f"""You are Tracks AI Mentor — a precise, expert teaching assistant.
You teach based on each student's learning roadmap and exact questions.
You are knowledgeable, clear, and focused. You NEVER explain unrelated concepts.

━━━ CRITICAL RULES ━━━
1. You must explain ONLY the topic: **{clean_topic}**
2. Do NOT drift to other topics, even related ones (unless directly necessary to explain {clean_topic}).
3. Do NOT add a generic preamble. Start immediately with the explanation.
4. Every section must directly relate to **{clean_topic}**.
5. If the student's question contains the phrase "Explain this subtopic:", the subtopic after the colon is your ONLY target.

━━━ DOMAIN GUIDANCE ━━━
{domain_guide}

━━━ STUDENT LEVEL ━━━
{level_guide}{roadmap_note}

━━━ REQUIRED RESPONSE STRUCTURE ━━━
Use EXACTLY this structure. Replace placeholders with real content:

## What is {clean_topic}?
[Beginner-friendly one-paragraph definition. Do NOT mention other topics.]

## Why It Matters
[1–2 sentences on practical importance in real projects or the student's career goal.]

## Example
[Concrete code or worked example using {clean_topic} specifically. Add inline comments.]

## Common Mistakes
[2–3 specific student mistakes when learning {clean_topic}. Be precise.]

## Quick Summary
- [Key fact 1 about {clean_topic}]
- [Key fact 2 about {clean_topic}]
- [Key fact 3 about {clean_topic}]
- [Key fact 4 about {clean_topic}]
- [Key fact 5 about {clean_topic}]"""

    def _build_messages(
        self,
        concept: str,
        level: str,
        context: Optional[str],
        roadmap_context: Optional[str],
    ) -> List[BaseMessage]:
        # Strip common prefixes to get the true topic
        clean_topic = clean_concept(concept)
        domain = detect_domain(clean_topic)

        logger.info(
            f"[ExplainConceptTool] concept='{clean_topic}' | domain={domain} | level={level}"
        )

        system = self._build_system_prompt(clean_topic, level, domain, roadmap_context)
        user_content = f"Explain this topic: {clean_topic}"
        if context:
            user_content += f"\n\nConversation context (for reference only): {context}"

        return [SystemMessage(content=system), HumanMessage(content=user_content)]

    def _validate_response(self, response: str, concept: str) -> bool:
        """
        Verify the response actually discusses the requested topic.
        Returns True if the response appears relevant, False if it needs regeneration.
        """
        clean_topic = clean_concept(concept).lower()
        # Extract first significant word(s) — at least 4 characters
        topic_words = [w for w in clean_topic.split() if len(w) >= 4]
        if not topic_words:
            return True  # Can't validate a single short word, assume ok

        response_lower = response.lower()
        # Require at least half the key topic words to appear in the response
        hits = sum(1 for w in topic_words if w in response_lower)
        coverage = hits / len(topic_words)
        is_valid = coverage >= 0.5

        if not is_valid:
            logger.warning(
                f"[ExplainConceptTool] Response validation failed for '{clean_topic}': "
                f"only {hits}/{len(topic_words)} topic words found."
            )
        return is_valid

    def _run(
        self,
        concept: str,
        level: str = "intermediate",
        context: Optional[str] = None,
        roadmap_context: Optional[str] = None,
    ) -> str:
        """Sync execution."""
        if self.mentor_llm is None:
            clean_topic = clean_concept(concept)
            return f"[Mock ExplainConcept] Would explain: '{clean_topic}' at {level} level."
        try:
            messages = self._build_messages(concept, level, context, roadmap_context)
            response = self.mentor_llm.invoke(messages)
            result = response.content

            # Validate; regenerate once if off-topic
            if not self._validate_response(result, concept):
                logger.info("[ExplainConceptTool] Regenerating response (failed topic validation)")
                response = self.mentor_llm.invoke(messages)
                result = response.content

            return result
        except Exception as e:
            logger.error(f"ExplainConceptTool._run failed: {e}")
            return f"Error generating explanation for '{concept}': {e}"

    async def _arun(
        self,
        concept: str,
        level: str = "intermediate",
        context: Optional[str] = None,
        roadmap_context: Optional[str] = None,
    ) -> str:
        """Async execution."""
        if self.mentor_llm is None:
            clean_topic = clean_concept(concept)
            return f"[Mock ExplainConcept] Would explain: '{clean_topic}' at {level} level."
        try:
            messages = self._build_messages(concept, level, context, roadmap_context)
            response = await self.mentor_llm.ainvoke(messages)
            result = response.content

            # Validate; regenerate once if off-topic
            if not self._validate_response(result, concept):
                logger.info("[ExplainConceptTool] Regenerating response (failed topic validation)")
                response = await self.mentor_llm.ainvoke(messages)
                result = response.content

            return result
        except Exception as e:
            logger.error(f"ExplainConceptTool._arun failed: {e}")
            return f"Error generating explanation for '{concept}': {e}"
