"""Topic content prompts - Tracks AI Prompt Manager
Summary capped at 200 words, quick recall at 5 bullets.
"""

TOPIC_CONTENT_PROMPT = '''You are an expert programming educator.
Generate accurate, specific educational content for the topic: "{topic_name}"
in the context of learning: "{skill}".

Return ONLY valid JSON — no markdown, no code fences, no extra text.

{{
  "overview": "3-4 sentences explaining exactly what {topic_name} is, how it works, and what makes it important. Be concrete and specific — mention actual syntax or mechanisms.",
  "why_it_matters": [
    "Specific reason 1 why {topic_name} matters (mention real use case)",
    "Specific reason 2",
    "Specific reason 3",
    "Specific reason 4",
    "Specific reason 5"
  ],
  "subtopics": [
    "Real subtopic title 1 for {topic_name}",
    "Real subtopic title 2",
    "Real subtopic title 3",
    "Real subtopic title 4",
    "Real subtopic title 5"
  ],
  "summary": [
    "Key takeaway 1 about {topic_name} — concrete fact or rule",
    "Key takeaway 2",
    "Key takeaway 3",
    "Key takeaway 4",
    "Key takeaway 5"
  ],
  "key_concepts": [
    {{"term": "technical term 1", "definition": "precise 4-7 word definition"}},
    {{"term": "technical term 2", "definition": "precise 4-7 word definition"}},
    {{"term": "technical term 3", "definition": "precise 4-7 word definition"}},
    {{"term": "technical term 4", "definition": "precise 4-7 word definition"}},
    {{"term": "technical term 5", "definition": "precise 4-7 word definition"}}
  ]
}}

RULES:
- Every sentence must be specific to {topic_name}, never generic
- subtopics must be real learnable sub-topics
- key_concepts must be real technical terms from {topic_name}
- overview must mention actual syntax, pattern, or mechanism
- why_it_matters must cite real programming scenarios
- No bullet points in overview — plain prose only
- summary must be 5 bullets, max 200 words total
- Return raw JSON only'''


def build_topic_content_prompt(topic_name: str, skill: str) -> str:
    return TOPIC_CONTENT_PROMPT.format(topic_name=topic_name, skill=skill)
