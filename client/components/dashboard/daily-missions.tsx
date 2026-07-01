"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Zap, CheckCircle2, Clock, Flame, ClipboardCheck, Target } from "lucide-react"
import { useRoadmapProgress } from "@/lib/roadmap-state"
import { deriveDailyProgress } from "@/lib/daily-progress"
import { useAvailableQuizzes } from "@/hooks/use-quiz"

interface Objective {
  id: string
  icon: React.ReactNode
  label: string
  detail: string
  status: "done" | "active" | "pending"
}

export function DailyMissions() {
  const { data } = useRoadmapProgress()
  const { quizzes } = useAvailableQuizzes()

  const daily = useMemo(
    () => (data ? deriveDailyProgress(data) : null),
    [data]
  )

  // ── Derive today's XP earned ─────────────────────────────────────────────
  const xpEarnedToday = useMemo(() => {
    if (!daily) return 0
    return daily.planTopics
      .filter((t) => t.completedToday)
      .reduce((sum, t) => sum + t.xp, 0)
  }, [daily])

  const xpTarget = 300

  // ── Quiz mission ─────────────────────────────────────────────────────────
  const readyQuiz = quizzes.find(
    (q) => q.quiz_status === "READY" || q.quiz_status === "CHALLENGE_AVAILABLE"
  )
  const verifiedQuiz = quizzes.find((q) => q.quiz_status === "VERIFIED")

  // ── Study time estimate ──────────────────────────────────────────────────
  // Approximation: each completed topic ~= 15 min of study
  const studyMinTarget = 45
  const studyMinDone = (daily?.completedToday ?? 0) * 15
  const studyDone = studyMinDone >= studyMinTarget

  // ── Objective definitions ─────────────────────────────────────────────────
  const objectives: Objective[] = [
    {
      id: "study-time",
      icon: <Clock className="w-3.5 h-3.5" />,
      label: `Study ${studyMinTarget}+ minutes`,
      detail: studyDone
        ? `${studyMinDone} min logged`
        : `~${studyMinDone} / ${studyMinTarget} min`,
      status: studyDone ? "done" : (daily?.completedToday ?? 0) > 0 ? "active" : "pending",
    },
    {
      id: "quiz",
      icon: <ClipboardCheck className="w-3.5 h-3.5" />,
      label: "Complete Verification Quiz",
      detail: verifiedQuiz
        ? `${verifiedQuiz.topic_name} — verified`
        : readyQuiz
        ? `${readyQuiz.topic_name} — ready`
        : "Complete a topic to unlock",
      status: verifiedQuiz ? "done" : readyQuiz ? "active" : "pending",
    },
    {
      id: "earn-xp",
      icon: <Zap className="w-3.5 h-3.5" />,
      label: `Earn ${xpTarget} XP today`,
      detail: `${xpEarnedToday} / ${xpTarget} XP`,
      status: xpEarnedToday >= xpTarget ? "done" : xpEarnedToday > 0 ? "active" : "pending",
    },
    {
      id: "streak",
      icon: <Flame className="w-3.5 h-3.5" />,
      label: "Maintain Streak",
      detail: (daily?.completedToday ?? 0) > 0 ? "Active today ✓" : "Complete any topic",
      status: (daily?.completedToday ?? 0) > 0 ? "done" : "active",
    },
  ]

  const completedCount = objectives.filter((o) => o.status === "done").length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="surface-card p-5"
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">Today's Missions</h3>
          <p className="text-mono text-[9px] text-foreground-subtle mt-0.5">
            {completedCount} of {objectives.length} completed
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-2 border border-border">
          <Target className="w-3 h-3 text-accent" />
          <span className="text-mono text-[9px] text-accent font-medium">Objectives</span>
        </div>
      </div>

      {/* ── Objectives list ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        {objectives.map((obj) => {
          const isDone    = obj.status === "done"
          const isActive  = obj.status === "active"
          const isPending = obj.status === "pending"

          return (
            <div
              key={obj.id}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-md border transition-all ${
                isDone
                  ? "bg-success/5 border-success/15"
                  : isActive
                  ? "bg-surface-2 border-accent/20"
                  : "bg-surface-1/40 border-transparent"
              }`}
            >
              {/* Status orb / icon */}
              <div className={`flex-shrink-0 mt-0.5 ${
                isDone ? "text-success" : isActive ? "text-accent" : "text-foreground-subtle/40"
              }`}>
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                    isActive ? "border-accent" : "border-foreground-subtle/30"
                  }`}>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] font-medium block ${
                  isDone ? "text-success/80" : isPending ? "text-foreground-subtle" : "text-foreground"
                }`}>
                  {obj.label}
                </span>
                <span className="text-mono text-[9px] text-foreground-subtle block mt-0.5">
                  {obj.detail}
                </span>
              </div>

              {/* Icon badge */}
              <div className={`flex-shrink-0 ${
                isDone ? "text-success" : isActive ? "text-accent" : "text-foreground-subtle/30"
              }`}>
                {obj.icon}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── All missions done celebration ─────────────────────────────────── */}
      {completedCount === objectives.length && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-success/8 border border-success/15"
        >
          <Zap className="w-3 h-3 text-success" />
          <span className="text-mono text-[9px] font-semibold text-success">
            All missions complete! Outstanding work.
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}
