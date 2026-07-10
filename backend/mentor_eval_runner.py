"""
Tracks AI Mentor — Production AI Evaluation & Observability Runner
====================================================================
Loads the evaluation dataset, runs intent classification routing,
simulates RAG and response quality checks, persists usage metrics,
aggregates analytics, and outputs the final Phase 9 markdown report.
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_database
from app.mentor.deps import get_mentor_llm
from app.mentor.router.detector import IntentDetector
from app.mentor.observability.rag_evaluator import evaluate_retrieval
from app.mentor.observability.mentor_evaluator import mentor_evaluator
from app.mentor.observability.cost_tracker import log_usage, estimate_cost, get_model_name_from_llm, get_provider_name_from_llm
from app.mentor.observability import mentor_analytics


async def run_evaluation():
    print("=" * 70)
    print("STARTING: Tracks AI Mentor Observability & Evaluation Runner")
    print("=" * 70)

    # 1. Initialize MongoDB connection
    try:
        await connect_to_mongo()
        db = get_database()
        if db is None:
            raise ValueError("Database instance is None")
    except Exception as e:
        print(f"[ERROR] MongoDB initialization failed: {e}")
        sys.exit(1)

    # 2. Initialize LLM & Intent Detector
    try:
        mentor_llm = get_mentor_llm()
        detector = IntentDetector(llm=mentor_llm)
        model_name = get_model_name_from_llm(mentor_llm.llm)
        provider_name = get_provider_name_from_llm(mentor_llm.llm)
        print(f"[OK] Loaded LLM Provider: {provider_name.upper()} | Model: {model_name}")
    except Exception as e:
        print(f"[ERROR] LLM initialization failed: {e}")
        await close_mongo_connection()
        sys.exit(1)

    # 3. Load Intent Classification Evaluation Dataset
    dataset_path = os.path.join("tests", "mentor", "evaluation", "intent_eval.json")
    if not os.path.exists(dataset_path):
        print(f"[ERROR] Evaluation dataset not found at {dataset_path}")
        await close_mongo_connection()
        sys.exit(1)

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    cases = dataset.get("cases", [])
    total_cases = len(cases)
    print(f"Loaded {total_cases} test cases from dataset.")

    # 4. Run Intent Classification Tests
    print("\n--- Running Intent Classification routing tests... ---")
    intent_results = []
    correct_count = 0
    total_latency_ms = 0
    total_cost_usd = 0.0
    failed_cases = []

    # Clean previous evaluation logs from database to ensure pristine analytics
    await db["mentor_usage_logs"].delete_many({"user_id": "eval_test_user"})

    for i, case in enumerate(cases, 1):
        case_id = case["id"]
        user_input = case["input"]
        expected_intent = case["expected_intent"]
        expected_tool = case["expected_tool"]

        start_time = time.time()
        # Run intent detector (Stage 1 keywords -> Stage 2 LLM)
        result = await detector.detect(user_input)
        latency_ms = int((time.time() - start_time) * 1000)
        total_latency_ms += latency_ms

        detected_intent = result.intent_type.value
        detected_tool = result.tool_name
        is_correct = detected_intent == expected_intent

        if is_correct:
            correct_count += 1
        else:
            failed_cases.append({
                "id": case_id,
                "input": user_input,
                "expected": expected_intent,
                "detected": detected_intent,
                "by": result.detected_by,
                "reasoning": result.reasoning
            })

        # Calculate estimated cost
        input_tokens = 0
        output_tokens = 0
        cost = 0.0
        if result.detected_by == "llm":
            # Intent classification LLM calls use structured outputs:
            # Input contains INTENT_SYSTEM_PROMPT (~250 tokens) + query. Output contains intent structure (~50 tokens).
            input_tokens = 300
            output_tokens = 50
            cost = estimate_cost(model_name, input_tokens, output_tokens)
            total_cost_usd += cost

        # Persist request metrics to database
        await log_usage(
            user_id="eval_test_user",
            model=model_name,
            provider=provider_name,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            tool_used=detected_tool,
            intent=detected_intent,
            session_id="eval_session",
            latency_ms=latency_ms
        )

        intent_results.append({
            "id": case_id,
            "input": user_input,
            "expected": expected_intent,
            "detected": detected_intent,
            "correct": is_correct,
            "by": result.detected_by,
            "latency_ms": latency_ms,
            "cost_usd": cost
        })

    accuracy = (correct_count / total_cases) * 100
    avg_latency = total_latency_ms / total_cases
    print(f"Accuracy: {accuracy:.1f}% ({correct_count}/{total_cases})")
    print(f"Avg Latency: {avg_latency:.1f} ms")
    print(f"Avg Cost: ${total_cost_usd / total_cases:.6f}")

    # 5. Run RAG Quality Evaluation Tests
    print("\n--- Running RAG Quality metric evaluations (PDF / YouTube Agents)... ---")
    rag_test_cases = [
        {
            "type": "PDF",
            "question": "What is reinforcement learning in neural networks?",
            "chunks": [
                "Reinforcement learning (RL) is an area of machine learning concerned with how intelligent agents ought to take actions in an environment to maximize some notion of cumulative reward.",
                "In neural networks, RL algorithms use deep networks (Deep Q-Networks or DQN) to approximate the policy function or value function, allowing agents to learn directly from high-dimensional state inputs."
            ],
            "answer": "Reinforcement learning is a subfield of machine learning where neural networks approximate the policy or value functions, directing agent actions in an environment to optimize cumulative reward."
        },
        {
            "type": "YouTube",
            "question": "How to deploy a python fastap web service?",
            "chunks": [
                "To deploy a FastAPI application to production, you generally run it behind a Uvicorn ASGI server or Gunicorn worker process. You can wrap it inside a lightweight Docker container for portability.",
                "Uvicorn is a lightning-fast ASGI server implementation, using uvloop for high concurrency. Always set reload=False in production configurations."
            ],
            "answer": "FastAPI is deployed in production using Uvicorn or Gunicorn inside Docker. Uvicorn acts as the high-speed ASGI server with reload=False."
        },
        {
            "type": "Failed RAG",
            "question": "Explain quantum computing qubit superposition",
            "chunks": [
                "Python is an interpreted, high-level, general-purpose programming language. Its design philosophy emphasizes code readability with use of significant indentation.",
                "A virtual environment is a tool that helps to keep the dependencies required by different projects separate by creating isolated python virtual environments."
            ],
            "answer": "A qubit can be in a superposition state of both 0 and 1 simultaneously, unlike classical bits."
        }
    ]

    rag_results = []
    for case in rag_test_cases:
        eval_res = evaluate_retrieval(case["question"], case["chunks"], case["answer"])
        rag_results.append({
            "type": case["type"],
            "question": case["question"],
            "chunks_count": len(case["chunks"]),
            "scores": eval_res.to_dict()
        })

    # 6. Run Response Quality Evaluator Tests
    print("\n--- Running Response Quality Check evaluations... ---")
    quality_cases = [
        {
            "name": "Empty Response Check",
            "question": "Explain recursive algorithms.",
            "intent": "explain_concept",
            "tool": "ExplainConceptTool",
            "response": "I don't know.",
            "context": ""
        },
        {
            "name": "Hallucination Risk Check",
            "question": "When was the standard definition of gradient descent published?",
            "intent": "explain_concept",
            "tool": "ExplainConceptTool",
            "response": "According to the official definition of gradient descent, the standard mathematical formulation was published in 1847.",
            "context": ""  # empty context raises hallucination risk
        },
        {
            "name": "Wrong Tool Usage Check",
            "question": "Quiz me on python dictionaries.",
            "intent": "generate_quiz",
            "tool": "ExplainConceptTool",  # mismatched tool
            "response": "Sure, here is an explanation of dictionaries in python...",
            "context": ""
        },
        {
            "name": "Good Response with Citations Check",
            "question": "What does the tutorial video explain at minute 2?",
            "intent": "youtube_question",
            "tool": "youtube_tool",
            "response": "According to the video transcript at 02:30, you should install faster-whisper dependency for CPU friendly execution.",
            "context": "The video transcript states at 02:30 that you should install faster-whisper on CPU."
        }
    ]

    quality_results = []
    for case in quality_cases:
        eval_res = mentor_evaluator.evaluate_response(
            question=case["question"],
            intent=case["intent"],
            tool_used=case["tool"],
            response=case["response"],
            rag_context=case["context"]
        )
        quality_results.append({
            "name": case["name"],
            "question": case["question"],
            "flags": eval_res.flags,
            "score": eval_res.score,
            "passed": eval_res.passed,
            "notes": eval_res.notes
        })

    # 7. Aggregate Admin Analytics
    print("\n--- Generating Admin Analytics dashboard aggregations... ---")
    summary = await mentor_analytics.get_usage_summary(days=1)
    tool_dist = await mentor_analytics.get_tool_distribution(days=1)
    model_dist = await mentor_analytics.get_model_distribution(days=1)
    intent_dist = await mentor_analytics.get_intent_distribution(days=1)

    # 8. Generate Phase 9 Evaluation Report
    report_content = f"""# AI Evaluation & Observability Layer Report (Phase 9)

## Executive Summary
This report summarizes the performance, accuracy, RAG retrieval quality, response constraints, and operational cost metrics gathered by the Tracks AI Mentor Evaluation & Observability layer.

* **Evaluation Run Timestamp**: `{datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")}`
* **Tested Model**: `{model_name}`
* **Tested Provider**: `{provider_name.upper()}`

---

## 1. Intent Classification Accuracy (50 Labeled Queries)

The intent detector was evaluated across **{total_cases} test queries** spanning all 9 intent types.

| Metric | Value |
|---|---|
| **Total Test Queries** | {total_cases} |
| **Successful Classifications** | {correct_count} |
| **Failed Classifications** | {len(failed_cases)} |
| **Routing Accuracy** | **{accuracy:.1f}%** |
| **Average Detection Latency** | {avg_latency:.1f} ms |
| **Average Cost per Request** | ${total_cost_usd / total_cases:.6f} USD |

### Classification Success vs. Failure Examples

"""

    if failed_cases:
        report_content += "### Labeled Mismatches (Failed Cases)\n\n| Case ID | Input | Expected Intent | Detected Intent | Stage | Reasoning |\n|---|---|---|---|---|---|\n"
        for fc in failed_cases:
            report_content += f"| {fc['id']} | `{fc['input']}` | `{fc['expected']}` | `{fc['detected']}` | `{fc['by']}` | {fc['reasoning']} |\n"
    else:
        report_content += "✔️ **100% Intent Routing Accuracy achieved on all 50 query pathways!**\n"

    report_content += """
---

## 2. RAG Quality Evaluation (PDF & YouTube Agents)

Retrieval and Groundedness metrics evaluated using heuristic keyword-overlap analysis (Jaccard harmonic F1 scoring):

| RAG Scenario | Question | Context Relevance | Answer Groundedness | Retrieval Score | Decision | Notes |
|---|---|---|---|---|---|---|
"""

    for rr in rag_results:
        passed_str = "🟢 PASS" if rr["scores"]["passed"] else "🔴 FAIL"
        notes_str = ", ".join(rr["scores"]["notes"])
        report_content += f"| {rr['type']} | *\"{rr['question']}\"* | {rr['scores']['context_relevance']:.3f} | {rr['scores']['answer_groundedness']:.3f} | **{rr['scores']['retrieval_score']:.3f}** | {passed_str} | {notes_str} |\n"

    report_content += """
---

## 3. Response Quality Checks (Mentor Quality Evaluator)

Response validation checks verifying constraints on empty answers, hallucination risks, wrong tool usages, and missing citations:

| Quality Test Check | Query | Validation Output Notes | Penalty Score | Decision |
|---|---|---|---|---|
"""

    for qr in quality_results:
        passed_str = "🟢 PASSED" if qr["passed"] else "🔴 FLAGGED"
        notes_str = "; ".join(qr["notes"])
        report_content += f"| **{qr['name']}** | *\"{qr['question']}\"* | {notes_str} | {qr['score']:.2f} / 1.00 | {passed_str} |\n"

    report_content += f"""
---

## 4. Admin Analytics Dashboard Data (MongoDB Aggregated)

Usage aggregation statistics fetched dynamically from the `mentor_usage_logs` collection:

### Overall Usage Summary
* **Total Evaluation Requests Logging**: {summary.get('total_requests', 0)}
* **Total Estimated API Expense**: ${summary.get('total_cost_usd', 0.0):.6f} USD
* **Total Tokens Consumed**: {summary.get('total_input_tokens', 0) + summary.get('total_output_tokens', 0)} (Input: {summary.get('total_input_tokens', 0)}, Output: {summary.get('total_output_tokens', 0)})
* **Average Graph Latency**: {summary.get('avg_latency_ms', 0.0)} ms

### Active Intent Routing Frequency
| Intent Category | Request Count | Cumulative Cost (USD) |
|---|---|---|
"""

    for item in intent_dist:
        report_content += f"| `{item['intent']}` | {item['count']} | ${item['total_cost_usd']:.6f} |\n"

    report_content += """

### Active Tool Invocation Distribution
| Tool / Agent Invoked | Invocations | Total USD Cost | Avg Token Size |
|---|---|---|---|
"""

    for item in tool_dist:
        report_content += f"| `{item['tool']}` | {item['count']} | ${item['total_cost_usd']:.6f} | {item['avg_tokens']} |\n"

    report_content += """

### Active Model Distribution
| Model Name | Provider | Invocations | Total Cost (USD) |
|---|---|---|---|
"""

    for item in model_dist:
        report_content += f"| `{item['model']}` | `{item['provider']}` | {item['count']} | ${item['total_cost_usd']:.6f} |\n"

    report_content += """
---
*End of Phase 9 AI Evaluation & Observability Report.*
"""

    # Save report locally to backend directory
    report_path = "AI_EVALUATION_PHASE9_REPORT.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"\nReport successfully saved to: {os.path.abspath(report_path)}")

    # Clean up DB after run so it does not pollute regular test database
    await db["mentor_usage_logs"].delete_many({"user_id": "eval_test_user"})
    await close_mongo_connection()

    # Create user-facing artifact in brain folder
    return report_content


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    report = loop.run_until_complete(run_evaluation())
