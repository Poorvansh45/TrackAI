"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchRoadmapState, type BackendRoadmapState } from "@/lib/roadmap-state"

/**
 * useActiveTopic — single source of truth for the current active topic.
 *
 * BACKEND-BACKED (root-cause fix): reads exclusively from
 * GET /api/v1/roadmap/state/{user_id} via lib/roadmap-state.ts.
 * No local frontend arrays, no localStorage `_nodeStatus` overrides.
 *
 * Re-fetches whenever:
 * - the component mounts
 * - a "roadmap-update" event fires (dispatched after checklist/complete
 *   calls in the Topic Workspace)
 * - a cross-tab "storage" event fires
 */

export interface ActiveTopic {
  title: string
  slug: string
  phaseNumber: number
  phaseTitle: string
  skill: string
  totalSections: number
  completedSections: number
  progress: number           // 0-100, capped server-side
  nextTitle?: string
  nextSlug?: string
}

function deriveActiveTopic(state: BackendRoadmapState | null): ActiveTopic | null {
  if (!state) return null

  const flat = state.phases.flatMap((p) =>
    p.topics.map((t) => ({ ...t, phase_number: p.phase_number, phase_title: p.phase_title }))
  )
  if (flat.length === 0) return null

  let active = flat.find((t) => t.status === "active")

  // If nothing is active (e.g. roadmap fully completed), fall back to the last topic
  if (!active) {
    active = [...flat].sort((a, b) => a.order - b.order)[flat.length - 1]
  }

  const next = flat
    .filter((t) => t.order > active!.order)
    .sort((a, b) => a.order - b.order)[0]

  const totalSections = active.total_subtopics || 5
  const completedSections = Math.min(active.completed_subtopics.length, totalSections)

  return {
    title: active.topic_name,
    slug: active.topic_id,
    phaseNumber: active.phase_number,
    phaseTitle: active.phase_title,
    skill: state.skill,
    totalSections,
    completedSections,
    progress: active.progress_pct,
    nextTitle: next?.topic_name,
    nextSlug: next?.topic_id,
  }
}

export function useActiveTopic() {
  const [activeTopic, setActiveTopic] = useState<ActiveTopic | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const state = await fetchRoadmapState()
    setActiveTopic(deriveActiveTopic(state))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()

    const handler = () => refresh()
    window.addEventListener("roadmap-update", handler)
    window.addEventListener("storage", handler)
    // Re-fetch when the user navigates back to this tab/page
    const visHandler = () => { if (document.visibilityState === "visible") refresh() }
    document.addEventListener("visibilitychange", visHandler)

    return () => {
      window.removeEventListener("roadmap-update", handler)
      window.removeEventListener("storage", handler)
      document.removeEventListener("visibilitychange", visHandler)
    }
  }, [refresh])

  return { activeTopic, loading, refresh }
}
