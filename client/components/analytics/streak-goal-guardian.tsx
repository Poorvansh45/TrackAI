"use client"

import { motion } from "framer-motion"
import { Flame, Shield, Target, ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import type { GuardianStatus, GuardianStatusLabel } from "@/lib/phase3-engine"

interface StreakGoalGuardianProps {
  status: GuardianStatus
}

// ── Status badge styling ───────────────────────────────────────────────────
const STATUS_STYLES: Record<
  GuardianStatusLabel,
  { badge: string; border: string; dot: string }
> = {
  "On Track": {
    badge: "bg-accent/10 text-accent border-accent/20",
    border: "border-accent/20",
    dot: "bg-accent",
  },
  "Ahead of Schedule": {
    badge: "bg-success/10 text-success border-success/20",
    border: "border-success/20",
    dot: "bg-success",
  },
  "Behind Schedule": {
    badge: "bg-warning/10 text-warning border-warning/20",
    border: "border-warning/20",
    dot: "bg-warning",
  },
  "Streak At Risk": {
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    border: "border-destructive/20",
    dot: "bg-destructive",
  },
}

export function StreakGoalGuardian({ status }: StreakGoalGuardianProps) {
  const style = STATUS_STYLES[status.status]

  // ── No-data empty state ────────────────────────────────────────────────────
  if (!status.hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="surface-card p-5 flex flex-col items-center justify-center text-center min-h-[140px] gap-3"
      >
        <Shield className="w-5 h-5 text-foreground-subtle/40" />
        <p className="text-[12px] text-foreground-subtle">
          Start learning to activate your guardian.
        </p>
      </motion.div>
    )
  }

  // Progress fill percentage for the daily goal bar
  const progressPct = Math.min(
    100,
    status.dailyGoal > 0 ? (status.completedToday / status.dailyGoal) * 100 : 0
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="surface-card p-5 space-y-4"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Streak Guardian</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Goal Protection</p>
          </div>
        </div>
      </div>

      {/* ── Streak block ───────────────────────────────────────────────── */}
      <div className="bg-surface-2/40 border border-border/40 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className={`w-3.5 h-3.5 ${status.currentStreak > 0 ? "text-warning" : "text-foreground-subtle/40"}`} />
            <span className="text-mono text-[9px] text-foreground-subtle uppercase">
              Current Streak
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-display text-xl font-semibold text-foreground">
              {status.currentStreak}
            </span>
            <span className="text-mono text-[9px] text-foreground-subtle">days</span>
          </div>
        </div>

        {/* Streak at risk warning */}
        {status.streakAtRisk && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className={`rounded-md border p-2.5 ${style.border} bg-destructive/5`}
          >
            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Study for{" "}
              <span className="font-semibold text-foreground">{status.minutesNeeded} minutes</span>{" "}
              today to keep your streak alive.
            </p>
          </motion.div>
        )}

        {/* Already studied today */}
        {status.streakAlive && !status.streakAtRisk && (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-success" />
            <span className="text-mono text-[9px] text-success">Streak protected today</span>
          </div>
        )}
      </div>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="border-t border-border/40" />

      {/* ── Today's Goal ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-accent" />
          <span className="text-mono text-[9px] text-foreground-subtle uppercase">Today's Goal</span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11.5px] text-foreground-muted leading-snug">
              Complete{" "}
              <span className="font-semibold text-foreground">{status.dailyGoal} Topic{status.dailyGoal !== 1 ? "s" : ""}</span>
            </p>
            <p className="text-mono text-[10px] text-foreground-subtle mt-0.5">
              {status.remaining > 0
                ? `${status.remaining} remaining`
                : "Daily goal reached 🎉"}
            </p>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className={`text-display text-2xl font-semibold ${
              status.remaining === 0 ? "text-success" : "text-foreground"
            }`}>
              {status.completedToday}
            </span>
            <span className="text-mono text-[9px] text-foreground-subtle">/{status.dailyGoal}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              background:
                status.remaining === 0
                  ? "var(--success)"
                  : status.streakAtRisk
                  ? "oklch(0.55 0.20 25)"
                  : "var(--accent)",
            }}
          />
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="border-t border-border/40" />

      {/* ── Status badge ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-mono text-[9px] text-foreground-subtle uppercase">Status</span>
        <span
          className={`text-mono text-[9px] font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${style.badge}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
          {status.status}
        </span>
      </div>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <Link
        href={status.activeTopic ? `/topic/${status.activeTopic.id}` : "/dashboard/roadmap"}
        className="block"
      >
        <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-md border border-accent/25 bg-accent/8 hover:bg-accent/15 text-mono text-[10px] text-accent font-semibold transition-all">
          <Target className="w-3.5 h-3.5" />
          {status.activeTopic ? `Resume: ${status.activeTopic.name}` : "Open Roadmap"}
          <ArrowRight className="w-3 h-3" />
        </button>
      </Link>
    </motion.div>
  )
}
