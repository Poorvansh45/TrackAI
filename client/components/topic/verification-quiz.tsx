"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Shield,
  Lock,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Zap,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { getQuizStatus, triggerQuizGeneration, type QuizStatus } from "@/lib/quiz-api"

const POLL_INTERVAL_MS = 5_000

interface VerificationQuizProps {
  topicTitle: string
  topicId?: string
  /** Whether the topic checklist is fully completed (controls Locked vs polling) */
  isTopicCompleted?: boolean
  /** Skill name to pass through to the generator on retry (matches trigger payload) */
  skill?: string
}

export function VerificationQuiz({
  topicTitle,
  topicId,
  isTopicCompleted = false,
  skill = "General",
}: VerificationQuizProps) {
  const router = useRouter()
  const [status, setStatus] = useState<QuizStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  // ── Stop any running poll ────────────────────────────────────────────────
  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  // ── Fetch status once ────────────────────────────────────────────────────
  const fetchStatus = useCallback(async (): Promise<QuizStatus | null> => {
    if (!topicId) return null
    const res = await getQuizStatus(topicId)
    if (!mountedRef.current) return null
    if (res) {
      setStatus(res.quiz_status)
      return res.quiz_status
    }
    return null
  }, [topicId])

  // ── Start polling while GENERATING ──────────────────────────────────────
  const startPoll = useCallback(() => {
    stopPoll()
    pollRef.current = setInterval(async () => {
      const s = await fetchStatus()
      if (s && s !== "GENERATING") stopPoll()
    }, POLL_INTERVAL_MS)
  }, [fetchStatus, stopPoll])

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true

    if (!topicId || !isTopicCompleted) {
      // Topic not yet complete or no ID — show Locked
      setStatus(null)
      setLoading(false)
      return
    }

    setLoading(true)
    fetchStatus().then((s) => {
      if (!mountedRef.current) return
      setLoading(false)
      if (s === "GENERATING") startPoll()
    })

    return () => {
      mountedRef.current = false
      stopPoll()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, isTopicCompleted])

  // ── Navigate to quiz page ────────────────────────────────────────────────
  const goToQuiz = () => {
    if (topicId) router.push(`/dashboard/quiz?topic=${topicId}`)
  }

  // ── Retry generation after a FAILED pool ───────────────────────────────────────
  const retryGeneration = async () => {
    if (!topicId || isRetrying) return
    setIsRetrying(true)
    try {
      await triggerQuizGeneration(topicId, topicTitle, skill)
      // Move straight into the Generating UI rather than waiting for the next
      // natural poll tick — mirrors the optimistic update used in the Quiz
      // Selector's own "Retry Generate" button.
      setStatus("GENERATING")
      startPoll()
    } finally {
      setIsRetrying(false)
    }
  }

  // ── Decide rendered state ────────────────────────────────────────────────
  const isLocked = !isTopicCompleted
  const isGenerating = isTopicCompleted && (loading || status === "GENERATING")
  const effectiveStatus: QuizStatus | "LOCKED" | "GENERATING_UI" =
    isLocked
      ? "LOCKED"
      : isGenerating
      ? "GENERATING_UI"
      : status ?? "LOCKED"

  // ── Icon & badge for current state ──────────────────────────────────────
  function StateIcon() {
    switch (effectiveStatus) {
      case "LOCKED":
        return <Lock className="w-5 h-5 text-foreground-subtle" />
      case "GENERATING_UI":
        return <Loader2 className="w-5 h-5 text-warning animate-spin" />
      case "VERIFIED":
        return <CheckCircle2 className="w-5 h-5 text-success" />
      case "CHALLENGE_AVAILABLE":
        return <Trophy className="w-5 h-5 text-accent" />
      case "NEEDS_REVISION":
        return <AlertTriangle className="w-5 h-5 text-warning" />
      case "FAILED":
        return <XCircle className="w-5 h-5 text-destructive" />
      default:
        return <Shield className="w-5 h-5 text-accent" />
    }
  }

  function badgeContent(): { label: string; cls: string } {
    switch (effectiveStatus) {
      case "LOCKED":
        return {
          label: "Locked",
          cls: "border-foreground-subtle/20 bg-surface-2 text-foreground-subtle",
        }
      case "GENERATING_UI":
        return {
          label: "Preparing…",
          cls: "border-warning/20 bg-warning-muted text-warning",
        }
      case "VERIFIED":
        return {
          label: "Verified",
          cls: "border-success/20 bg-success-muted text-success",
        }
      case "CHALLENGE_AVAILABLE":
        return {
          label: "Challenge Ready",
          cls: "border-accent/20 bg-accent-subtle text-accent",
        }
      case "NEEDS_REVISION":
        return {
          label: "Needs Revision",
          cls: "border-warning/20 bg-warning-muted text-warning",
        }
      case "FAILED":
        return {
          label: "Generation Failed",
          cls: "border-destructive/20 bg-destructive-muted text-destructive",
        }
      case "READY":
        return {
          label: "Ready",
          cls: "border-accent/20 bg-accent-subtle text-accent",
        }
      default:
        return {
          label: "Not Available",
          cls: "border-foreground-subtle/20 bg-surface-2 text-foreground-subtle",
        }
    }
  }

  const badge = badgeContent()

  // ── Icon color for the left icon container ───────────────────────────────
  function iconContainerStyle() {
    switch (effectiveStatus) {
      case "VERIFIED":
        return {
          background: "oklch(0.60 0.16 155 / 0.13)",
          borderColor: "oklch(0.60 0.16 155 / 0.35)",
        }
      case "CHALLENGE_AVAILABLE":
        return {
          background: "oklch(0.62 0.20 275 / 0.13)",
          borderColor: "oklch(0.62 0.20 275 / 0.35)",
        }
      case "NEEDS_REVISION":
      case "GENERATING_UI":
        return {
          background: "oklch(0.79 0.15 78 / 0.10)",
          borderColor: "oklch(0.79 0.15 78 / 0.30)",
        }
      case "FAILED":
        return {
          background: "oklch(0.58 0.21 25 / 0.10)",
          borderColor: "oklch(0.58 0.21 25 / 0.30)",
        }
      case "READY":
        return {
          background: "oklch(0.62 0.20 275 / 0.10)",
          borderColor: "oklch(0.62 0.20 275 / 0.28)",
        }
      default:
        return undefined
    }
  }

  // ── Description text ─────────────────────────────────────────────────────
  function descriptionText() {
    switch (effectiveStatus) {
      case "LOCKED":
        return (
          <>
            Complete all checklist items for{" "}
            <span className="text-foreground font-medium">{topicTitle}</span> to unlock
            your verification quiz.
          </>
        )
      case "GENERATING_UI":
        return (
          <>
            Your quiz for{" "}
            <span className="text-foreground font-medium">{topicTitle}</span> is being
            prepared. This takes about 30 seconds.
          </>
        )
      case "VERIFIED":
        return (
          <>
            You have verified mastery of{" "}
            <span className="text-foreground font-medium">{topicTitle}</span>. Retake
            anytime to refresh your knowledge.
          </>
        )
      case "CHALLENGE_AVAILABLE":
        return (
          <>
            Outstanding! You scored 90%+ on{" "}
            <span className="text-foreground font-medium">{topicTitle}</span>. Challenge
            Mode is now unlocked — earn bonus XP.
          </>
        )
      case "NEEDS_REVISION":
        return (
          <>
            You scored below 80% on{" "}
            <span className="text-foreground font-medium">{topicTitle}</span>. Review the
            material and retake to verify.
          </>
        )
      case "FAILED":
        return (
          <>
            Something went wrong generating the quiz for{" "}
            <span className="text-foreground font-medium">{topicTitle}</span>. This is
            usually temporary — tap retry to try again.
          </>
        )
      default:
        return (
          <>
            Prove your mastery of{" "}
            <span className="text-foreground font-medium">{topicTitle}</span> with an
            adaptive quiz. Earn XP and unlock the next topic.
          </>
        )
    }
  }

  // ── Action button ─────────────────────────────────────────────────────────
  function ActionButton() {
    if (effectiveStatus === "LOCKED") {
      return (
        <button
          disabled
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-foreground-subtle/15 cursor-not-allowed opacity-50 text-[12px] font-semibold text-foreground-subtle"
          style={{ background: "oklch(0.12 0.01 260)" }}
        >
          <Lock className="w-3.5 h-3.5" />
          Start Quiz
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    }

    if (effectiveStatus === "GENERATING_UI") {
      return (
        <button
          disabled
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-warning/20 cursor-not-allowed opacity-70 text-[12px] font-semibold text-warning"
          style={{ background: "oklch(0.79 0.15 78 / 0.07)" }}
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Preparing…
        </button>
      )
    }

    if (effectiveStatus === "VERIFIED") {
      return (
        <button
          onClick={goToQuiz}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-[12px] font-semibold text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          style={{ background: "oklch(0.12 0.01 260)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retake Quiz
        </button>
      )
    }

    if (effectiveStatus === "CHALLENGE_AVAILABLE") {
      return (
        <div className="flex-shrink-0 flex flex-col gap-1.5 items-end">
          <button
            onClick={goToQuiz}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-accent/30 text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
            style={{ background: "oklch(0.62 0.20 275 / 0.08)" }}
          >
            <Trophy className="w-3.5 h-3.5" />
            Start Challenge
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goToQuiz}
            className="text-[10px] text-foreground-subtle hover:text-foreground-muted transition-colors px-1"
          >
            or Retake Quiz
          </button>
        </div>
      )
    }

    if (effectiveStatus === "NEEDS_REVISION") {
      return (
        <button
          onClick={goToQuiz}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-warning/25 text-[12px] font-semibold text-warning hover:bg-warning/10 transition-colors"
          style={{ background: "oklch(0.79 0.15 78 / 0.07)" }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retake Quiz
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    }

    if (effectiveStatus === "FAILED") {
      return (
        <button
          onClick={retryGeneration}
          disabled={isRetrying}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/25 text-[12px] font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "oklch(0.58 0.21 25 / 0.06)" }}
        >
          {isRetrying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Retry Generation
        </button>
      )
    }

    // READY / default
    return (
      <button
        onClick={goToQuiz}
        className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-accent/30 text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
        style={{ background: "oklch(0.62 0.20 275 / 0.08)" }}
      >
        <Zap className="w-3.5 h-3.5" />
        Start Quiz
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    )
  }

  const iconStyle = iconContainerStyle()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="relative rounded-xl border border-border overflow-hidden"
      style={{ background: "oklch(0.10 0.01 260 / 0.7)" }}
    >
      {/* Subtle diagonal pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 8px,
            oklch(0.15 0.01 260) 8px,
            oklch(0.15 0.01 260) 9px
          )`,
        }}
      />

      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left */}
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-foreground-subtle/20 flex-shrink-0"
              style={iconStyle ?? { background: "oklch(0.15 0.01 260 / 0.8)" }}
            >
              <StateIcon />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[14px] font-semibold text-foreground">
                  Verification Quiz
                </h2>
                <span
                  className={`text-mono text-[9px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    badge.cls
                  }`}
                >
                  {effectiveStatus === "GENERATING_UI" && (
                    <Loader2 className="w-2.5 h-2.5 inline-block animate-spin mr-1" />
                  )}
                  {badge.label}
                </span>
              </div>
              <p className="text-[12px] text-foreground-muted leading-relaxed max-w-sm">
                {descriptionText()}
              </p>

              {/* Feature chips — only shown in Locked or Ready (first-time) */}
              {(effectiveStatus === "LOCKED" || effectiveStatus === "READY") && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    "Adaptive Questions",
                    "XP Rewards",
                    "Skill Verification",
                    "Instant Feedback",
                  ].map((feat) => (
                    <span
                      key={feat}
                      className="text-[9px] font-medium px-2 py-1 rounded-md border border-foreground-subtle/15 text-foreground-subtle"
                      style={{ background: "oklch(0.12 0.01 260)" }}
                    >
                      {feat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — action button */}
          <ActionButton />
        </div>

        {/* Bottom strip */}
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-3">
          {effectiveStatus === "GENERATING_UI" ? (
            <>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <motion.div
                    key={n}
                    className="w-6 h-1.5 rounded-full"
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      delay: n * 0.2,
                    }}
                    style={{ background: "oklch(0.79 0.15 78 / 0.5)" }}
                  />
                ))}
              </div>
              <span className="text-mono text-[9px] text-warning">
                Generating questions…
              </span>
            </>
          ) : effectiveStatus === "LOCKED" || effectiveStatus === "FAILED" ? (
            <>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="w-6 h-1.5 rounded-full"
                    style={{
                      background:
                        effectiveStatus === "FAILED"
                          ? "oklch(0.58 0.21 25 / 0.25)"
                          : "oklch(0.18 0.01 260)",
                    }}
                  />
                ))}
              </div>
              <span className="text-mono text-[9px] text-foreground-subtle">
                {effectiveStatus === "FAILED"
                  ? "Generation incomplete"
                  : "10 questions · ~5 min"}
              </span>
            </>
          ) : (
            <>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <div
                    key={n}
                    className="w-3.5 h-1.5 rounded-full"
                    style={{
                      background:
                        effectiveStatus === "VERIFIED"
                          ? "oklch(0.60 0.16 155 / 0.5)"
                          : effectiveStatus === "CHALLENGE_AVAILABLE"
                          ? "oklch(0.62 0.20 275 / 0.5)"
                          : effectiveStatus === "NEEDS_REVISION"
                          ? "oklch(0.79 0.15 78 / 0.4)"
                          : "oklch(0.62 0.20 275 / 0.35)",
                    }}
                  />
                ))}
              </div>
              <span className="text-mono text-[9px] text-foreground-subtle">
                10 questions · ~5 min
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
