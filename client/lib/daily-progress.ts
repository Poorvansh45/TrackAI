/**
 * Daily Progress — Pure derivation from BackendRoadmapState
 * ===========================================================
 * All daily goal computation is a pure function of the backend roadmap state.
 *
 * No localStorage. No separate progress state. No extra API calls.
 * The Roadmap (BackendRoadmapState) is the single source of truth.
 *
 * "Completed today" is determined from the `completed_at` ISO timestamp that
 * the backend already stores on every topic when it is marked complete.
 *
 * Performance Score tracking is intentionally deferred to the Performance
 * module. No negative penalty is applied during the current day.
 */

import type { BackendRoadmapState } from "@/lib/roadmap-state"

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Daily topic goal. Change this one constant to adjust the goal system-wide.
 * Future versions may make this user-configurable (2, 5, etc.).
 */
export const DAILY_GOAL = 3

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Possible states for a user's daily goal progress.
 * No "failed" / negative state is exposed during the current day.
 * Performance penalties are deferred to the Performance module.
 */
export type DailyStatus =
  | "not_started"      // 0 topics completed today
  | "in_progress"      // 1 … DAILY_GOAL-1 completed today
  | "goal_completed"   // exactly DAILY_GOAL completed today
  | "goal_exceeded"    // more than DAILY_GOAL completed today

export interface DailyPlanTopic {
  topicId: string
  topicName: string
  /** Mirrors the backend status field. */
  status: "completed" | "active" | "locked"
  /** True when this topic's completed_at timestamp falls on today's local date. */
  completedToday: boolean
  /**
   * For completed topics: actual xp_earned from the backend.
   * For active/locked topics: potential XP derived from position.
   */
  xp: number
}

export interface DailyProgress {
  /**
   * Topics to show in Today's Plan:
   *   1. Topics from the active phase that were completed today — always kept
   *      visible so the user can see their day's accomplishments.
   *   2. Up to DAILY_GOAL unfinished topics from the active phase.
   * Completed-today topics always appear first.
   */
  planTopics: DailyPlanTopic[]
  /**
   * Total topics completed today across ALL phases.
   * This drives the progress counter and daily status.
   */
  completedToday: number
  dailyGoal: number
  status: DailyStatus
  /**
   * Bonus XP awarded for each topic completed beyond the daily goal.
   * Display-only — not persisted anywhere. Lifetime XP is untouched.
   * 50 XP per extra topic.
   */
  bonusXP: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns true if `isoString` represents a moment on the current calendar
 * day in the user's local timezone.
 *
 * The backend stores completed_at as a UTC ISO string without a timezone
 * suffix (Python datetime.utcnow().isoformat()). We treat it as UTC and
 * then convert to local time for the date comparison so the day boundary
 * is consistent regardless of the user's timezone.
 */
function isToday(isoString: string | null): boolean {
  if (!isoString) return false
  try {
    // Force UTC interpretation by appending "Z" if absent, then compare
    // local date strings — this correctly handles timezone offsets.
    const utcString = isoString.endsWith("Z") ? isoString : `${isoString}Z`
    const completed = new Date(utcString)
    const now = new Date()
    // toLocaleDateString() with the same locale produces identical strings
    // for the same calendar day in the user's local timezone.
    return completed.toLocaleDateString() === now.toLocaleDateString()
  } catch {
    return false
  }
}

/**
 * Potential XP for a topic that has not yet been completed, mirroring
 * the backend _xp_for_order() helper in roadmap_progress.py.
 */
function xpForOrder(order: number): number {
  if (order <= 4)  return 100
  if (order <= 12) return 180
  return 280
}

// ─── Derivation ─────────────────────────────────────────────────────────────

/**
 * Derive Today's Plan and daily goal state from the backend roadmap state.
 *
 * Pure function — no side effects, no localStorage reads or writes.
 * Intended to be called inside a useMemo() that depends on the data returned
 * by useRoadmapProgress(), guaranteeing it re-runs on every roadmap-update
 * event and stays perfectly synchronized with the roadmap page.
 */
export function deriveDailyProgress(state: BackendRoadmapState): DailyProgress {
  const empty: DailyProgress = {
    planTopics: [],
    completedToday: 0,
    dailyGoal: DAILY_GOAL,
    status: "not_started",
    bonusXP: 0,
  }

  if (!state || state.phases.length === 0) return empty

  // ── 1. Resolve active phase — identical logic to roadmap-card.tsx ─────────
  //    Active phase = first phase with an "active" topic.
  //    Fallback = last phase (roadmap fully completed case).
  const activePhase =
    state.phases.find((p) => p.topics.some((t) => t.status === "active")) ??
    state.phases[state.phases.length - 1]

  if (!activePhase) return empty

  const sorted = [...activePhase.topics].sort((a, b) => a.order - b.order)

  // ── 2. Topics completed today within the active phase ─────────────────────
  //    These remain visible so the user sees what they accomplished.
  //    Filtering to active phase only keeps the list focused and meaningful.
  const completedTodayInPhase = sorted.filter(
    (t) => t.status === "completed" && isToday(t.completed_at)
  )

  // ── 3. Count ALL topics completed today (across every phase) ─────────────
  //    This drives the goal counter.  A user who completed Phase-1 topics
  //    yesterday and Phase-2 topics today only sees today's count.
  const completedTodayCount = state.phases
    .flatMap((p) => p.topics)
    .filter((t) => t.status === "completed" && isToday(t.completed_at))
    .length

  // ── 4. Unfinished topics from the active phase (up to DAILY_GOAL) ─────────
  //    These tell the user what to work on next.
  //    Showing DAILY_GOAL items keeps the plan focused without overwhelming.
  const unfinished = sorted
    .filter((t) => t.status !== "completed")
    .slice(0, DAILY_GOAL)

  // ── 5. Build the combined plan list ───────────────────────────────────────
  //    Completed-today items first (show accomplishment), then unfinished.
  //    A topic cannot appear in both lists (it is either completed or not).
  const planTopics: DailyPlanTopic[] = [
    ...completedTodayInPhase.map((t) => ({
      topicId: t.topic_id,
      topicName: t.topic_name,
      status: "completed" as const,
      completedToday: true,
      xp: t.xp_earned,
    })),
    ...unfinished.map((t) => ({
      topicId: t.topic_id,
      topicName: t.topic_name,
      status: t.status as "active" | "locked",
      completedToday: false,
      xp: xpForOrder(t.order),
    })),
  ]

  // ── 6. Daily status ───────────────────────────────────────────────────────
  //    No "failed" / negative state is emitted during the current day.
  //    The day is still in progress — penalizing now would be premature.
  let status: DailyStatus
  if (completedTodayCount === 0) {
    status = "not_started"
  } else if (completedTodayCount < DAILY_GOAL) {
    status = "in_progress"
  } else if (completedTodayCount === DAILY_GOAL) {
    status = "goal_completed"
  } else {
    status = "goal_exceeded"
  }

  // ── 7. Bonus XP — display-only, not persisted ─────────────────────────────
  //    50 XP per topic completed beyond the daily goal.
  //    Lifetime XP (from the backend xp_earned fields) is never modified here.
  const bonusXP =
    completedTodayCount > DAILY_GOAL
      ? (completedTodayCount - DAILY_GOAL) * 50
      : 0

  return {
    planTopics,
    completedToday: completedTodayCount,
    dailyGoal: DAILY_GOAL,
    status,
    bonusXP,
  }
}
