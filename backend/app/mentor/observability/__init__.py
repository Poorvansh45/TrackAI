"""
Mentor AI Observability Package
================================
Provides tracing, evaluation, cost tracking, and analytics
for the Tracks AI Mentor production system.

Modules:
  tracer           — LangSmith run config builder
  rag_evaluator    — RAG retrieval quality metrics (heuristic, zero LLM cost)
  mentor_evaluator — Response quality flag checks
  cost_tracker     — Token usage and cost logging to MongoDB
  mentor_analytics — Admin analytics aggregation queries
"""
