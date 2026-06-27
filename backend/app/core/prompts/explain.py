"""Re-explain prompts - Tracks AI Prompt Manager"""

EXPLAIN_PROMPTS: dict[str, str] = {
    "eli12": (
        "You are a patient tutor explaining to a 12-year-old. "
        "Use simple words, a fun analogy, and short sentences. Max 120 words. "
        "Topic: {topic}"
    ),
    "real_example": (
        "Give ONE concrete real-life example that explains: {topic}. "
        "Use something tangible (phones, games, food, money). Under 100 words. Be vivid."
    ),
    "analogy": (
        "Create ONE strong visual analogy that explains: {topic}. "
        "Use a physical object or scene. Under 100 words. Make it memorable."
    ),
    "simplify": (
        "Give the absolute minimum explanation of: {topic}. "
        "Bullet points preferred. Under 80 words. Core idea + one tiny example."
    ),
}

VALID_MODES = frozenset(EXPLAIN_PROMPTS.keys())


def build_explain_prompt(topic: str, mode: str) -> str:
    if mode not in VALID_MODES:
        raise ValueError(f"Invalid explain mode: {mode!r}. Choose: {', '.join(VALID_MODES)}")
    return EXPLAIN_PROMPTS[mode].format(topic=topic)
