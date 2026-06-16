"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  X,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  Loader2,
  Trophy,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { PageWrapper } from "@/components/dashboard/page-wrapper"
import { useAvailableQuizzes } from "@/hooks/use-quiz"
import { useToast } from "@/hooks/use-toast"
import {
  startQuiz,
  startChallenge,
  submitQuiz,
  triggerQuizGeneration,
  type QuizQuestion,
  type SubmitResponse,
  type AvailableQuiz,
} from "@/lib/quiz-api"

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusLabel(status: AvailableQuiz["quiz_status"]): string {
  const map: Record<string, string> = {
    READY: "Ready",
    GENERATING: "Generating…",
    IN_PROGRESS: "In Progress",
    VERIFIED: "Verified",
    NEEDS_REVISION: "Needs Revision",
    CHALLENGE_AVAILABLE: "Challenge Ready",
    FAILED: "Failed",
    NOT_AVAILABLE: "Not Available",
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

// ─── Main Content Component (with search params) ─────────────────────────────

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { quizzes, loading, refetch } = useAvailableQuizzes()

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null)
  const [activeQuizName, setActiveQuizName] = useState("")
  const [isChallengeAttempt, setIsChallengeAttempt] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [attemptId, setAttemptId] = useState<string | null>(null)

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const [isStartingId, setIsStartingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<SubmitResponse | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)

  const hasAutoStartedRef = useRef(false)

  // ── Auto-start via search param ────────────────────────────────────────────
  useEffect(() => {
    if (loading || quizzes.length === 0 || hasAutoStartedRef.current) return

    const topicParam = searchParams.get("topic")
    if (topicParam) {
      const match = quizzes.find((q) => q.topic_id === topicParam)
      if (match) {
        hasAutoStartedRef.current = true
        if (match.quiz_status === "CHALLENGE_AVAILABLE") {
          handleStartChallenge(match.topic_id)
        } else if (
          match.quiz_status !== "GENERATING" &&
          match.quiz_status !== "FAILED"
        ) {
          handleStartQuiz(match.topic_id)
        }
      }
    }
  }, [loading, quizzes, searchParams])

  // ── Start Handlers ─────────────────────────────────────────────────────────

  const handleStartQuiz = async (topicId: string) => {
    setIsStartingId(topicId)
    try {
      const res = await startQuiz(topicId)
      if (res) {
        setQuestions(res.questions)
        setAttemptId(res.attempt_id)
        setActiveQuizId(topicId)
        setActiveQuizName(res.topic_name)
        setIsChallengeAttempt(false)
        setCurrentQuestionIndex(0)
        setSelectedKey(null)
        setAnswers({})
        setSubmitResult(null)
        setIsReviewing(false)
      } else {
        toast({
          title: "Failed to start quiz",
          description: "Could not fetch questions. Please try again.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: "Error starting quiz",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsStartingId(null)
    }
  }

  const handleStartChallenge = async (topicId: string) => {
    setIsStartingId(topicId)
    try {
      const res = await startChallenge(topicId)
      if (res) {
        setQuestions(res.questions)
        setAttemptId(res.attempt_id)
        setActiveQuizId(topicId)
        setActiveQuizName(res.topic_name)
        setIsChallengeAttempt(true)
        setCurrentQuestionIndex(0)
        setSelectedKey(null)
        setAnswers({})
        setSubmitResult(null)
        setIsReviewing(false)
      } else {
        toast({
          title: "Failed to start challenge",
          description: "Could not fetch challenge questions. Please try again.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: "Error starting challenge",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsStartingId(null)
    }
  }

  // ── Navigation & Submission ────────────────────────────────────────────────

  const handleNextQuestion = () => {
    if (!selectedKey) return

    const currentQ = questions[currentQuestionIndex]
    const updatedAnswers = {
      ...answers,
      [currentQ.id]: selectedKey,
    }
    setAnswers(updatedAnswers)

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      const nextQ = questions[currentQuestionIndex + 1]
      setSelectedKey(updatedAnswers[nextQ.id] || null)
    } else {
      // Last question completed - submit
      handleSubmitQuiz(updatedAnswers)
    }
  }

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      const prevQ = questions[currentQuestionIndex - 1]
      setSelectedKey(answers[prevQ.id] || null)
    }
  }

  const handleSubmitQuiz = async (finalAnswers: Record<string, string>) => {
    if (!attemptId || !activeQuizId) return
    setIsSubmitting(true)
    try {
      const answersPayload = Object.entries(finalAnswers).map(([qid, skey]) => ({
        question_id: qid,
        selected_key: skey,
      }))
      const res = await submitQuiz(
        attemptId,
        activeQuizId,
        answersPayload,
        isChallengeAttempt
      )
      if (res) {
        setSubmitResult(res)
        setIsReviewing(true)
        await refetch() // refresh lists/badges
      } else {
        toast({
          title: "Submission failed",
          description: "Could not grade your quiz. Please try again.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error(err)
      toast({
        title: "Submission error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── VIEW: In-Progress Quiz ─────────────────────────────────────────────────
  if (activeQuizId && questions.length > 0) {
    if (isSubmitting) {
      return (
        <PageWrapper maxWidth="sm">
          <div className="surface-card p-12 text-center space-y-6">
            <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto" />
            <div className="space-y-1.5">
              <h2 className="text-display text-xl text-foreground">
                Grading attempt
              </h2>
              <p className="text-[11px] text-foreground-muted leading-relaxed">
                Analyzing your responses and calculating skill accuracy...
              </p>
            </div>
          </div>
        </PageWrapper>
      )
    }

    if (isReviewing && submitResult) {
      const isPerfect = submitResult.score === 100
      const isChallengeUnlocked =
        submitResult.challenge_unlocked && !isChallengeAttempt

      return (
        <PageWrapper maxWidth="md">
          {/* Header */}
          <div className="border-b border-border/40 pb-5 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
                Attempt <span className="text-accent">Results</span>
              </h1>
              <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider uppercase truncate max-w-[200px] sm:max-w-md">
                TOPIC: {activeQuizName}
              </p>
            </div>
            <span
              className={`text-mono text-[9px] px-2.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                submitResult.passed
                  ? "bg-success-muted text-success border border-success/20"
                  : "bg-warning-muted text-warning border border-warning/20"
              }`}
            >
              {submitResult.quiz_status === "CHALLENGE_AVAILABLE"
                ? "CHALLENGE UNLOCKED"
                : submitResult.quiz_status}
            </span>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Score & XP display */}
            <div className="surface-card p-6 text-center space-y-5 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none rounded-[inherit]"
                style={{
                  background: submitResult.passed
                    ? "radial-gradient(ellipse at 50% 50%, oklch(0.72 0.16 142 / 0.05), transparent 70%)"
                    : "radial-gradient(ellipse at 50% 50%, oklch(0.79 0.15 78 / 0.05), transparent 70%)",
                }}
              />

              <div className="relative z-10 space-y-4">
                <div className="mx-auto flex flex-col items-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 border ${
                      submitResult.passed
                        ? "bg-success/10 text-success border-success/20 animate-pulse"
                        : "bg-warning/10 text-warning border-warning/20"
                    }`}
                  >
                    {submitResult.passed ? (
                      <Check className="w-7 h-7" />
                    ) : (
                      <AlertTriangle className="w-7 h-7" />
                    )}
                  </div>
                  <span className="text-mono text-[10px] text-foreground-subtle uppercase tracking-wider font-semibold">
                    {isChallengeAttempt
                      ? "Challenge Attempt Accuracy"
                      : "Verification Accuracy"}
                  </span>
                  <h2 className="text-display text-4xl font-bold text-foreground mt-1 animate-pulse">
                    {submitResult.score}%
                  </h2>
                  <p className="text-[11px] text-foreground-muted mt-1 font-medium">
                    {submitResult.correct_count} of{" "}
                    {submitResult.total_questions} questions correct
                  </p>
                </div>

                {submitResult.xp_earned > 0 && (
                  <div className="bg-accent/15 border border-accent/20 rounded-md py-1.5 px-4 inline-flex items-center gap-1.5 mx-auto">
                    <Zap className="w-4 h-4 text-accent fill-current" />
                    <span className="text-mono text-[10px] font-bold text-accent tracking-wide">
                      +{submitResult.xp_earned} XP EARNED
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations / Next Steps Box */}
            {!submitResult.passed && (
              <div className="border border-warning/30 bg-warning-muted/10 rounded-lg p-4 space-y-2 max-w-2xl mx-auto">
                <div className="flex gap-2 text-warning mb-1">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mono">
                    Revisions Recommended
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  You scored{" "}
                  <span className="text-foreground font-semibold">
                    {submitResult.score}%
                  </span>
                  . A score of{" "}
                  <span className="text-foreground font-semibold">
                    80% or higher
                  </span>{" "}
                  is required to verify this topic. We recommend reviewing the
                  concepts inside this topic on your roadmap and trying again.
                </p>
              </div>
            )}

            {isChallengeUnlocked && (
              <div className="border border-accent/30 bg-accent-subtle/10 rounded-lg p-4 space-y-3 max-w-2xl mx-auto">
                <div className="flex gap-2 text-accent mb-0.5">
                  <Trophy className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mono">
                    Challenge Mode Unlocked!
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  Stunning performance! By scoring 90% or higher, you've
                  unlocked Challenge Mode. Test your limits with harder
                  questions to earn additional bonus XP.
                </p>
                <button
                  onClick={() => handleStartChallenge(activeQuizId)}
                  className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Start Challenge Mode
                </button>
              </div>
            )}

            {isChallengeAttempt && submitResult.passed && (
              <div className="border border-success/30 bg-success-muted/10 rounded-lg p-4 space-y-2 max-w-2xl mx-auto">
                <div className="flex gap-2 text-success mb-1">
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-mono">
                    Challenge Mastered!
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  Congratulations! You've passed the Challenge Mode and verified
                  absolute mastery of{" "}
                  <span className="text-foreground font-semibold">
                    {activeQuizName}
                  </span>
                  .
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
              <button
                onClick={() => handleStartQuiz(activeQuizId)}
                className="w-full bg-surface-2 hover:bg-surface-3 border border-border text-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake Quiz
              </button>
              <button
                onClick={() => {
                  setActiveQuizId(null)
                  setQuestions([])
                  setAttemptId(null)
                  setSubmitResult(null)
                  setIsReviewing(false)
                }}
                className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                All Quizzes
              </button>
            </div>

            {/* Detailed Question Review */}
            <div className="space-y-4 text-left max-w-2xl mx-auto pt-6 border-t border-border/40">
              <div className="flex items-center justify-between">
                <h3 className="text-mono text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Detailed Answer Review
                </h3>
                <span className="text-mono text-[9px] text-foreground-subtle">
                  Correct answers are highlighted green
                </span>
              </div>
              <div className="space-y-3">
                {submitResult.results.map((result, idx) => {
                  const q = questions.find(
                    (quest) => quest.id === result.question_id
                  )
                  if (!q) return null

                  return (
                    <div
                      key={result.question_id}
                      className="surface-card p-4 border border-border/50 bg-surface-1/40 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-mono text-[10px] text-foreground-subtle font-semibold flex-shrink-0 mt-0.5">
                          Q{idx + 1}
                        </span>
                        <p className="text-[12px] font-medium text-foreground leading-relaxed flex-1">
                          {result.question}
                        </p>
                        <span
                          className={`text-mono text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
                            result.is_correct
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-destructive/10 text-destructive border-destructive/20"
                          }`}
                        >
                          {result.is_correct ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          {result.is_correct ? "Correct" : "Incorrect"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 pl-4">
                        {q.options.map((opt) => {
                          const isUserChoice = result.selected_key === opt.key
                          const isCorrectChoice = result.correct_key === opt.key

                          let optStyle =
                            "bg-surface-2/40 border-border/40 text-foreground-muted"
                          if (isCorrectChoice) {
                            optStyle = "bg-success/15 border-success text-success"
                          } else if (isUserChoice && !result.is_correct) {
                            optStyle =
                              "bg-destructive/15 border-destructive text-destructive"
                          }

                          return (
                            <div
                              key={opt.key}
                              className={`flex items-center gap-2.5 p-2 rounded-md border text-[11px] font-medium ${optStyle}`}
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center text-mono text-[9px] border font-bold ${
                                  isCorrectChoice
                                    ? "bg-success text-success-foreground border-success"
                                    : isUserChoice && !result.is_correct
                                    ? "bg-destructive text-destructive-foreground border-destructive"
                                    : "bg-surface-3 border-border text-foreground-subtle"
                                }`}
                              >
                                {opt.key}
                              </div>
                              <span>{opt.text}</span>
                            </div>
                          )
                        })}
                      </div>

                      {result.explanation && (
                        <div className="pl-4 pt-2 border-t border-border/20">
                          <div className="flex items-start gap-1.5 text-accent">
                            <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="text-mono text-[9px] font-bold uppercase tracking-wider">
                                Explanation
                              </span>
                              <p className="text-[11px] text-foreground-muted leading-relaxed">
                                {result.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </PageWrapper>
      )
    }

    const currentQ = questions[currentQuestionIndex]
    return (
      <PageWrapper maxWidth="sm">
        {/* Progress header */}
        <div className="border-b border-border/40 pb-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal truncate max-w-[200px] sm:max-w-md">
              {isChallengeAttempt ? "Challenge" : "Skill"}{" "}
              <span className="text-accent">Verification</span>
            </h1>
            <p className="text-mono text-[9px] sm:text-[10px] text-foreground-subtle mt-1 tracking-wider uppercase truncate max-w-[200px] sm:max-w-md">
              TOPIC: {activeQuizName}
            </p>
          </div>
          <span
            className={`text-mono text-[9px] px-2.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
              isChallengeAttempt
                ? "bg-accent text-accent-foreground"
                : "bg-accent-subtle text-accent border border-accent/25"
            }`}
          >
            {isChallengeAttempt ? "CHALLENGE" : "ACTIVE"}
          </span>
        </div>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div>
            <div className="flex justify-between text-mono text-[9px] text-foreground-subtle mb-1.5">
              <span>
                QUESTION {currentQuestionIndex + 1} OF {questions.length}
              </span>
              <span>
                PROGRESS:{" "}
                {Math.round(
                  ((currentQuestionIndex + 1) / questions.length) * 100
                )}
                %
              </span>
            </div>
            <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-border/20">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{
                  width: `${
                    ((currentQuestionIndex + 1) / questions.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Question Box */}
          <div className="surface-card p-6 relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none rounded-[inherit]"
              style={{
                background:
                  "radial-gradient(ellipse at 0% 0%, oklch(0.62 0.20 275 / 0.04), transparent 60%)",
              }}
            />
            <div className="relative z-10">
              <span className="text-mono text-[9px] text-accent uppercase tracking-wider font-semibold">
                {isChallengeAttempt
                  ? "CHALLENGE LEVEL QUESTION"
                  : "VERIFICATION CHECKPOINT"}
              </span>
              <h2 className="text-[14px] font-semibold text-foreground mt-2 leading-relaxed">
                {currentQ.question}
              </h2>
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-2.5">
            {currentQ.options.map((opt) => {
              const isSelected = selectedKey === opt.key
              let cardStyle =
                "bg-surface-1/40 border-border/60 hover:bg-surface-1 hover:border-border"
              if (isSelected) {
                cardStyle = "bg-surface-2 border-accent"
              }
              return (
                <button
                  key={opt.key}
                  onClick={() => setSelectedKey(opt.key)}
                  className={`w-full flex items-center gap-3.5 p-4 rounded-lg border text-left transition-all ${cardStyle}`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-mono text-[10px] font-semibold border ${
                      isSelected
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-surface-2 border-border text-foreground-subtle"
                    }`}
                  >
                    {opt.key}
                  </div>
                  <span className="text-[12px] font-medium leading-relaxed">
                    {opt.text}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-4 pt-2">
            {currentQuestionIndex > 0 ? (
              <button
                onClick={handlePrevQuestion}
                className="text-[12px] font-semibold text-foreground-muted hover:text-foreground transition-colors flex items-center gap-1.5 h-10 px-4 rounded-md border border-border bg-surface-1 hover:bg-surface-2"
              >
                Back
              </button>
            ) : (
              <button
                onClick={() => {
                  setActiveQuizId(null)
                  setQuestions([])
                  setAttemptId(null)
                }}
                className="text-[12px] font-semibold text-foreground-muted hover:text-foreground transition-colors flex items-center gap-1.5 h-10 px-4 rounded-md border border-border bg-surface-1 hover:bg-surface-2"
              >
                Exit
              </button>
            )}

            <button
              onClick={handleNextQuestion}
              disabled={!selectedKey}
              className="bg-accent hover:bg-accent-hover text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-md h-10 px-6 text-[12px] font-semibold transition-colors flex items-center gap-1.5 ml-auto"
            >
              {currentQuestionIndex < questions.length - 1
                ? "Next Question"
                : "Finish Checkpoint"}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </PageWrapper>
    )
  }

  // ── VIEW: Quiz Selector (Default List) ─────────────────────────────────────
  return (
    <PageWrapper maxWidth="md">
      {/* Header */}
      <div className="border-b border-border/40 pb-5">
        <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
          Skill <span className="text-accent">Verification</span>
        </h1>
        <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider uppercase">
          Select a topic to test your understanding and earn XP
        </p>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="surface-card p-5 h-20 bg-surface-2 animate-skeleton rounded-lg"
              />
            ))}
          </motion.div>
        ) : quizzes.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="surface-card p-8 text-center space-y-4"
          >
            <div className="w-12 h-12 rounded-md bg-accent/15 flex items-center justify-center mx-auto text-accent">
              <Target className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[14px] font-semibold text-foreground">
                No quizzes available
              </h3>
              <p className="text-[11px] text-foreground-muted max-w-xs mx-auto leading-relaxed">
                Complete topics in your learning roadmap to automatically unlock
                verification quizzes.
              </p>
            </div>
            <Link href="/dashboard" className="inline-block">
              <button className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center gap-1.5 mx-auto">
                Go to Dashboard
              </button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {quizzes.map((quiz) => {
              const isStarting = isStartingId === quiz.topic_id

              return (
                <div
                  key={quiz.topic_id}
                  className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-border/80"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[13px] font-semibold text-foreground">
                        {quiz.topic_name}
                      </h3>
                      <span
                        className={`text-mono text-[8px] px-1.5 py-0.5 rounded font-semibold uppercase flex items-center gap-1 ${statusBadgeClass(
                          quiz.quiz_status
                        )}`}
                      >
                        <StatusIcon status={quiz.quiz_status} />
                        {statusLabel(quiz.quiz_status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-mono text-[10px] text-foreground-subtle flex-wrap">
                      <span className="flex items-center gap-1 text-accent font-semibold">
                        <Zap className="w-3 h-3" />
                        {quiz.xp_reward} XP
                      </span>
                      <span>Attempt count: {quiz.attempt_count}</span>
                      {quiz.user_score !== null && (
                        <span>Best Score: {quiz.user_score.toFixed(0)}%</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {quiz.quiz_status === "GENERATING" ? (
                      <button
                        disabled
                        className="bg-surface-2 text-foreground-subtle border border-border rounded-md h-9 px-4 text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-not-allowed opacity-60 w-32"
                      >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating…
                      </button>
                    ) : quiz.quiz_status === "FAILED" ? (
                      <button
                        onClick={() => {
                          triggerQuizGeneration(quiz.topic_id, quiz.topic_name)
                          toast({
                            title: "Quiz generation queued",
                            description:
                              "Retrying background generation for " +
                              quiz.topic_name,
                          })
                          refetch()
                        }}
                        className="bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 w-32"
                      >
                        Retry Generate
                      </button>
                    ) : quiz.quiz_status === "CHALLENGE_AVAILABLE" ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartQuiz(quiz.topic_id)}
                          disabled={isStarting}
                          className="bg-surface-2 hover:bg-surface-3 border border-border text-foreground rounded-md h-9 px-3 text-[12px] font-medium transition-colors flex items-center justify-center gap-1"
                        >
                          Retake Quiz
                        </button>
                        <button
                          onClick={() => handleStartChallenge(quiz.topic_id)}
                          disabled={isStarting}
                          className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 w-36"
                        >
                          {isStarting && isStartingId === quiz.topic_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trophy className="w-3.5 h-3.5" />
                          )}
                          Challenge Mode
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartQuiz(quiz.topic_id)}
                        disabled={isStarting}
                        className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5 w-32"
                      >
                        {isStarting && isStartingId === quiz.topic_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : quiz.attempt_count > 0 ? (
                          "Retake Quiz"
                        ) : (
                          "Start Quiz"
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <PageWrapper maxWidth="md">
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        </PageWrapper>
      }
    >
      <QuizContent />
    </Suspense>
  )
}
