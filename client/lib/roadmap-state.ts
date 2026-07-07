/**
 * Roadmap Progress — Backend-backed source of truth
 * ====================================================
 * ALL topic status (locked/active/completed) and progress now lives in
 * MongoDB via /api/v1/roadmap/*. This module is the ONLY place the
 * frontend talks to that API. localStorage is used purely as an
 * instant-paint cache — it is never authoritative.
 *
 * Dashboard, Learning Graph, and Topic Workspace all call
 * useActiveTopicState() / useRoadmapProgress() so they are guaranteed
 * to render identical state.
 */

import { useState, useEffect, useCallback } from "react"
import { triggerQuizGeneration } from "@/lib/quiz-api"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

// ─── Types (mirror backend Pydantic schemas) ───────────────────────────────

export type TopicStatus = "locked" | "active" | "completed"

export interface BackendTopic {
  topic_id: string
  topic_name: string
  order: number
  status: TopicStatus
  completed_subtopics: string[]
  total_subtopics: number
  progress_pct: number
  xp_earned: number
  completed_at: string | null
}

export interface BackendPhase {
  phase_number: number
  phase_title: string
  topics: BackendTopic[]
}

export interface BackendRoadmapState {
  user_id: string
  skill: string
  phases: BackendPhase[]
  active_topic_id: string | null
  completed_count: number
  total_count: number
}

export interface ActiveTopicState {
  topicName: string
  topicSlug: string
  phaseLabel: string
  phaseNumber: number
  topicProgress: number
  totalInPhase: number
  completedCount: number
  totalCount: number
  skill: string
  hasRoadmap: boolean
  upcomingTopics: string[]
  todayMilestones: string[]
  totalXP: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

/** Resolve the current user's id (used as roadmap_progress.user_id) */
export function getUserId(): string {
  try {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const user = JSON.parse(userStr)
      return user.id || user._id || user.email || "anon"
    }
  } catch {}
  return "anon"
}

/** Read locally-cached roadmap content (skill, phases, topic names) — generated at onboarding */
function getGeneratedRoadmap(): any | null {
  try {
    const saved = localStorage.getItem("generatedRoadmap")
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

// ─── API calls ──────────────────────────────────────────────────────────────

/**
 * Initialize roadmap_progress in MongoDB from the generated roadmap content.
 * Idempotent — backend no-ops if a roadmap already exists for this user.
 */
export async function initRoadmap(): Promise<BackendRoadmapState | null> {
  const generated = getGeneratedRoadmap()
  if (!generated?.roadmap_result?.phases) return null

  const userId = getUserId()
  const skill = generated.skill || "Custom Track"
  const phases = generated.roadmap_result.phases.map((p: any, i: number) => ({
    phase_number: p.phase_number || i + 1,
    phase_title: p.phase_title || `Phase ${i + 1}`,
    topics: p.topics || [],
  }))

  try {
    const res = await fetch(`${API_BASE}/roadmap/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, skill, phases }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error("[initRoadmap]", e)
    return null
  }
}

/**
 * Fetch the canonical roadmap progress state from MongoDB.
 * If 404 (not yet initialized), attempts initRoadmap() once and retries.
 */
export async function fetchRoadmapState(): Promise<BackendRoadmapState | null> {
  const userId = getUserId()
  try {
    let res = await fetch(`${API_BASE}/roadmap/state/${encodeURIComponent(userId)}`, {
      cache: "no-store",
    })

    if (res.status === 404) {
      const initialized = await initRoadmap()
      if (initialized) return initialized
      return null
    }

    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    console.error("[fetchRoadmapState]", e)
    return null
  }
}

/**
 * Mark a topic completed on the backend — unlocks the next topic
 * server-side and returns the fully refreshed roadmap state.
 */
export async function completeTopicOnServer(topicId: string): Promise<BackendRoadmapState | null> {
  const userId = getUserId()
  try {
    const res = await fetch(`${API_BASE}/roadmap/topic/${encodeURIComponent(topicId)}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    })
    if (!res.ok) return null
    const data = await res.json()

    // ── Non-blocking quiz generation trigger ─────────────────────────────────
    // Find the just-completed topic in the returned roadmap state so we can
    // pass its display name and skill to the generator. Errors are swallowed
    // intentionally — quiz generation failure must never block the user.
    try {
      const roadmap: BackendRoadmapState = data.roadmap as BackendRoadmapState
      const flat = roadmap.phases.flatMap((p) => p.topics)
      const completedTopic = flat.find((t) => t.topic_id === topicId)
      if (completedTopic) {
        triggerQuizGeneration(
          topicId,
          completedTopic.topic_name,
          roadmap.skill
        ).catch(() => {/* silently ignored — generation is best-effort */})
      }
    } catch {/* non-fatal */}
    // ─────────────────────────────────────────────────────────────────────────

    // Broadcast to all components in this tab
    window.dispatchEvent(new Event("roadmap-update"))
    // Cross-page sync: storage event fires on other open pages (Learning Graph, Dashboard)
    localStorage.setItem("roadmap_last_updated", Date.now().toString())

    return data.roadmap as BackendRoadmapState
  } catch (e) {
    console.error("[completeTopicOnServer]", e)
    return null
  }
}

/** Update checklist progress for a topic on the backend (0-100, capped). */
export async function updateChecklistOnServer(
  topicId: string,
  completedSubtopics: string[],
  totalSubtopics: number
): Promise<{ progress_pct: number; status: TopicStatus } | null> {
  const userId = getUserId()
  try {
    const res = await fetch(`${API_BASE}/roadmap/topic/${encodeURIComponent(topicId)}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        completed_subtopics: completedSubtopics,
        total_subtopics: totalSubtopics,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    // Broadcast to same-tab listeners
    window.dispatchEvent(new Event("roadmap-update"))
    // Cross-page sync via storage event
    localStorage.setItem("roadmap_last_updated", Date.now().toString())
    return { progress_pct: data.progress_pct, status: data.status }
  } catch (e) {
    console.error("[updateChecklistOnServer]", e)
    return null
  }
}

// ─── Derivation: BackendRoadmapState -> ActiveTopicState ──────────────────

function deriveActiveTopicState(state: BackendRoadmapState | null): ActiveTopicState {
  const empty: ActiveTopicState = {
    topicName: "", topicSlug: "", phaseLabel: "", phaseNumber: 1,
    topicProgress: 0, totalInPhase: 0, completedCount: 0, totalCount: 0,
    skill: "", hasRoadmap: false, upcomingTopics: [], todayMilestones: [], totalXP: 0,
  }
  if (!state) return empty

  const flat = state.phases.flatMap(p => p.topics)
  const active = flat.find(t => t.status === "active")
  const activePhase = state.phases.find(p => p.topics.some(t => t.status === "active")) || state.phases[0]

  const upcomingTopics = flat
    .filter(t => t.status === "locked")
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map(t => t.topic_name)

  const totalXP = flat.reduce((sum, t) => sum + (t.status === "completed" ? t.xp_earned : 0), 0)

  // Today's milestones — read from generatedRoadmap timeline (display-only, not progress data)
  let todayMilestones: string[] = []
  try {
    const generated = getGeneratedRoadmap()
    const timeline = generated?.timeline_result?.weekly_schedule
    if (Array.isArray(timeline) && timeline.length > 0) {
      const weekIndex = Math.min(Math.floor(state.completed_count / 3), timeline.length - 1)
      todayMilestones = (timeline[weekIndex]?.milestones || []).slice(0, 3)
    }
  } catch {}

  return {
    topicName: active?.topic_name || "",
    topicSlug: active?.topic_id || "",
    phaseLabel: activePhase ? `${state.skill} · ${activePhase.phase_title}` : state.skill,
    phaseNumber: activePhase?.phase_number || 1,
    topicProgress: active?.progress_pct || 0,
    totalInPhase: activePhase?.topics.length || 0,
    completedCount: state.completed_count,
    totalCount: state.total_count,
    skill: state.skill,
    hasRoadmap: true,
    upcomingTopics,
    todayMilestones,
    totalXP,
  }
}

// ─── React hooks ────────────────────────────────────────────────────────────

/**
 * Full backend roadmap state, kept in sync via the "roadmap-update" event.
 * Use this in the Learning Graph page.
 */
export function useRoadmapProgress() {
  const [data, setData] = useState<BackendRoadmapState | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const state = await fetchRoadmapState()
    setData(state)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()

    const handler = () => refresh()
    // Same-tab event (dispatched by completeTopicOnServer / updateChecklistOnServer)
    window.addEventListener("roadmap-update", handler)
    // Cross-page: fires when another tab writes to localStorage
    window.addEventListener("storage", handler)
    // Tab visibility: re-fetch when user navigates back to this page
    const visHandler = () => { if (document.visibilityState === "visible") refresh() }
    document.addEventListener("visibilitychange", visHandler)

    return () => {
      window.removeEventListener("roadmap-update", handler)
      window.removeEventListener("storage", handler)
      document.removeEventListener("visibilitychange", visHandler)
    }
  }, [refresh])

  return { data, loading, refresh }
}

/**
 * Derived "what is the current active topic" view, kept in sync with the
 * backend. Use this in Dashboard widgets (Continue Learning, Today's
 * Missions, Roadmap card, Planner card, AI Mentor).
 */
export function useActiveTopicState(): ActiveTopicState & { loading: boolean; refresh: () => void } {
  const { data, loading, refresh } = useRoadmapProgress()
  const derived = deriveActiveTopicState(data)
  return { ...derived, loading, refresh }
}
