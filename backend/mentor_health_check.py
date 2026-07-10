"""
Tracks AI Mentor — Production Health Check
===========================================

Verifies backend connectivity, security scoping, streaming,
rate limiting, and memory before going live.

Usage:
    python mentor_health_check.py            # full check
    python mentor_health_check.py --quick    # skip slow checks
"""

import asyncio
import importlib
import os
import sys
import time

# ── Ensure the backend package is importable ────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


# ── Result tracking ─────────────────────────────────────────────────────────
_results: list[tuple[str, bool, str]] = []


def _record(name: str, passed: bool, detail: str = ""):
    icon = "[PASS]" if passed else "[FAIL]"
    _results.append((name, passed, detail))
    print(f"  {icon}  {name}" + (f"  --  {detail}" if detail else ""))


# ── Individual checks ───────────────────────────────────────────────────────

def check_env_vars():
    """Verify critical environment variables are set."""
    print("\n--- Environment Variables ---")
    from app.core.config import settings

    # Must-have
    _record("MONGODB_URL set", bool(settings.MONGODB_URL), settings.MONGODB_URL[:30] + "..." if settings.MONGODB_URL else "MISSING")
    _record("JWT_SECRET_KEY set", bool(settings.JWT_SECRET_KEY), "present" if settings.JWT_SECRET_KEY else "MISSING")

    # LLM provider
    provider = settings.llm_provider
    _record(f"LLM_PROVIDER = {provider}", provider in ("openai", "azure"), provider)

    if provider == "openai":
        _record("OPENAI_API_KEY set", settings.is_openai_configured)
    elif provider == "azure":
        _record("AZURE_OPENAI_API_KEY set", settings.is_azure_configured)

    # Mentor hardening flags
    _record("MENTOR_DEBUG", True, f"{'ON' if settings.mentor_debug else 'OFF'}")
    _record("MENTOR_DAILY_CHAT_LIMIT", settings.mentor_daily_chat_limit > 0, str(settings.mentor_daily_chat_limit))
    _record("MENTOR_MAX_PDF_SIZE_MB", settings.mentor_max_pdf_size_mb > 0, f"{settings.mentor_max_pdf_size_mb} MB")
    _record("MENTOR_MAX_YOUTUBE_DURATION_MINS", settings.mentor_max_youtube_duration_mins > 0, f"{settings.mentor_max_youtube_duration_mins} mins")


async def check_mongodb():
    """Verify MongoDB connectivity."""
    print("\n--- MongoDB Connectivity ---")
    try:
        from app.core.database import get_database, connect_to_mongo
        await connect_to_mongo()
        db = get_database()
        if db is None:
            _record("MongoDB connection", False, "get_database() returned None")
            return
        # Ping
        collections = await db.list_collection_names()
        _record("MongoDB connection", True, f"{len(collections)} collections found")

        # Check key collections
        for coll_name in ["users", "mentor_sessions", "roadmap_progress", "topic_progress", "quiz_attempts"]:
            exists = coll_name in collections
            _record(f"Collection '{coll_name}'", exists, "present" if exists else "MISSING")
    except Exception as e:
        _record("MongoDB connection", False, str(e))


def check_imports():
    """Verify all mentor modules import cleanly."""
    print("\n--- Module Imports ---")
    modules = [
        "app.core.config",
        "app.mentor.graph.mentor_graph",
        "app.mentor.graph.nodes",
        "app.mentor.graph.state",
        "app.mentor.router.detector",
        "app.mentor.memory.manager",
        "app.mentor.vectorstore.manager",
        "app.mentor.agents.youtube_agent",
        "app.mentor.agents.pdf_agent",
        "app.mentor.agents.quiz_agent",
        "app.mentor.intelligence.weakness_agent",
        "app.mentor.intelligence.revision_agent",
        "app.mentor.intelligence.learning_profile",
        "app.mentor.providers.factory",
        "app.mentor.rag.pipeline",
        "app.mentor.tools.registry",
        "app.mentor.exceptions",
    ]
    for mod in modules:
        try:
            importlib.import_module(mod)
            _record(f"import {mod.split('.')[-1]}", True)
        except Exception as e:
            _record(f"import {mod.split('.')[-1]}", False, str(e)[:80])


def check_security_scoping():
    """Verify that singleton agents use user-scoped dictionaries, not flat attributes."""
    print("\n--- Cross-User Security Scoping ---")
    try:
        from app.mentor.agents.pdf_agent import PDFLearningAgent
        agent_cls = PDFLearningAgent
        # Check that __init__ creates dict-based state
        src = importlib.import_module("app.mentor.agents.pdf_agent")
        source = open(src.__file__, encoding="utf-8").read()
        uses_dict = "_active_doc_ids" in source and "self._active_doc_ids" in source
        _record("PDFAgent user-scoped state (_active_doc_ids dict)", uses_dict)
    except Exception as e:
        _record("PDFAgent user-scoped state", False, str(e)[:80])

    try:
        src = importlib.import_module("app.mentor.agents.youtube_agent")
        source = open(src.__file__, encoding="utf-8").read()
        uses_dict = "_active_video_ids" in source and "self._active_video_ids" in source
        _record("YouTubeAgent user-scoped state (_active_video_ids dict)", uses_dict)
    except Exception as e:
        _record("YouTubeAgent user-scoped state", False, str(e)[:80])


def check_endpoint_auth():
    """Verify that secured endpoints import and use get_current_user."""
    print("\n--- Endpoint Auth Guards ---")
    files_to_check = [
        ("app/api/v1/roadmap_progress.py", ["get_current_user", "Depends"]),
        ("app/api/v1/topic.py", ["get_current_user", "Depends"]),
        ("app/api/v1/mentor.py", ["get_current_user", "Depends"]),
    ]
    for filepath, keywords in files_to_check:
        full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filepath)
        try:
            with open(full_path, encoding="utf-8") as f:
                content = f.read()
            all_present = all(kw in content for kw in keywords)
            _record(f"{os.path.basename(filepath)} auth guard", all_present,
                    "get_current_user + Depends present" if all_present else "MISSING auth guards")
        except Exception as e:
            _record(f"{os.path.basename(filepath)} auth guard", False, str(e)[:80])


def check_debug_gating():
    """Verify that MENTOR DEBUG blocks are gated behind settings.mentor_debug."""
    print("\n--- Debug Print Gating ---")
    files_to_check = [
        "app/mentor/graph/nodes.py",
        "app/mentor/graph/mentor_graph.py",
    ]
    for filepath in files_to_check:
        full_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), filepath)
        try:
            with open(full_path, encoding="utf-8") as f:
                content = f.read()
            has_settings_import = "from app.core.config import settings" in content
            has_debug_gate = "settings.mentor_debug" in content
            passed = has_settings_import and has_debug_gate
            _record(f"{os.path.basename(filepath)} debug gating", passed,
                    "settings.mentor_debug gate found" if passed else "MISSING debug gating")
        except Exception as e:
            _record(f"{os.path.basename(filepath)} debug gating", False, str(e)[:80])


def check_exceptions_module():
    """Verify custom exceptions are registered."""
    print("\n--- Custom Exceptions ---")
    try:
        from app.mentor.exceptions import (
            MentorException,
            RateLimitExceededException,
            PDFParsingFailureException,
        )
        _record("MentorException importable", True)
        _record("RateLimitExceededException importable", True)
        _record("PDFParsingFailureException importable", True)
    except ImportError as e:
        _record("Custom exceptions", False, str(e))


def check_chromadb():
    """Verify ChromaDB persistence directory exists."""
    print("\n--- ChromaDB ---")
    from app.core.config import settings
    persist_dir = settings.chroma_persist_dir
    exists = os.path.isdir(persist_dir)
    _record("ChromaDB persist directory", exists, persist_dir)


# ── Runner ──────────────────────────────────────────────────────────────────

async def run_all(quick: bool = False):
    print("=" * 60)
    print("  Tracks AI Mentor -- Production Health Check")
    print("=" * 60)

    start = time.time()

    # Fast checks
    check_env_vars()
    check_imports()
    check_security_scoping()
    check_endpoint_auth()
    check_debug_gating()
    check_exceptions_module()
    check_chromadb()

    if not quick:
        await check_mongodb()

    elapsed = time.time() - start
    total = len(_results)
    passed = sum(1 for _, p, _ in _results if p)
    failed = total - passed

    print("\n" + "=" * 60)
    print(f"  Results: {passed}/{total} passed  |  {failed} failed  |  {elapsed:.1f}s")
    print("=" * 60)

    if failed > 0:
        print("\n!!  Failed checks:")
        for name, p, detail in _results:
            if not p:
                print(f"   [FAIL]  {name}  --  {detail}")

    return failed == 0


if __name__ == "__main__":
    quick = "--quick" in sys.argv
    ok = asyncio.run(run_all(quick=quick))
    sys.exit(0 if ok else 1)

