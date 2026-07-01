"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { BarChart3, BookOpen, Target, Zap, CheckCircle2, ChevronRight, Layers } from "lucide-react"
import Link from "next/link"
import { useRoadmapProgress } from "@/lib/roadmap-state"

export function ProgressAnalytics() {
  const { data, loading } = useRoadmapProgress()

  const stats = useMemo(() => {
    if (!data) return null

    const flat = data.phases.flatMap((p) => p.topics)
    const completedTopics = flat.filter((t) => t.status === "completed")
    const remaining = flat.filter((t) => t.status !== "completed")
    const totalXP = completedTopics.reduce((sum, t) => sum + t.xp_earned, 0)
    const verifiedCount = completedTopics.length
    const totalTopics = flat.length

    // Active phase info
    const activePhase =
      data.phases.find((p) => p.topics.some((t) => t.status === "active")) ??
      data.phases[data.phases.length - 1]
    const phaseCompleted =
      activePhase?.topics.filter((t) => t.status === "completed").length ?? 0
    const phaseTotal = activePhase?.topics.length ?? 0

    // Overall completion %
    const completionPct =
      totalTopics > 0 ? Math.round((verifiedCount / totalTopics) * 100) : 0

    // Weekly chart — Mon=0 … Sun=6
    const dayIndex = (new Date().getDay() + 6) % 7
    const weeklyData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (day, i) => ({
        day,
        filled: i < dayIndex,
        active: i === dayIndex,
      })
    )

    return {
      verifiedCount,
      totalTopics,
      remaining: remaining.length,
      totalXP,
      completionPct,
      phaseCompleted,
      phaseTotal,
      phaseName: activePhase?.phase_title ?? "",
      phaseNumber: activePhase?.phase_number ?? 1,
      weeklyData,
    }
  }, [data])

  // ── Contextual summary — appears below phase section, no duplicate stats ──
  const contextMessage = stats
    ? stats.verifiedCount === stats.totalTopics && stats.totalTopics > 0
      ? "You've mastered the entire track. Consider attempting challenge quizzes to reinforce your knowledge."
      : stats.verifiedCount > 0
      ? `You're ${stats.completionPct}% through your learning journey. ${stats.remaining} topic${stats.remaining !== 1 ? "s" : ""} remain to complete your roadmap.`
      : null // empty state handles this
    : null

  // ── Empty state: no topics completed yet ──────────────────────────────────
  const isEmpty = !loading && stats !== null && stats.verifiedCount === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="surface-card p-5"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">
              Progress Analytics
            </h3>
            <p className="text-mono text-[9px] text-foreground-subtle">
              {loading
                ? "Loading..."
                : stats
                ? `${stats.completionPct}% of track complete`
                : "No data"}
            </p>
          </div>
        </div>

        {/* View Full Analytics link */}
        <Link href="/dashboard/analytics">
          <button className="flex items-center gap-1 text-mono text-[10px] text-accent hover:text-accent-hover transition-colors font-medium">
            View Analytics
            <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {isEmpty && (
        <div className="py-6 flex flex-col items-center text-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Layers className="w-4 h-4 text-accent/60" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-foreground">
              Start learning to unlock your analytics
            </p>
            <p className="text-[11px] text-foreground-subtle mt-1 leading-relaxed">
              Your progress and study insights will appear here as you complete
              topics.
            </p>
          </div>
          <Link href="/dashboard/roadmap">
            <button className="mt-1 flex items-center gap-1 text-mono text-[10px] text-accent hover:text-accent-hover transition-colors font-medium">
              Open Roadmap
              <ChevronRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
      )}

      {/* ── Main content (only when topics are started) ─────────────────── */}
      {!isEmpty && (
        <>
          {/* ── KPI Stats row ────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {/* Topics Mastered */}
            <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
              <div className="flex items-center gap-1 mb-1.5">
                <CheckCircle2 className="w-3 h-3 text-success" />
                <span className="text-mono text-[8px] text-foreground-subtle uppercase">
                  Topics Mastered
                </span>
              </div>
              <div className="text-mono text-base font-semibold text-foreground leading-none">
                {loading ? "—" : stats?.verifiedCount ?? 0}
              </div>
              <div className="text-mono text-[8px] text-foreground-subtle mt-0.5">
                of {loading ? "—" : stats?.totalTopics ?? 0}
              </div>
            </div>

            {/* Topics Remaining */}
            <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
              <div className="flex items-center gap-1 mb-1.5">
                <Target className="w-3 h-3 text-accent" />
                <span className="text-mono text-[8px] text-foreground-subtle uppercase">
                  Topics Remaining
                </span>
              </div>
              <div className="text-mono text-base font-semibold text-foreground leading-none">
                {loading ? "—" : stats?.remaining ?? 0}
              </div>
              <div className="text-mono text-[8px] text-foreground-subtle mt-0.5">
                to complete
              </div>
            </div>

            {/* XP Earned */}
            <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
              <div className="flex items-center gap-1 mb-1.5">
                <Zap className="w-3 h-3 text-accent" />
                <span className="text-mono text-[8px] text-foreground-subtle uppercase">
                  XP Earned
                </span>
              </div>
              <div className="text-mono text-base font-semibold text-foreground leading-none">
                {loading ? "—" : (stats?.totalXP ?? 0).toLocaleString()}
              </div>
              <div className="text-mono text-[8px] text-foreground-subtle mt-0.5">
                lifetime
              </div>
            </div>
          </div>

          {/* ── Weekly activity chart ─────────────────────────────────── */}
          <div className="h-28 bg-surface-2/20 border border-border/40 rounded-lg p-3 flex items-end justify-between gap-2.5 mb-4">
            {(
              stats?.weeklyData ??
              ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                (day, i) => ({
                  day,
                  filled: false,
                  active: i === (new Date().getDay() + 6) % 7,
                })
              )
            ).map((d) => (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
              >
                <div className="w-full relative group">
                  <motion.div
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      d.active
                        ? "bg-accent"
                        : d.filled
                        ? "bg-accent/40"
                        : "bg-foreground-subtle/15 group-hover:bg-foreground-subtle/30"
                    }`}
                    initial={{ height: 0 }}
                    animate={{
                      // today's bar is taller to stand out
                      height: d.active ? "48px" : d.filled ? "28px" : "6px",
                    }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                  {/* Today dot */}
                  {d.active && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_oklch(0.62_0.20_275/0.6)]" />
                  )}
                </div>
                <span
                  className={`text-mono text-[9px] ${
                    d.active
                      ? "text-accent font-bold"
                      : "text-foreground-subtle"
                  }`}
                >
                  {d.day}
                </span>
              </div>
            ))}
          </div>

          {/* ── Current Phase section ─────────────────────────────────── */}
          {stats && stats.phaseTotal > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-surface-2/30 border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3 h-3 text-accent" />
                  <span className="text-mono text-[8px] text-foreground-subtle uppercase tracking-wide">
                    Current Phase
                  </span>
                </div>
                <span className="text-mono text-[9px] text-accent font-semibold">
                  {stats.phaseCompleted} / {stats.phaseTotal} Topics
                </span>
              </div>
              <p className="text-[12px] font-semibold text-foreground mb-2 truncate">
                {stats.phaseName}
              </p>
              <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${
                      stats.phaseTotal > 0
                        ? (stats.phaseCompleted / stats.phaseTotal) * 100
                        : 0
                    }%`,
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  style={{ background: "oklch(0.62 0.20 275)" }}
                />
              </div>
            </div>
          )}

          {/* ── Contextual summary (no duplicate stats) ───────────────── */}
          {contextMessage && (
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              {contextMessage}
            </p>
          )}
        </>
      )}
    </motion.div>
  )
}
