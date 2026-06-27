"""Prerequisite analysis prompts - Tracks AI Prompt Manager"""

PREREQUISITE_PROMPT = """You are a prerequisite analysis agent.

Skill:
{skill}

Current Level:
{current_level}

Strengths:
{strengths}

Weaknesses:
{weaknesses}

Determine:

1. Missing prerequisites.
2. Topics needing revision.
3. Recommended learning order.
4. Whether prerequisites are satisfied.

Return structured output."""


def build_prerequisite_prompt(assessment_result: dict) -> str:
    return PREREQUISITE_PROMPT.format(
        skill=assessment_result.get("skill", ""),
        current_level=assessment_result.get("current_level", ""),
        strengths=assessment_result.get("strengths", []),
        weaknesses=assessment_result.get("weaknesses", []),
    )
