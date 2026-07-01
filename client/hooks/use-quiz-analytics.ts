"use client"

import { useState, useEffect, useCallback } from "react"
import { QuizAnalyticsResponse } from "@/lib/quiz-analytics-engine"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function useQuizAnalytics() {
  const [data, setData] = useState<QuizAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/quiz`, {
        headers: authHeaders(),
        cache: "no-store",
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        setData(null)
      }
    } catch (e) {
      console.error("[use-quiz-analytics] fetch error:", e)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()

    // Re-fetch on global roadmap-update or storage events (syncs when quizzes are taken)
    window.addEventListener("roadmap-update", fetchAnalytics)
    window.addEventListener("storage", fetchAnalytics)

    // Re-fetch when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchAnalytics()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.removeEventListener("roadmap-update", fetchAnalytics)
      window.removeEventListener("storage", fetchAnalytics)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [fetchAnalytics])

  return { data, loading, refetch: fetchAnalytics }
}
