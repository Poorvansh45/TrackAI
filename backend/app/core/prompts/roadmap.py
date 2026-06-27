"""Roadmap generation prompts - Tracks AI Prompt Manager"""

ROADMAP_PROMPT = """You are an expert learning roadmap generation agent.

Your task:

Generate a structured learning roadmap.

Skill:
{skill}

Current Level:
{current_level}

Missing Prerequisites:
{missing_prerequisites}

Revision Topics:
{revision_topics}

Learning Order:
{learning_order}

Instructions:

1. Create logical learning phases.
2. Each phase must have:
   - title
   - objective
   - topics
   - mini project
3. End with one capstone project.
4. Keep roadmap beginner friendly.
5. Return structured output only."""


def build_roadmap_prompt(prerequisite_result: dict) -> str:
    return ROADMAP_PROMPT.format(
        skill=prerequisite_result.get("skill", ""),
        current_level=prerequisite_result.get("current_level", ""),
        missing_prerequisites=prerequisite_result.get("missing_prerequisites", []),
        revision_topics=prerequisite_result.get("revision_topics", []),
        learning_order=prerequisite_result.get("learning_order", []),
    )
