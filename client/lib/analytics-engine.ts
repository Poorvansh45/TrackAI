import { BackendRoadmapState } from "@/lib/roadmap-state"
import {
  differenceInCalendarDays,
  differenceInWeeks,
  startOfWeek,
  format,
  parseISO,
  isSameDay,
  subWeeks,
  addWeeks,
} from "date-fns"

function parseCompletedAt(completedAt: string): Date {
  const utcString = completedAt.endsWith("Z") ? completedAt : `${completedAt}Z`
  return parseISO(utcString)
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface StreakData {
  currentStreak: number
  longestStreak: number
  activeDates: Set<string> // ISO date strings (YYYY-MM-DD)
}

export interface VelocityData {
  topicsPerWeek: number
  history: { week: string; count: number }[]
}

export interface ForecastData {
  remainingTopics: number
  estimatedCompletionDate: Date | null
  weeksRemaining: number
  pace: "fast" | "steady" | "slow" | "stagnant"
}

export interface XPWeek {
  week: string
  xp: number
}

export interface PhasePoint {
  phaseNumber: number
  phaseTitle: string
  totalTopics: number
  completedTopics: number
  progressPct: number
  isActive: boolean
}

export interface Insight {
  type: "positive" | "neutral" | "warning"
  message: string
}

// ── Engine Functions ────────────────────────────────────────────────────────

function flattenTopics(state: BackendRoadmapState) {
  return state.phases.flatMap((p) =>
    p.topics.map((t) => ({ ...t, phase_number: p.phase_number }))
  )
}

export function deriveStreak(state: BackendRoadmapState | null): StreakData {
  if (!state) return { currentStreak: 0, longestStreak: 0, activeDates: new Set() }

  const topics = flattenTopics(state).filter((t) => t.status === "completed" && t.completed_at)
  
  // Extract unique calendar days where at least 1 topic was completed
  const activeDatesArr = Array.from(
    new Set(topics.map((t) => format(parseCompletedAt(t.completed_at!), "yyyy-MM-dd")))
  ).sort()

  const activeDates = new Set(activeDatesArr)

  if (activeDatesArr.length === 0) {
    return { currentStreak: 0, longestStreak: 0, activeDates }
  }

  // Calculate longest streak
  let longest = 1
  let currentRun = 1
  
  for (let i = 1; i < activeDatesArr.length; i++) {
    const prev = new Date(activeDatesArr[i - 1])
    const curr = new Date(activeDatesArr[i])
    if (differenceInCalendarDays(curr, prev) === 1) {
      currentRun++
      longest = Math.max(longest, currentRun)
    } else {
      currentRun = 1
    }
  }

  // Calculate current streak
  let current = 0
  const today = new Date()
  let checkDate = new Date(today)
  
  // Is today active?
  if (activeDates.has(format(checkDate, "yyyy-MM-dd"))) {
    current = 1
    checkDate.setDate(checkDate.getDate() - 1)
  } else {
    // If today is not active, check if yesterday was (streak is still alive if they just haven't studied yet today)
    checkDate.setDate(checkDate.getDate() - 1)
    if (activeDates.has(format(checkDate, "yyyy-MM-dd"))) {
      current = 1
      checkDate.setDate(checkDate.getDate() - 1)
    }
  }

  while (current > 0 && activeDates.has(format(checkDate, "yyyy-MM-dd"))) {
    current++
    checkDate.setDate(checkDate.getDate() - 1)
  }

  return { currentStreak: current, longestStreak: Math.max(longest, current), activeDates }
}

export function deriveVelocity(state: BackendRoadmapState | null): VelocityData {
  if (!state) return { topicsPerWeek: 0, history: [] }

  const topics = flattenTopics(state).filter((t) => t.status === "completed" && t.completed_at)
  
  const today = new Date()
  const weeksMap = new Map<string, number>()
  
  // Initialize last 4 weeks with 0
  for (let i = 3; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 })
    weeksMap.set(format(weekStart, "MMM d"), 0)
  }

  let recentTopicsCount = 0

  topics.forEach((t) => {
    const date = parseCompletedAt(t.completed_at!)
    // Only count if within last 4 weeks
    if (differenceInWeeks(today, date) <= 4) {
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      const key = format(weekStart, "MMM d")
      if (weeksMap.has(key)) {
        weeksMap.set(key, weeksMap.get(key)! + 1)
        recentTopicsCount++
      }
    }
  })

  // Average over 4 weeks
  const topicsPerWeek = Number((recentTopicsCount / 4).toFixed(1))

  const daysMap = new Map<string, number>()
  
  // Initialize last 7 days with 0 for daily graph
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)
    daysMap.set(format(day, "MMM d"), 0)
  }

  topics.forEach((t) => {
    const date = parseCompletedAt(t.completed_at!)
    const key = format(date, "MMM d")
    if (daysMap.has(key)) {
      daysMap.set(key, daysMap.get(key)! + 1)
    }
  })

  const history = Array.from(daysMap.entries()).map(([week, count]) => ({ week, count }))

  return { topicsPerWeek, history }
}

export function deriveForecast(state: BackendRoadmapState | null, velocity: VelocityData): ForecastData {
  if (!state) {
    return { remainingTopics: 0, estimatedCompletionDate: null, weeksRemaining: 0, pace: "stagnant" }
  }

  const topics = flattenTopics(state)
  const remainingTopics = topics.filter((t) => t.status !== "completed").length

  if (remainingTopics === 0) {
    return { remainingTopics: 0, estimatedCompletionDate: new Date(), weeksRemaining: 0, pace: "fast" }
  }

  if (velocity.topicsPerWeek < 0.1) {
    return { remainingTopics, estimatedCompletionDate: null, weeksRemaining: Infinity, pace: "stagnant" }
  }

  const weeksRemaining = Math.ceil(remainingTopics / velocity.topicsPerWeek)
  const estimatedCompletionDate = addWeeks(new Date(), weeksRemaining)

  let pace: ForecastData["pace"] = "steady"
  if (velocity.topicsPerWeek >= 3) pace = "fast"
  else if (velocity.topicsPerWeek < 1) pace = "slow"

  return { remainingTopics, estimatedCompletionDate, weeksRemaining, pace }
}

export function deriveXPTimeline(state: BackendRoadmapState | null): XPWeek[] {
  if (!state) return []

  const topics = flattenTopics(state).filter((t) => t.status === "completed" && t.completed_at)
  
  const today = new Date()
  const daysMap = new Map<string, number>()
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)
    daysMap.set(format(day, "MMM d"), 0)
  }

  topics.forEach((t) => {
    const date = parseCompletedAt(t.completed_at!)
    const key = format(date, "MMM d")
    if (daysMap.has(key)) {
      daysMap.set(key, daysMap.get(key)! + (t.xp_earned || 0))
    }
  })

  return Array.from(daysMap.entries()).map(([week, xp]) => ({ week, xp }))
}

export function derivePhaseTimeline(state: BackendRoadmapState | null): PhasePoint[] {
  if (!state) return []

  const hasActiveTopic = flattenTopics(state).some(t => t.status === "active")

  return state.phases.map((p, idx) => {
    const totalTopics = p.topics.length
    const completedTopics = p.topics.filter((t) => t.status === "completed").length
    const progressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
    
    // A phase is active if it contains an active topic, OR if there are no active topics anywhere 
    // and it's the last phase with completed topics but not fully completed
    let isActive = p.topics.some((t) => t.status === "active")
    
    // fallback logic if no topic is strictly "active" but user is midway
    if (!hasActiveTopic && progressPct > 0 && progressPct < 100) {
        isActive = true
    }

    return {
      phaseNumber: p.phase_number,
      phaseTitle: p.phase_title,
      totalTopics,
      completedTopics,
      progressPct,
      isActive,
    }
  })
}

export function deriveInsights(
  state: BackendRoadmapState | null,
  streak: StreakData,
  velocity: VelocityData,
  forecast: ForecastData
): Insight[] {
  if (!state) return []
  
  const insights: Insight[] = []
  const topics = flattenTopics(state)
  const completedCount = topics.filter(t => t.status === "completed").length
  
  if (completedCount === 0) {
    return [{ type: "neutral", message: "Complete your first topic to start generating insights." }]
  }

  // 1. Consistency Insight
  if (streak.currentStreak >= 3) {
    insights.push({
      type: "positive",
      message: `Great consistency! You're on a ${streak.currentStreak}-day learning streak.`,
    })
  } else if (streak.longestStreak > 7 && streak.currentStreak === 0) {
    insights.push({
      type: "warning",
      message: `You previously hit a ${streak.longestStreak}-day streak. Jump back in today to build momentum again.`,
    })
  }

  // 2. Pace / Velocity Insight
  if (velocity.topicsPerWeek >= 4) {
    insights.push({
      type: "positive",
      message: `Your learning pace is incredibly fast at ${velocity.topicsPerWeek} topics per week.`,
    })
  } else if (velocity.topicsPerWeek > 0 && velocity.topicsPerWeek < 1) {
    insights.push({
      type: "neutral",
      message: `You're making steady but slow progress. Try dedicating 20 more minutes a day to increase velocity.`,
    })
  }

  // 3. Completion Forecast Insight
  if (forecast.pace === "stagnant") {
    insights.push({
      type: "warning",
      message: `Your progress has stalled. Complete a topic this week to update your forecast.`,
    })
  } else if (forecast.pace === "fast" && forecast.estimatedCompletionDate) {
    insights.push({
      type: "positive",
      message: `At this rate, you'll finish the entire track early by ${format(forecast.estimatedCompletionDate, "MMMM d")}.`,
    })
  }

  // Fallback if none matched
  if (insights.length === 0) {
    insights.push({
      type: "neutral",
      message: `You've completed ${completedCount} topics so far. Keep up the good work!`,
    })
  }

  return insights.slice(0, 3) // Return top 3 insights
}
