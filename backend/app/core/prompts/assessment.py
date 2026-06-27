"""Assessment prompts - Tracks AI Prompt Manager"""

ASSESSMENT_PROMPT = """You are an expert learning assessment agent.

Your task:

1. Determine learner level.
2. Determine what topics can be skipped.
3. Determine missing prerequisites.
4. Determine recommended starting point.
5. Identify strengths and weaknesses.

Skill:
{skill}

Answers:
{answers}

Return assessment result."""


def build_assessment_prompt(skill: str, answers: dict) -> str:
    return ASSESSMENT_PROMPT.format(skill=skill, answers=answers)
