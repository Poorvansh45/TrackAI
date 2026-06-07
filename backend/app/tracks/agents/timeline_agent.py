"""
Timeline Planner Agent — Tracks AI.
Source: TaskAI backend/src/agents/timeline_agent.py

Exposes:
    run_timeline_generation(roadmap, preferences) -> TimelineOutput
    timeline_node(state)                          -> dict  (for LangGraph)
"""

from app.tracks.llm.gemini import get_llm
from app.tracks.schemas.timeline_schema import TimelineOutput


def run_timeline_generation(roadmap: dict, preferences: dict) -> TimelineOutput:
    """
    Convert the learning roadmap into a personalized weekly study schedule.

    Args:
        roadmap:     dict produced by the Roadmap Agent (RoadmapOutput).
        preferences: dict with keys: daily_hours, weekly_availability,
                     learning_style, goal.

    Returns:
        TimelineOutput with week-by-week schedule and estimated duration.
    """
    llm = get_llm()
    structured_llm = llm.with_structured_output(TimelineOutput)

    prompt = f"""
You are an expert learning timeline planner.

Create a personalized study schedule.

Roadmap:

{roadmap}

User Preferences:

{preferences}

Instructions:

1. Create a realistic weekly schedule.

2. Adjust duration based on:
   - daily study hours
   - weekly availability
   - learning goal

3. Each week should include:
   - focus area
   - expected study hours
   - milestones

4. Personalize recommendations based on learning style:

   If learning_style is "Visual":
   - Recommend video tutorials
   - Diagrams
   - Visual explanations
   - Infographics

   If learning_style is "Reading":
   - Recommend books
   - Documentation
   - Blogs
   - Articles

   If learning_style is "Audio":
   - Recommend podcasts
   - Lectures
   - Audio explanations

   If learning_style is "Hands-On":
   - Focus heavily on projects
   - Coding exercises
   - Practical assignments
   - Build-first approach

5. If goal is:
   - Internship -> prioritize projects + interview prep
   - Placement -> DSA + interview preparation
   - Startup -> product building + deployment
   - Freelancing -> client projects + portfolio
   - Personal Growth -> balanced learning

6. Return structured output only.
"""

    return structured_llm.invoke(prompt)


# ---------------------------------------------------------------------------
# LangGraph node
# ---------------------------------------------------------------------------

def timeline_node(state: dict) -> dict:
    """
    LangGraph node that wraps run_timeline_generation.
    Reads state["roadmap_result"] and state["user_preferences"].
    Writes state["timeline_result"].
    """
    result = run_timeline_generation(
        roadmap=state["roadmap_result"],
        preferences=state["user_preferences"],
    )
    return {"timeline_result": result.model_dump()}
