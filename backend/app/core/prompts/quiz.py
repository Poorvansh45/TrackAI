"""Quiz generation prompts - Tracks AI Prompt Manager
Optimized: no explanations in batch — generated only on wrong answer.
"""

QUIZ_BATCH_PROMPT = (
    'Generate exactly {count} multiple-choice quiz questions about '
    '"{topic_name}" ({skill}).\n\n'
    'Difficulty mix: {difficulty_mix}\n'
    'Each question needs exactly 4 options (A-D), one correct answer. '
    'Questions must be unique, clear, and test real understanding — no trick questions.\n\n'
    '{existing_note}'
    'Respond with ONLY raw JSON. No markdown fences, no commentary, '
    'nothing before or after it. Exact shape:\n'
    '{"questions":[{"question":"...","options":['
    '{"key":"A","text":"..."},{"key":"B","text":"..."},'
    '{"key":"C","text":"..."},{"key":"D","text":"..."}],'
    '"answer":"A","difficulty":"medium"}]}'
)

QUIZ_EXPLANATION_PROMPT = (
    'The student answered "{user_answer}" to this quiz question:\n\n'
    'Question: {question}\n'
    'Options: {options}\n'
    'Correct answer: {correct_answer}\n\n'
    'In 2-3 sentences, explain why the correct answer is right '
    'and why the student\'s answer was wrong. Be clear and direct. Max 80 words.'
)


def build_quiz_prompt(
    topic_name: str,
    skill: str,
    count: int,
    difficulty_mix: str,
    existing_questions: list | None = None,
) -> str:
    existing_note = ""
    if existing_questions:
        titles = [q["question"].strip() for q in existing_questions if "question" in q]
        if titles:
            existing_note = (
                "CRITICAL: Do NOT generate questions identical or very similar to:\n"
                + "\n".join(f"- {t}" for t in titles)
                + "\n\n"
            )
    return QUIZ_BATCH_PROMPT.format(
        count=count,
        topic_name=topic_name,
        skill=skill,
        difficulty_mix=difficulty_mix,
        existing_note=existing_note,
    )


def build_explanation_prompt(
    question: str,
    options: list,
    correct_answer: str,
    user_answer: str,
) -> str:
    options_text = ", ".join(f"{o['key']}: {o['text']}" for o in options)
    return QUIZ_EXPLANATION_PROMPT.format(
        question=question,
        options=options_text,
        correct_answer=correct_answer,
        user_answer=user_answer,
    )
