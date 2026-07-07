/**
 * Phase 3 Engine — AI Learning Coach & Streak Goal Guardian
 * ===========================================================
 * Pure derivation layer that sits on top of the existing analytics.
 * Every input is an already-computed analytics object — zero new API calls,
 * zero duplicate calculations, zero modifications to Phase 1/2 logic.
 *
 * Functions exported:
 *   deriveCoachRecommendation()  → CoachRecommendation  (for AILearningCoach)
 *   deriveGuardianStatus()       → GuardianStatus        (for StreakGoalGuardian)
 */

import { format, subDays } from "date-fns"
import type { BackendRoadmapState } from "@/lib/roadmap-state"
import type { QuizAnalyticsResponse } from "@/lib/quiz-analytics-engine"
import type { StreakData, VelocityData, ForecastData } from "@/lib/analytics-engine"
import type { DailyProgress, DailyStatus } from "@/lib/daily-progress"
import { DAILY_GOAL } from "@/lib/daily-progress"

// ─── Types ───────────────────────────────────────────────────────────────────

export type CoachNextAction = "revision" | "next_topic" | null

export interface CoachRecommendation {
  /** Primary focus topic name */
  primaryTopic: string
  /** topic_id for /topic/:id navigation */
  primaryTopicId: string
  /** Estimated minutes remaining in the active topic */
  estimatedMinutes: number
  /** Deterministic reason string — no LLM required */
  reason: string
  /** XP the user will earn when this topic is completed */
  xpReward: number
  /** True when all subtopics are done but topic not yet marked complete */
  isPrimaryComplete: boolean
  /** What to do after the primary focus */
  nextAction: CoachNextAction
  nextTopicName: string | null
  nextTopicId: string | null
  /** Short label: "High Priority Revision", "Up Next", etc. */
  nextReason: string | null
  /** False when there is no roadmap / no active topic (show empty state) */
  hasData: boolean
  /** True when the entire roadmap is completed */
  isRoadmapComplete: boolean
}

export type GuardianStatusLabel =
  | "On Track"
  | "Ahead of Schedule"
  | "Behind Schedule"
  | "Streak At Risk"

export interface GuardianStatus {
  currentStreak: number
  /** Minutes to study today to protect the streak (fixed: 15) */
  minutesNeeded: number
  /** Yesterday active + today not yet active — streak about to break */
  streakAtRisk: boolean
  /** Today is already in activeDates */
  streakAlive: boolean
  dailyGoal: number
  completedToday: number
  /** max(0, dailyGoal - completedToday) */
  remaining: number
  dailyStatus: DailyStatus
  status: GuardianStatusLabel
  /** Active topic for the CTA button */
  activeTopic: { id: string; name: string } | null
  hasData: boolean
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Potential XP for a topic that has not yet been completed.
 * Mirrors the backend _xp_for_order() and daily-progress.ts xpForOrder() helpers
 * so there is one source of truth per file without circular imports.
 */
function xpForOrder(order: number): number {
  if (order <= 4) return 100
  if (order <= 12) return 180
  return 280
}

/** Flatten all topics across all phases. */
function flatTopics(state: BackendRoadmapState) {
  return state.phases.flatMap((p) =>
    p.topics.map((t) => ({ ...t, phase_number: p.phase_number, phase_title: p.phase_title }))
  )
}

// ─── Coach Recommendation ────────────────────────────────────────────────────

/**
 * Derive a deterministic, actionable recommendation for the AI Learning Coach.
 *
 * @param state       Backend roadmap state (from useRoadmapProgress)
 * @param quizData    Quiz analytics (from useQuizAnalytics) — may be null
 * @param streak      Computed by deriveStreak() in analytics-engine.ts
 * @param velocity    Computed by deriveVelocity() in analytics-engine.ts
 * @param forecast    Computed by deriveForecast() in analytics-engine.ts
 */
export function deriveCoachRecommendation(
  state: BackendRoadmapState | null,
  quizData: QuizAnalyticsResponse | null,
  streak: StreakData,
  velocity: VelocityData,
  forecast: ForecastData
): CoachRecommendation {
  const empty: CoachRecommendation = {
    primaryTopic: "",
    primaryTopicId: "",
    estimatedMinutes: 0,
    reason: "",
    xpReward: 0,
    isPrimaryComplete: false,
    nextAction: null,
    nextTopicName: null,
    nextTopicId: null,
    nextReason: null,
    hasData: false,
    isRoadmapComplete: false,
  }

  if (!state || state.phases.length === 0) return empty

  const flat = flatTopics(state)
  const active = flat.find((t) => t.status === "active")

  // ── Roadmap fully complete edge case ──────────────────────────────────────
  if (!active) {
    const allCompleted = flat.length > 0 && flat.every((t) => t.status === "completed")
    if (allCompleted) {
      // Surface the highest-priority revision topic as a next step if available
      const topRevision = quizData?.revision_queue[0] ?? null
      return {
        primaryTopic: "Track Complete",
        primaryTopicId: "",
        estimatedMinutes: 0,
        reason:
          "You've mastered every topic in this roadmap! Consider reviewing any weak areas or retaking quizzes to reinforce retention.",
        xpReward: 0,
        isPrimaryComplete: false,
        nextAction: topRevision ? "revision" : null,
        nextTopicName: topRevision?.topic_name ?? null,
        nextTopicId: topRevision?.topic_id ?? null,
        nextReason: topRevision ? `${topRevision.priority} Priority Revision` : null,
        hasData: true,
        isRoadmapComplete: true,
      }
    }
    return empty
  }

  // ── Estimate time ─────────────────────────────────────────────────────────
  const completedSections = active.completed_subtopics.length
  const totalSections = active.total_subtopics || 5
  const remainingSubtopics = Math.max(0, totalSections - completedSections)
  // 5 min per remaining subtopic, minimum 5 min (final review pass), max 60 min
  const estimatedMinutes =
    remainingSubtopics === 0 ? 5 : Math.min(60, Math.max(10, remainingSubtopics * 5))

  // ── Reason string ─────────────────────────────────────────────────────────
  const progressPct = active.progress_pct
  let reason: string

  if (progressPct === 0) {
    reason = "Start this topic to keep your learning momentum alive."
  } else if (progressPct < 100) {
    reason = `In progress — ${progressPct}% done. One focused session away from completion.`
  } else {
    reason = "All subtopics done. Mark complete to unlock the next topic and claim your XP."
  }

  // Append urgency when pace is stagnant (uses forecast — consistent with data flow)
  if (forecast.pace === "stagnant" && streak.currentStreak === 0) {
    reason += " Your progress has stalled — this is the session that gets it moving again."
  } else if (forecast.pace === "slow" && velocity.topicsPerWeek < 1) {
    reason += " A quick session today will meaningfully improve your weekly velocity."
  }

  // ── XP reward ─────────────────────────────────────────────────────────────
  // Use actual earned XP for completed topics; potential XP for active/locked ones.
  const xpReward = active.xp_earned > 0 ? active.xp_earned : xpForOrder(active.order)

  // ── After-this recommendation ─────────────────────────────────────────────
  // Priority: revision queue > weak topics > next locked topic
  let nextAction: CoachNextAction = null
  let nextTopicName: string | null = null
  let nextTopicId: string | null = null
  let nextReason: string | null = null

  if (quizData && quizData.revision_queue.length > 0) {
    const topRevision = quizData.revision_queue[0]
    nextAction = "revision"
    nextTopicName = topRevision.topic_name
    nextTopicId = topRevision.topic_id
    nextReason = `${topRevision.priority} Priority Revision`
  } else {
    // Next locked topic (sorted by order)
    const nextLocked = flat
      .filter((t) => t.status === "locked")
      .sort((a, b) => a.order - b.order)[0]
    if (nextLocked) {
      nextAction = "next_topic"
      nextTopicName = nextLocked.topic_name
      nextTopicId = nextLocked.topic_id
      nextReason = "Up Next"
    }
  }

  return {
    primaryTopic: active.topic_name,
    primaryTopicId: active.topic_id,
    estimatedMinutes,
    reason,
    xpReward,
    isPrimaryComplete: progressPct >= 100,
    nextAction,
    nextTopicName,
    nextTopicId,
    nextReason,
    hasData: true,
    isRoadmapComplete: false,
  }
}

// ─── Guardian Status ─────────────────────────────────────────────────────────

/**
 * Derive the current streak & daily-goal protection status.
 *
 * @param state   Backend roadmap state (from useRoadmapProgress)
 * @param streak  Computed by deriveStreak() in analytics-engine.ts
 * @param daily   Computed by deriveDailyProgress() in daily-progress.ts — may be null
 */
export function deriveGuardianStatus(
  state: BackendRoadmapState | null,
  streak: StreakData,
  daily: DailyProgress | null
): GuardianStatus {
  const defaultStatus: GuardianStatus = {
    currentStreak: 0,
    minutesNeeded: 15,
    streakAtRisk: false,
    streakAlive: false,
    dailyGoal: DAILY_GOAL,
    completedToday: 0,
    remaining: DAILY_GOAL,
    dailyStatus: "not_started",
    status: "Behind Schedule",
    activeTopic: null,
    hasData: false,
  }

  if (!state) return defaultStatus

  // ── Streak risk detection ─────────────────────────────────────────────────
  const today = format(new Date(), "yyyy-MM-dd")
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd")
  const streakAlive = streak.activeDates.has(today)
  // At risk: user had a streak going (studied yesterday) but hasn't studied yet today
  const streakAtRisk = streak.currentStreak > 0 && streak.activeDates.has(yesterday) && !streakAlive

  // ── Daily progress values ─────────────────────────────────────────────────
  const completedToday = daily?.completedToday ?? 0
  const dailyGoal = daily?.dailyGoal ?? DAILY_GOAL
  const remaining = Math.max(0, dailyGoal - completedToday)
  const dailyStatus = daily?.status ?? "not_started"

  // ── Status label ──────────────────────────────────────────────────────────
  let status: GuardianStatusLabel
  if (streakAtRisk) {
    status = "Streak At Risk"
  } else if (completedToday >= dailyGoal) {
    status = "Ahead of Schedule"
  } else if (completedToday > 0) {
    status = "On Track"
  } else {
    // 0 completed today and streak not at risk (new user or first day)
    status = "Behind Schedule"
  }

  // ── Active topic for CTA ──────────────────────────────────────────────────
  const flat = state.phases.flatMap((p) => p.topics)
  const active = flat.find((t) => t.status === "active")
  const activeTopic = active ? { id: active.topic_id, name: active.topic_name } : null

  return {
    currentStreak: streak.currentStreak,
    minutesNeeded: 15,
    streakAtRisk,
    streakAlive,
    dailyGoal,
    completedToday,
    remaining,
    dailyStatus,
    status,
    activeTopic,
    hasData: true,
  }
}
