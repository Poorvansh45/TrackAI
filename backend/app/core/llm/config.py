"""
LLM Gateway Configuration - Tracks AI
Central place for all task constants, model names, token budgets,
and routing tables.
"""
from __future__ import annotations


class Task:
    ASSESSMENT              = "assessment"
    PREREQUISITE_ANALYSIS   = "prerequisite_analysis"
    ROADMAP_GENERATION      = "roadmap_generation"
    TIMELINE_GENERATION     = "timeline_generation"
    QUIZ_GENERATION         = "quiz_generation"
    QUIZ_EXPLANATION        = "quiz_explanation"
    TOPIC_OVERVIEW          = "topic_overview"
    TOPIC_SUMMARY           = "topic_summary"
    QUICK_RECALL            = "quick_recall"
    RE_EXPLAIN              = "re_explain"


class Provider:
    GEMINI = "gemini"
    GROQ   = "groq"


class Model:
    GEMINI_FLASH_LITE  = "gemini-2.0-flash-lite"
    GEMINI_FLASH       = "gemini-2.5-flash"
    GROQ_LLAMA_8B      = "llama-3.1-8b-instant"
    GROQ_LLAMA_70B     = "llama-3.3-70b-versatile"


TASK_ROUTING: dict[str, dict] = {
    Task.ASSESSMENT: {
        "provider":   Provider.GEMINI,
        "model":      Model.GEMINI_FLASH,       # gemini-2.5-flash for quality assessment
        "max_tokens": 1024,
    },
    Task.PREREQUISITE_ANALYSIS: {
        "provider":   Provider.GEMINI,
        "model":      Model.GEMINI_FLASH_LITE,
        "max_tokens": 1024,
    },
    Task.ROADMAP_GENERATION: {
        "provider":   Provider.GEMINI,
        "model":      Model.GEMINI_FLASH,       # gemini-2.5-flash for quality roadmap
        "max_tokens": 4096,
    },
    Task.TIMELINE_GENERATION: {
        "provider":   Provider.GEMINI,
        "model":      Model.GEMINI_FLASH_LITE,
        "max_tokens": 2048,
    },
    Task.QUIZ_GENERATION: {
        "provider":   Provider.GROQ,
        "model":      Model.GROQ_LLAMA_8B,
        "max_tokens": 2048,
    },
    Task.QUIZ_EXPLANATION: {
        "provider":   Provider.GROQ,
        "model":      Model.GROQ_LLAMA_8B,
        "max_tokens": 256,
    },
    Task.TOPIC_OVERVIEW: {
        "provider":   Provider.GROQ,
        "model":      Model.GROQ_LLAMA_8B,
        "max_tokens": 1024,
    },
    Task.TOPIC_SUMMARY: {
        "provider":   Provider.GROQ,
        "model":      Model.GROQ_LLAMA_8B,
        "max_tokens": 512,
    },
    Task.QUICK_RECALL: {
        "provider":   Provider.GROQ,
        "model":      Model.GROQ_LLAMA_8B,
        "max_tokens": 256,
    },
    Task.RE_EXPLAIN: {
        "provider":   Provider.GROQ,
        "model":      Model.GROQ_LLAMA_8B,
        "max_tokens": 300,
    },
}

CACHE_TTL_DAYS: dict[str, int] = {
    Task.ASSESSMENT:            30,
    Task.PREREQUISITE_ANALYSIS: 30,
    Task.ROADMAP_GENERATION:    30,
    Task.TIMELINE_GENERATION:   30,
    Task.QUIZ_GENERATION:        7,
    Task.QUIZ_EXPLANATION:       7,
    Task.TOPIC_OVERVIEW:        90,
    Task.TOPIC_SUMMARY:         90,
    Task.QUICK_RECALL:          90,
    Task.RE_EXPLAIN:             0,
}

CACHE_COLLECTION = "llm_cache"
