"""
Prompt Manager - Tracks AI
============================
Unified facade for all prompts. Import this class everywhere
instead of individual prompt modules.
"""
from __future__ import annotations

from app.core.prompts.assessment import build_assessment_prompt
from app.core.prompts.prerequisite import build_prerequisite_prompt
from app.core.prompts.roadmap import build_roadmap_prompt
from app.core.prompts.timeline import build_timeline_prompt
from app.core.prompts.quiz import build_quiz_prompt, build_explanation_prompt
from app.core.prompts.topic_content import build_topic_content_prompt
from app.core.prompts.explain import build_explain_prompt, VALID_MODES as EXPLAIN_MODES


class PromptManager:
    """Central registry for all LLM prompts in Tracks AI."""

    # Roadmap pipeline
    @staticmethod
    def assessment(skill: str, answers: dict) -> str:
        return build_assessment_prompt(skill=skill, answers=answers)

    @staticmethod
    def prerequisite(assessment_result: dict) -> str:
        return build_prerequisite_prompt(assessment_result=assessment_result)

    @staticmethod
    def roadmap(prerequisite_result: dict) -> str:
        return build_roadmap_prompt(prerequisite_result=prerequisite_result)

    @staticmethod
    def timeline(roadmap: dict, preferences: dict) -> str:
        return build_timeline_prompt(roadmap=roadmap, preferences=preferences)

    # Topic tasks
    @staticmethod
    def quiz(
        topic_name: str,
        skill: str,
        count: int,
        difficulty_mix: str,
        existing_questions: list | None = None,
    ) -> str:
        return build_quiz_prompt(
            topic_name=topic_name,
            skill=skill,
            count=count,
            difficulty_mix=difficulty_mix,
            existing_questions=existing_questions,
        )

    @staticmethod
    def quiz_explanation(
        question: str,
        options: list,
        correct_answer: str,
        user_answer: str,
    ) -> str:
        return build_explanation_prompt(
            question=question,
            options=options,
            correct_answer=correct_answer,
            user_answer=user_answer,
        )

    @staticmethod
    def topic_content(topic_name: str, skill: str) -> str:
        return build_topic_content_prompt(topic_name=topic_name, skill=skill)

    @staticmethod
    def explain(topic: str, mode: str) -> str:
        return build_explain_prompt(topic=topic, mode=mode)

    @staticmethod
    def explain_modes() -> frozenset:
        return EXPLAIN_MODES
