"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Calendar, CheckCircle2, Circle, Target, Zap, Trophy, TrendingUp } from "lucide-react"
import { useRoadmapProgress } from "@/lib/roadmap-state"
import { deriveDailyProgress, type DailyStatus } from "@/lib/daily-progress"

// ─── Status display helpers ──────────────────────────────────────────────────

const STATUS_CLASS: Record<DailyStatus, string> = {
  not_started:    "text-foreground-subtle bg-surface-2 border-border/40",
  in_progress:    "text-accent bg-accent/10 border-accent/25",
  goal_completed: "text-success bg-success/10 border-success/25",
  goal_exceeded:  "text-warning bg-warning-muted border-warning/25",
}

const PROGRESS_COLOR: Record<DailyStatus, string> = {
  not_started:    "oklch(0.62 0.20 275)",
  in_progress:    "oklch(0.62 0.20 275)",
  goal_completed: "oklch(0.60 0.16 155)",
  goal_exceeded:  "oklch(0.75 0.12 60)",
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlannerCard() {
  const router = useRouter()
  const { data, loading } = useRoadmapProgress()

  const daily = useMemo(
    () => (data ? deriveDailyProgress(data) : null),
    [data]
  )

  const activeTopic = daily?.planTopics.find((t) => t.status === "active")
  const progressPct = daily
    ? Math.min(100, (daily.completedToday / daily.dailyGoal) * 100)
    : 0

  // ── Derive header copy based on daily status ───────────────────────────────
  const headerContent = () => {
    if (!daily) return { title: "Today's Plan", subtitle: "Block schedule", badge: null }
    switch (daily.status) {
      case "goal_exceeded":
        return {
          title: "Today's Plan",
          subtitle: `Goal Met! ${daily.dailyGoal} / ${daily.dailyGoal} done`,
          badge: (
            <span className={`text-mono text-[8px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_CLASS["goal_exceeded"]}`}>
              EXCEEDED ★
            </span>
          ),
        }
      case "goal_completed":
        return {
          title: "Today's Plan",
          subtitle: `Daily Goal Completed · ${daily.dailyGoal} / ${daily.dailyGoal}`,
          badge: (
            <span className={`text-mono text-[8px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_CLASS["goal_completed"]}`}>
              GOAL MET ✓
            </span>
          ),
        }
      case "in_progress":
        return {
          title: "Today's Plan",
          subtitle: `${daily.completedToday} / ${daily.dailyGoal} daily goal`,
          badge: (
            <span className={`text-mono text-[8px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_CLASS["in_progress"]}`}>
              IN PROGRESS
            </span>
          ),
        }
      default:
        return {
          title: "Today's Plan",
          subtitle: `0 / ${daily.dailyGoal} daily goal`,
          badge: (
            <span className={`text-mono text-[8px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_CLASS["not_started"]}`}>
              NOT STARTED
            </span>
          ),
        }
    }
  }

  const header = headerContent()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="surface-card p-5"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">{header.title}</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">{header.subtitle}</p>
          </div>
        </div>
        {header.badge}
      </div>

      {/* ── Daily goal progress bar ──────────────────────────────────────── */}
      {daily && (
        <div className="mb-4">
          <div className="flex justify-between text-mono text-[9px] mb-1.5">
            <span className="text-foreground-subtle">
              {daily.status === "goal_exceeded" || daily.status === "goal_completed"
                ? "Daily goal reached"
                : "Daily goal"}
            </span>
            <motion.span
              key={daily.completedToday}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`font-semibold ${
                daily.status === "goal_exceeded" ? "text-warning" :
                daily.status === "goal_completed" ? "text-success" :
                "text-accent"
              }`}
            >
              {Math.min(daily.completedToday, daily.dailyGoal)} / {daily.dailyGoal}
            </motion.span>
          </div>
          <div className="h-0.5 bg-surface-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ background: PROGRESS_COLOR[daily.status] }}
            />
          </div>
        </div>
      )}

      {/* ── Plan item list ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        {loading && !daily && (
          <p className="text-[12px] text-foreground-subtle text-center py-3">
            Loading plan...
          </p>
        )}

        {!loading && daily && daily.planTopics.length === 0 && (
          <p className="text-[12px] text-foreground-subtle text-center py-3">
            All caught up — roadmap complete! 🎉
          </p>
        )}

        {daily?.planTopics.map((topic) => {
          const isDone   = topic.completedToday
          const isActive = topic.status === "active"

          return (
            <div
              key={topic.topicId}
              onClick={() => {
                if (!isDone && topic.topicId) router.push(`/topic/${topic.topicId}`)
              }}
              className={`flex items-center gap-3 p-2.5 rounded border transition-all ${
                isDone
                  ? "bg-surface-1/20 border-success/10"
                  : isActive
                  ? "bg-surface-2 border-accent/20 cursor-pointer hover:border-accent/40"
                  : "bg-surface-1/40 border-transparent"
              }`}
            >
              {/* Status icon */}
              <div className="flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                ) : isActive ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                ) : (
                  <Circle className="w-3 h-3 text-foreground-subtle/30" />
                )}
              </div>

              {/* Topic name */}
              <span
                className={`flex-1 min-w-0 text-[12px] font-medium truncate block ${
                  isDone
                    ? "text-success/70"
                    : isActive
                    ? "text-foreground"
                    : "text-foreground-subtle"
                }`}
              >
                {topic.topicName}
              </span>

              {/* Right side: "Done today" or XP */}
              {isDone ? (
                <span className="text-mono text-[9px] font-semibold text-success flex-shrink-0">
                  +{topic.xp} XP
                </span>
              ) : (
                <span className={`text-mono text-[9px] font-semibold flex-shrink-0 text-accent`}>
                  +{topic.xp} XP
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Exceeded Goal summary ────────────────────────────────────────── */}
      {daily && daily.status === "goal_exceeded" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-md border border-warning/20 bg-warning-muted p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-warning" />
              <span className="text-mono text-[9px] font-semibold text-warning">Extra Learning</span>
            </div>
            <span className="text-mono text-[9px] text-warning font-bold">
              +{daily.completedToday - daily.dailyGoal} Topics
            </span>
          </div>
          {daily.bonusXP > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Zap className="w-3 h-3 text-warning" />
              <span className="text-mono text-[9px] text-warning">Bonus XP: +{daily.bonusXP}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Bonus XP notice (goal_exceeded handled above; this is for overflow edge) ── */}
      {daily && daily.bonusXP > 0 && daily.status !== "goal_exceeded" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-warning-muted border border-warning/20"
        >
          <Zap className="w-3 h-3 text-warning" />
          <span className="text-mono text-[9px] font-semibold text-warning">
            +{daily.bonusXP} Bonus XP earned today!
          </span>
        </motion.div>
      )}

      {/* ── Active topic CTA ─────────────────────────────────────────────── */}
      {!loading && activeTopic && (
        <button
          onClick={() => router.push(`/topic/${activeTopic.topicId}`)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-md border border-accent/25 bg-accent/8 hover:bg-accent/15 text-mono text-[10px] text-accent font-semibold transition-all"
        >
          <Target className="w-3.5 h-3.5" />
          Continue: {activeTopic.topicName}
        </button>
      )}

      {/* ── Completed state CTA ──────────────────────────────────────────── */}
      {daily && (daily.status === "goal_completed" || daily.status === "goal_exceeded") && !activeTopic && (
        <div className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-md bg-success/8 border border-success/15">
          <TrendingUp className="w-3.5 h-3.5 text-success" />
          <span className="text-mono text-[10px] text-success font-semibold">
            Daily goal achieved — great work!
          </span>
        </div>
      )}
    </motion.div>
  )
}
