"use client"

import { motion } from "framer-motion"
import {
  ClipboardCheck,
  ArrowRight,
  Target,
  Loader2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { useAvailableQuizzes } from "@/hooks/use-quiz"
import type { AvailableQuiz } from "@/lib/quiz-api"

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusLabel(status: AvailableQuiz["quiz_status"]): string {
  const map: Record<string, string> = {
    READY:               "Ready",
    GENERATING:          "Generating…",
    IN_PROGRESS:         "In Progress",
    VERIFIED:            "Verified",
    NEEDS_REVISION:      "Needs Revision",
    CHALLENGE_AVAILABLE: "Challenge Ready",
    FAILED:              "Failed",
    NOT_AVAILABLE:       "Not Available",
  }
  return map[status] ?? status
}

function statusBadgeClass(status: AvailableQuiz["quiz_status"]): string {
  switch (status) {
    case "READY":
    case "CHALLENGE_AVAILABLE":
      return "bg-accent-subtle text-accent border border-accent/20"
    case "GENERATING":
      return "bg-warning-muted text-warning border border-warning/20"
    case "VERIFIED":
      return "bg-success-muted text-success border border-success/20"
    case "NEEDS_REVISION":
      return "bg-warning-muted text-warning border border-warning/20"
    case "FAILED":
      return "bg-destructive-muted text-destructive border border-destructive/20"
    default:
      return "bg-surface-2 text-foreground-subtle border border-border/40"
  }
}

function StatusIcon({ status }: { status: AvailableQuiz["quiz_status"] }) {
  switch (status) {
    case "GENERATING":
      return <Loader2 className="w-3 h-3 animate-spin" />
    case "VERIFIED":
      return <CheckCircle2 className="w-3 h-3" />
    case "NEEDS_REVISION":
      return <AlertTriangle className="w-3 h-3" />
    case "CHALLENGE_AVAILABLE":
      return <Trophy className="w-3 h-3" />
    default:
      return <Target className="w-3 h-3" />
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QuizCard() {
  const { quizzes, loading } = useAvailableQuizzes()

  // Priority: NEEDS_REVISION (retry) → READY → CHALLENGE_AVAILABLE → GENERATING
  const priority: Array<AvailableQuiz["quiz_status"]> = [
    "NEEDS_REVISION",
    "READY",
    "CHALLENGE_AVAILABLE",
    "GENERATING",
  ]
  const featured =
    quizzes
      .filter((q) => priority.includes(q.quiz_status))
      .sort(
        (a, b) =>
          priority.indexOf(a.quiz_status) - priority.indexOf(b.quiz_status)
      )[0] ?? null

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="surface-card p-5"
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-surface-2 animate-skeleton" />
            <div className="h-2 w-20 rounded bg-surface-2 animate-skeleton" />
          </div>
        </div>
        <div className="h-16 rounded-lg bg-surface-2 animate-skeleton mb-4" />
        <div className="h-9 rounded-md bg-surface-2 animate-skeleton" />
      </motion.div>
    )
  }

  // ── Empty state (no quizzes yet) ────────────────────────────────────────────
  if (!featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="surface-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">
                Pending verification
              </h3>
              <p className="text-mono text-[9px] text-foreground-subtle">
                Complete a topic to unlock
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border/40 mb-4">
          <p className="text-[11px] text-foreground-muted leading-relaxed">
            Finish any topic checklist to automatically generate a 10-question
            verification quiz.
          </p>
        </div>

        <Link href="/dashboard/quiz">
          <button className="w-full bg-surface-2 hover:bg-surface-3 border border-border text-foreground-muted rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            View Quizzes
          </button>
        </Link>
      </motion.div>
    )
  }

  // ── Generating state ────────────────────────────────────────────────────────
  if (featured.quiz_status === "GENERATING") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="surface-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-warning/15 flex items-center justify-center text-warning">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h3 className="text-[13px] font-semibold text-foreground">
                Preparing quiz
              </h3>
              <p className="text-mono text-[9px] text-foreground-subtle">
                AI generating questions…
              </p>
            </div>
          </div>
          <span
            className={`text-mono text-[8px] px-1.5 py-0.5 rounded font-semibold uppercase flex items-center gap-1 ${statusBadgeClass(featured.quiz_status)}`}
          >
            <StatusIcon status={featured.quiz_status} />
            {statusLabel(featured.quiz_status)}
          </span>
        </div>

        <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border/40 mb-4 space-y-1.5">
          <span className="text-[12px] font-semibold text-foreground block">
            {featured.topic_name}
          </span>
          <p className="text-[11px] text-foreground-muted">
            Your quiz will be ready shortly. No need to wait here.
          </p>
        </div>

        <button
          disabled
          className="w-full bg-surface-2 text-foreground-subtle border border-border rounded-md h-9 px-4 text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-not-allowed opacity-50"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Generating…
        </button>
      </motion.div>
    )
  }

  // ── Active quiz available ───────────────────────────────────────────────────
  const isChallenge = featured.quiz_status === "CHALLENGE_AVAILABLE"
  const isRevision  = featured.quiz_status === "NEEDS_REVISION"

  const ctaLabel = isChallenge
    ? "Start Challenge Mode"
    : isRevision
    ? "Retry Quiz"
    : "Start Verification Quiz"

  const href = `/dashboard/quiz?topic=${encodeURIComponent(featured.topic_id)}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center ${
              isChallenge
                ? "bg-accent/15 text-accent"
                : isRevision
                ? "bg-warning/15 text-warning"
                : "bg-accent/15 text-accent"
            }`}
          >
            {isChallenge ? (
              <Trophy className="w-4 h-4" />
            ) : (
              <ClipboardCheck className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">
              {isChallenge
                ? "Challenge ready"
                : isRevision
                ? "Revision quiz"
                : "Pending verification"}
            </h3>
            <p className="text-mono text-[9px] text-foreground-subtle">
              {isChallenge ? "You scored ≥ 90% — go further" : "Quiz checkpoint ready"}
            </p>
          </div>
        </div>
        <span
          className={`text-mono text-[8px] px-1.5 py-0.5 rounded font-semibold uppercase flex items-center gap-1 ${statusBadgeClass(featured.quiz_status)}`}
        >
          <StatusIcon status={featured.quiz_status} />
          {statusLabel(featured.quiz_status)}
        </span>
      </div>

      {/* Quiz details */}
      <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border/40 mb-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-foreground truncate">
            {featured.topic_name}
          </span>
          <div className="flex items-center gap-1 text-mono text-[9px] text-accent flex-shrink-0">
            <Zap className="w-3 h-3" />
            <span>{featured.xp_reward} XP</span>
          </div>
        </div>
        <div className="text-[11px] text-foreground-muted">
          {featured.attempt_count > 0
            ? `${featured.attempt_count} attempt${featured.attempt_count > 1 ? "s" : ""} · Last score: ${featured.user_score?.toFixed(0) ?? "—"}%`
            : "10 questions · No previous attempts"}
        </div>
      </div>

      {/* CTA */}
      <Link href={href}>
        <button
          className={`w-full rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 ${
            isChallenge
              ? "bg-accent hover:bg-accent-hover text-accent-foreground"
              : isRevision
              ? "bg-warning/20 hover:bg-warning/30 text-warning border border-warning/30"
              : "bg-accent hover:bg-accent-hover text-accent-foreground"
          }`}
        >
          {isChallenge ? (
            <Trophy className="w-3.5 h-3.5" />
          ) : (
            <Target className="w-3.5 h-3.5" />
          )}
          {ctaLabel}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  )
}
