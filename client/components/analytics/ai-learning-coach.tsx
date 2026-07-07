"use client"

import { motion } from "framer-motion"
import {
  Brain,
  Clock,
  Zap,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import type { CoachRecommendation } from "@/lib/phase3-engine"

interface AILearningCoachProps {
  recommendation: CoachRecommendation
}

// ── Next-action badge styling ──────────────────────────────────────────────
const NEXT_ACTION_STYLES = {
  revision: {
    bg: "bg-warning/8 border-warning/20",
    badge: "bg-warning/10 text-warning border-warning/20",
    icon: RotateCcw,
    iconColor: "text-warning",
  },
  next_topic: {
    bg: "bg-surface-2/40 border-border/40",
    badge: "bg-accent/10 text-accent border-accent/20",
    icon: ArrowRight,
    iconColor: "text-accent",
  },
} as const

export function AILearningCoach({ recommendation: rec }: AILearningCoachProps) {
  // ── Empty / no-roadmap state ───────────────────────────────────────────────
  if (!rec.hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="surface-card p-5 flex flex-col items-center justify-center text-center min-h-[180px] gap-3"
      >
        <div className="w-9 h-9 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Brain className="w-4 h-4 text-accent/60" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">No Active Topic</p>
          <p className="text-[11px] text-foreground-subtle mt-1">
            Start your roadmap to get personalised learning recommendations here.
          </p>
        </div>
        <Link href="/dashboard/roadmap">
          <button className="mt-1 flex items-center gap-1 text-mono text-[10px] text-accent hover:text-accent-hover transition-colors font-medium">
            Open Roadmap
            <ArrowRight className="w-3 h-3" />
          </button>
        </Link>
      </motion.div>
    )
  }

  // ── Roadmap complete state ─────────────────────────────────────────────────
  if (rec.isRoadmapComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="surface-card p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">AI Learning Coach</h3>
              <p className="text-mono text-[9px] text-foreground-subtle">Recommendation Engine</p>
            </div>
          </div>
          <span className="text-mono text-[9px] px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-success font-semibold">
            Track Complete
          </span>
        </div>

        <div className="bg-success/5 border border-success/20 rounded-lg p-4 text-center">
          <Trophy className="w-6 h-6 text-success mx-auto mb-2" />
          <p className="text-[13px] font-semibold text-foreground mb-1">All Topics Mastered</p>
          <p className="text-[11px] text-foreground-subtle leading-relaxed">{rec.reason}</p>
        </div>

        {/* Revision suggestion if available */}
        {rec.nextTopicName && rec.nextAction === "revision" && (
          <div className="bg-warning/8 border border-warning/20 rounded-lg p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <RotateCcw className="w-3.5 h-3.5 text-warning flex-shrink-0" />
              <div className="min-w-0">
                <span className="text-mono text-[8px] text-warning uppercase block">{rec.nextReason}</span>
                <span className="text-[12px] font-medium text-foreground truncate block">{rec.nextTopicName}</span>
              </div>
            </div>
            <Link href={`/topic/${rec.nextTopicId}`}>
              <button className="flex-shrink-0 w-7 h-7 rounded bg-warning/10 border border-warning/20 flex items-center justify-center hover:bg-warning/20 transition-colors">
                <ArrowRight className="w-3 h-3 text-warning" />
              </button>
            </Link>
          </div>
        )}
      </motion.div>
    )
  }

  // ── Normal active-topic state ──────────────────────────────────────────────
  const nextStyle = rec.nextAction ? NEXT_ACTION_STYLES[rec.nextAction] : null
  const NextIcon = nextStyle?.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="surface-card p-5 space-y-4"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">AI Learning Coach</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Recommendation Engine</p>
          </div>
        </div>
        <span className="text-mono text-[8px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold tracking-wide">
          TODAY'S FOCUS
        </span>
      </div>

      {/* ── Primary Focus Card ─────────────────────────────────────────── */}
      <div className="bg-surface-2/40 border border-border/40 rounded-lg p-4 space-y-3">
        {/* Topic name */}
        <div className="flex items-start gap-2">
          <BookOpen className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" />
          <h4 className="text-[14px] font-semibold text-foreground leading-snug">{rec.primaryTopic}</h4>
          {rec.isPrimaryComplete && (
            <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
          )}
        </div>

        {/* Metrics row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-foreground-subtle" />
            <span className="text-mono text-[10px] text-foreground-subtle">
              <span className="text-foreground font-semibold">{rec.estimatedMinutes} min</span>
              {" "}estimated
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-accent" />
            <span className="text-mono text-[10px] text-foreground-subtle">
              <span className="text-accent font-semibold">+{rec.xpReward} XP</span>
              {" "}reward
            </span>
          </div>
        </div>

        {/* Reason */}
        <p className="text-[11.5px] text-foreground-muted leading-relaxed border-t border-border/30 pt-2.5">
          <span className="text-mono text-[8px] text-foreground-subtle uppercase tracking-wide block mb-1">
            Why this?
          </span>
          {rec.reason}
        </p>
      </div>

      {/* ── After This ────────────────────────────────────────────────── */}
      {rec.nextTopicName && nextStyle && NextIcon && (
        <div>
          <span className="text-mono text-[9px] text-foreground-subtle uppercase tracking-wide block mb-2">
            After This
          </span>
          <div className={`border rounded-lg p-3 flex items-center justify-between gap-3 ${nextStyle.bg}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <NextIcon className={`w-3.5 h-3.5 flex-shrink-0 ${nextStyle.iconColor}`} />
              <div className="min-w-0">
                <span className={`text-mono text-[8px] uppercase font-semibold px-1.5 py-0.5 rounded border ${nextStyle.badge} block w-fit mb-1`}>
                  {rec.nextReason}
                </span>
                <span className="text-[12px] font-medium text-foreground truncate block">
                  {rec.nextTopicName}
                </span>
              </div>
            </div>
            {rec.nextTopicId && (
              <Link href={`/topic/${rec.nextTopicId}`}>
                <button className="flex-shrink-0 w-7 h-7 rounded bg-surface-3 border border-border flex items-center justify-center text-foreground-subtle hover:bg-surface-3 hover:text-foreground transition-colors">
                  <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      {rec.primaryTopicId && (
        <Link href={`/topic/${rec.primaryTopicId}`} className="block">
          <button className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5">
            <Brain className="w-3.5 h-3.5" />
            Continue Learning
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </Link>
      )}
    </motion.div>
  )
}
