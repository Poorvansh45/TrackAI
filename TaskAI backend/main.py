"""
Tracks AI — CLI entry point.

Run the full LangGraph pipeline from the command line.

Usage:
    python main.py

The sample input mirrors the test_state used in notebook/05_tracks_ai_graph.ipynb.
"""

import json
from dotenv import load_dotenv

load_dotenv()

from src.graph.workflow import run_tracks_ai_workflow  # noqa: E402  (import after load_dotenv)


def main() -> None:
    # Sample input — matches notebook 05 test_state
    input_data = {
        "skill": "AI/ML",
        "assessment_answers": {
            "programming_experience": "Basic programming concepts",
            "python_knowledge": "Variables loops functions",
            "mathematics_background": "Algebra and equations",
            "data_handling": "Excel",
            "machine_learning": "Never heard ML concepts",
        },
        "user_preferences": {
            "daily_hours": 2,
            "weekly_availability": 5,
            "learning_style": "Visual",
            "goal": "Internship",
        },
    }

    print("Starting Tracks AI workflow...\n")
    result = run_tracks_ai_workflow(input_data)

    print("\n=== Assessment Result ===")
    print(json.dumps(result["assessment_result"], indent=2))

    print("\n=== Prerequisite Result ===")
    print(json.dumps(result["prerequisite_result"], indent=2))

    print("\n=== Roadmap Result ===")
    print(json.dumps(result["roadmap_result"], indent=2))

    print("\n=== Timeline Result ===")
    print(json.dumps(result["timeline_result"], indent=2))


if __name__ == "__main__":
    main()
