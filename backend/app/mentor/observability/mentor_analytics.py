"""
Mentor Admin Analytics Service
================================

Aggregation queries over mentor_usage_logs and user_rate_limits
to provide admin-level insight into system usage, cost, and performance.

No API endpoint — consumed directly by eval runner and future admin dashboard.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("mentor.observability.mentor_analytics")


def _days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


async def get_usage_summary(days: int = 7) -> Dict[str, Any]:
    """
    Aggregate overall usage statistics from mentor_usage_logs.

    Returns:
        {
          total_requests:    int,
          total_cost_usd:    float,
          total_input_tokens: int,
          total_output_tokens: int,
          avg_latency_ms:    float,
          period_days:       int,
          from_date:         str,
          to_date:           str,
        }
    """
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            logger.warning("[Analytics] DB unavailable.")
            return _empty_summary(days)

        since = _days_ago(days)
        pipeline = [
            {"$match": {"timestamp": {"$gte": since}}},
            {
                "$group": {
                    "_id": None,
                    "total_requests":     {"$sum": 1},
                    "total_cost_usd":     {"$sum": "$estimated_cost_usd"},
                    "total_input_tokens": {"$sum": "$input_tokens"},
                    "total_output_tokens": {"$sum": "$output_tokens"},
                    "avg_latency_ms":     {"$avg": "$latency_ms"},
                }
            },
        ]
        results = await db["mentor_usage_logs"].aggregate(pipeline).to_list(1)

        if not results:
            return _empty_summary(days)

        row = results[0]
        return {
            "total_requests":     row.get("total_requests", 0),
            "total_cost_usd":     round(row.get("total_cost_usd", 0.0), 6),
            "total_input_tokens": row.get("total_input_tokens", 0),
            "total_output_tokens": row.get("total_output_tokens", 0),
            "avg_latency_ms":     round(row.get("avg_latency_ms") or 0.0, 1),
            "period_days":        days,
            "from_date":          since.strftime("%Y-%m-%d"),
            "to_date":            datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        }

    except Exception as e:
        logger.error(f"[Analytics] get_usage_summary failed: {e}")
        return _empty_summary(days)


def _empty_summary(days: int) -> Dict[str, Any]:
    since = _days_ago(days)
    return {
        "total_requests": 0,
        "total_cost_usd": 0.0,
        "total_input_tokens": 0,
        "total_output_tokens": 0,
        "avg_latency_ms": 0.0,
        "period_days": days,
        "from_date": since.strftime("%Y-%m-%d"),
        "to_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }


async def get_tool_distribution(days: int = 7) -> List[Dict[str, Any]]:
    """
    Count requests per tool_used over the last N days.

    Returns list of:
        [{"tool": str, "count": int, "total_cost_usd": float}, ...]
    sorted by count descending.
    """
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return []

        since = _days_ago(days)
        pipeline = [
            {"$match": {"timestamp": {"$gte": since}}},
            {
                "$group": {
                    "_id":            "$tool_used",
                    "count":          {"$sum": 1},
                    "total_cost_usd": {"$sum": "$estimated_cost_usd"},
                    "avg_tokens":     {"$avg": "$total_tokens"},
                }
            },
            {"$sort": {"count": -1}},
        ]
        rows = await db["mentor_usage_logs"].aggregate(pipeline).to_list(50)
        return [
            {
                "tool":           row["_id"] or "none",
                "count":          row["count"],
                "total_cost_usd": round(row["total_cost_usd"], 6),
                "avg_tokens":     round(row.get("avg_tokens") or 0, 0),
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"[Analytics] get_tool_distribution failed: {e}")
        return []


async def get_intent_distribution(days: int = 7) -> List[Dict[str, Any]]:
    """
    Count requests per intent type over the last N days.
    """
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return []

        since = _days_ago(days)
        pipeline = [
            {"$match": {"timestamp": {"$gte": since}}},
            {
                "$group": {
                    "_id":   "$intent",
                    "count": {"$sum": 1},
                    "total_cost_usd": {"$sum": "$estimated_cost_usd"},
                }
            },
            {"$sort": {"count": -1}},
        ]
        rows = await db["mentor_usage_logs"].aggregate(pipeline).to_list(20)
        return [
            {
                "intent":         row["_id"] or "unknown",
                "count":          row["count"],
                "total_cost_usd": round(row["total_cost_usd"], 6),
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"[Analytics] get_intent_distribution failed: {e}")
        return []


async def get_top_users(days: int = 7, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Return top N users by request count and cost over the last N days.
    """
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return []

        since = _days_ago(days)
        pipeline = [
            {"$match": {"timestamp": {"$gte": since}}},
            {
                "$group": {
                    "_id":            "$user_id",
                    "request_count":  {"$sum": 1},
                    "total_cost_usd": {"$sum": "$estimated_cost_usd"},
                    "total_tokens":   {"$sum": "$total_tokens"},
                }
            },
            {"$sort": {"request_count": -1}},
            {"$limit": limit},
        ]
        rows = await db["mentor_usage_logs"].aggregate(pipeline).to_list(limit)
        return [
            {
                "user_id":        row["_id"],
                "request_count":  row["request_count"],
                "total_cost_usd": round(row["total_cost_usd"], 6),
                "total_tokens":   row["total_tokens"],
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"[Analytics] get_top_users failed: {e}")
        return []


async def get_model_distribution(days: int = 7) -> List[Dict[str, Any]]:
    """
    Count requests and cost per model over the last N days.
    """
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return []

        since = _days_ago(days)
        pipeline = [
            {"$match": {"timestamp": {"$gte": since}}},
            {
                "$group": {
                    "_id":            {"model": "$model", "provider": "$provider"},
                    "count":          {"$sum": 1},
                    "total_cost_usd": {"$sum": "$estimated_cost_usd"},
                    "total_tokens":   {"$sum": "$total_tokens"},
                }
            },
            {"$sort": {"count": -1}},
        ]
        rows = await db["mentor_usage_logs"].aggregate(pipeline).to_list(20)
        return [
            {
                "model":          row["_id"].get("model", "unknown"),
                "provider":       row["_id"].get("provider", "unknown"),
                "count":          row["count"],
                "total_cost_usd": round(row["total_cost_usd"], 6),
                "total_tokens":   row["total_tokens"],
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"[Analytics] get_model_distribution failed: {e}")
        return []


async def get_daily_cost_trend(days: int = 7) -> List[Dict[str, Any]]:
    """
    Daily cost and request breakdown for the last N days.
    """
    try:
        from app.core.database import get_database
        db = get_database()
        if db is None:
            return []

        since = _days_ago(days)
        pipeline = [
            {"$match": {"timestamp": {"$gte": since}}},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}
                    },
                    "requests":      {"$sum": 1},
                    "cost_usd":      {"$sum": "$estimated_cost_usd"},
                    "total_tokens":  {"$sum": "$total_tokens"},
                    "avg_latency_ms": {"$avg": "$latency_ms"},
                }
            },
            {"$sort": {"_id": 1}},
        ]
        rows = await db["mentor_usage_logs"].aggregate(pipeline).to_list(days)
        return [
            {
                "date":           row["_id"],
                "requests":       row["requests"],
                "cost_usd":       round(row["cost_usd"], 6),
                "total_tokens":   row["total_tokens"],
                "avg_latency_ms": round(row.get("avg_latency_ms") or 0.0, 1),
            }
            for row in rows
        ]

    except Exception as e:
        logger.error(f"[Analytics] get_daily_cost_trend failed: {e}")
        return []
