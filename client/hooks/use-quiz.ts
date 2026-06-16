"use client"

/**
 * useAvailableQuizzes — Tracks AI
 * =================================
 * Fetches available quizzes for the current authenticated user.
 * Follows the exact same pattern as useRoadmapProgress in lib/roadmap-state.ts:
 *   - Initial fetch on mount
 *   - Re-fetch on "roadmap-update" event (topic completion fires one)
 *   - Re-fetch on tab visibility change
 *   - Auto-polls every 8 s while any quiz is in GENERATING state
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { getAvailableQuizzes, type AvailableQuiz } from "@/lib/quiz-api"

const POLL_INTERVAL_MS = 8_000

export function useAvailableQuizzes() {
  const [quizzes, setQuizzes]   = useState<AvailableQuiz[]>([])
  const [loading, setLoading]   = useState(true)
  const pollTimerRef            = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetch_ = useCallback(async () => {
    const data = await getAvailableQuizzes()
    setQuizzes(data)
    setLoading(false)
    return data
  }, [])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollTimerRef.current = setInterval(async () => {
      const data = await fetch_()
      // Stop polling once no quiz is still generating
      const stillGenerating = data.some((q) => q.quiz_status === "GENERATING")
      if (!stillGenerating) stopPolling()
    }, POLL_INTERVAL_MS)
  }, [fetch_, stopPolling])

  useEffect(() => {
    // Initial load
    fetch_().then((data) => {
      if (data.some((q) => q.quiz_status === "GENERATING")) {
        startPolling()
      }
    })

    // Re-fetch on same-tab roadmap updates (topic completion fires this)
    const onUpdate = async () => {
      const data = await fetch_()
      if (data.some((q) => q.quiz_status === "GENERATING")) {
        startPolling()
      } else {
        stopPolling()
      }
    }

    // Re-fetch on tab visibility (same pattern as useActiveTopic)
    const onVisibility = () => {
      if (document.visibilityState === "visible") onUpdate()
    }

    window.addEventListener("roadmap-update", onUpdate)
    window.addEventListener("storage", onUpdate)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.removeEventListener("roadmap-update", onUpdate)
      window.removeEventListener("storage", onUpdate)
      document.removeEventListener("visibilitychange", onVisibility)
      stopPolling()
    }
  }, [fetch_, startPolling, stopPolling])

  const readyCount = quizzes.filter(
    (q) => q.quiz_status === "READY" || q.quiz_status === "NEEDS_REVISION"
  ).length

  return { quizzes, loading, readyCount, refetch: fetch_ }
}
