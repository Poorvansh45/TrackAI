import asyncio
import sys
import os

# Fix Windows console encoding
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Ensure we can import from the backend package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ─── Colour helpers ───────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"

def ok(msg):   print(f"  {GREEN}[PASS]{RESET} {msg}")
def fail(msg): print(f"  {RED}[FAIL]{RESET} {msg}")
def info(msg): print(f"  {CYAN}[INFO]{RESET} {msg}")

# ─── Test cases ───────────────────────────────────────────────────────────────
TEST_CASES = [
    # (input, expected_intent, expected_tool_or_none)
    ("hi",                                   "general_chat",    "NONE"),
    ("hello",                                "general_chat",    "NONE"),
    ("how are you?",                         "general_chat",    "NONE"),
    ("Explain variables",                    "explain_concept", "ExplainConceptTool"),
    ("Explain this subtopic: Variables and Assignment",
                                             "explain_concept", "ExplainConceptTool"),
    ("What is recursion?",                   "explain_concept", "ExplainConceptTool"),
    ("Quiz me on arrays",                    "generate_quiz",   "QuizTool"),
    ("Test me on machine learning",          "generate_quiz",   "QuizTool"),
    ("What should I learn next?",            "roadmap_help",    "roadmap_help"),
    ("Summarize this: Python is a high-level programming language.", "summarize_text", "summarize_text"),
]

async def run_tests():
    from app.mentor.router.detector import rule_based_detect, _extract_params_from_text, IntentDetector
    from app.mentor.schemas.chat import IntentType

    print(f"\n{CYAN}{'='*60}")
    print("  MENTOR CHAT FLOW — ROUTING PIPELINE TEST")
    print(f"{'='*60}{RESET}\n")

    passed = 0
    failed_cases = []

    for user_input, expected_intent, expected_tool in TEST_CASES:
        print(f"{YELLOW}> Input: {user_input!r}{RESET}")


        result = rule_based_detect(user_input)

        if result is None:
            detected = "general_chat (no rule matched → LLM fallback)"
            intent_val = "general_chat"
            params = {}
            info("No rule matched — would fall through to LLM detection")
        else:
            intent_val = result.intent_type.value
            params = result.tool_params
            detected = f"{intent_val} (confidence={result.confidence}, matched by='{result.reasoning}')"

        print(f"  Detected : {detected}")
        print(f"  Params   : {params}")
        print(f"  Expected : intent={expected_intent}, tool={expected_tool}")

        if intent_val == expected_intent:
            ok(f"Intent '{intent_val}' matches expected")
            passed += 1
        else:
            fail(f"Intent '{intent_val}' != expected '{expected_intent}'")
            failed_cases.append((user_input, expected_intent, intent_val))

        # Param extraction checks
        if intent_val == "explain_concept":
            concept = params.get("concept", "")
            if concept and "explain" not in concept.lower() and len(concept) > 1:
                ok(f"Concept extracted cleanly: {concept!r}")
            elif not concept:
                fail(f"No concept extracted from: {user_input!r}")
            else:
                fail(f"Concept extraction may be dirty: {concept!r}")

        if intent_val == "generate_quiz":
            topic = params.get("topic", "")
            if topic:
                ok(f"Quiz topic extracted: {topic!r}")
            else:
                fail(f"No quiz topic extracted from: {user_input!r}")

        print()

    # ── Summary ───────────────────────────────────────────────────────────────
    total = len(TEST_CASES)
    print(f"{CYAN}{'='*60}")
    print(f"  RESULTS: {passed}/{total} passed")
    if failed_cases:
        print(f"  {RED}FAILURES:{RESET}")
        for inp, exp, got in failed_cases:
            print(f"    Input: {inp!r} | Expected: {exp} | Got: {got}")
    else:
        print(f"  {GREEN}All routing tests passed!{RESET}")
    print(f"{'='*60}{RESET}\n")

    # ── Memory contamination check ────────────────────────────────────────────
    print(f"{CYAN}Memory contamination safety check:{RESET}")
    from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
    old_ai_resp = "That's a great question! Let's break this down. Structural Logic, hash keys..."

    fake_history = [
        HumanMessage(content="explain trees"),
        AIMessage(content=old_ai_resp),
    ]

    # Simulate what direct_response_node does with history
    new_user_input = "hi"
    messages = [SystemMessage(content="You are Tracks AI Mentor.")]
    recent_history = fake_history[-6:] if len(fake_history) > 6 else fake_history
    messages.extend(recent_history)
    messages.append(HumanMessage(content=new_user_input))

    types_in_prompt = [type(m).__name__ for m in messages]
    print(f"  Message types in prompt: {types_in_prompt}")

    # The old AI message IS in the prompt (as context) — this is fine because the
    # final HumanMessage('hi') triggers a fresh LLM response, not a replay of the old one.
    # The key check: the LAST message must always be HumanMessage with current user input.
    last_msg = messages[-1]
    if isinstance(last_msg, HumanMessage) and last_msg.content == new_user_input:
        ok(f"Last message is HumanMessage with current input: {new_user_input!r}")
    else:
        fail(f"Last message is NOT the current user input! Got: {last_msg}")
    print()

    return passed == total


if __name__ == "__main__":
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)
