"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Play, CheckCircle2, Zap, BookOpen, ClipboardCheck, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useActiveTopic } from "@/hooks/use-active-topic"
import { useAvailableQuizzes } from "@/hooks/use-quiz"

export function ContinueLearning() {
  const router = useRouter()
  const { activeTopic } = useActiveTopic()
  const { quizzes } = useAvailableQuizzes()

  const topic = activeTopic ?? {
    title: "Loading...",
    slug: "",
    phaseNumber: 1,
    phaseTitle: "Loading Track...",
    skill: "",
    totalSections: 5,
    completedSections: 0,
    progress: 0,
  }

  // Derive estimated remaining time (~9 min per concept, rounded to nearest 5)
  const remaining = topic.totalSections - topic.completedSections
  const rawMinutes = remaining * 9
  const estMinutes = Math.max(5, Math.round(rawMinutes / 5) * 5)
  const estLabel = estMinutes >= 60
    ? `~${Math.floor(estMinutes / 60)}h ${estMinutes % 60 > 0 ? `${estMinutes % 60}m` : ""}`.trim()
    : `~${estMinutes} min`

  // XP reward approximation (mirrors backend xp_for_order)
  const xpReward = topic.completedSections <= 4 ? 100 : topic.completedSections <= 12 ? 180 : 280

  // Quiz status for this topic
  const topicQuiz = quizzes.find(
    (q) => q.topic_id === topic.slug &&
      ["READY", "GENERATING", "NEEDS_REVISION", "CHALLENGE_AVAILABLE", "VERIFIED"].includes(q.quiz_status)
  )
  const quizReady = topicQuiz?.quiz_status === "READY" || topicQuiz?.quiz_status === "CHALLENGE_AVAILABLE"
  const quizVerified = topicQuiz?.quiz_status === "VERIFIED"

  const moduleLabel = topic.skill
    ? `${topic.skill} · Phase ${topic.phaseNumber}`
    : `Phase ${topic.phaseNumber}`

  const handleContinue = () => {
    if (topic.slug) router.push(`/topic/${topic.slug}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="surface-card p-5 relative overflow-hidden"
    >
      {/* Subtle glow behind active topic */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          background:
            "radial-gradient(ellipse at 0% 50%, oklch(0.62 0.20 275 / 0.07), transparent 65%)",
        }}
      />

      <div className="relative z-10">
        {/* ── Header: Phase breadcrumb + topic title ── */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            {/* Phase breadcrumb pill */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-mono text-[9px] text-accent uppercase tracking-wider font-semibold bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                <BookOpen className="w-2.5 h-2.5" />
                {moduleLabel}
              </span>
            </div>
            <h3 className="text-[14px] font-semibold text-foreground leading-snug">
              {topic.title}
            </h3>
          </div>

          {/* Quiz status pill — top right */}
          <div className="flex-shrink-0 self-start">
            {quizVerified ? (
              <span className="inline-flex items-center gap-1 text-mono text-[8px] font-semibold px-2 py-0.5 rounded-full bg-success/10 border border-success/25 text-success">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Quiz Verified
              </span>
            ) : quizReady ? (
              <span className="inline-flex items-center gap-1 text-mono text-[8px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent">
                <ClipboardCheck className="w-2.5 h-2.5" />
                Quiz Ready
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-mono text-[8px] font-semibold px-2 py-0.5 rounded-full bg-surface-2 border border-border/40 text-foreground-subtle">
                <Lock className="w-2.5 h-2.5" />
                Quiz Locked
              </span>
            )}
          </div>
        </div>

        {/* ── Meta row: concepts · time · XP ── */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-mono text-[10px] text-foreground-subtle bg-surface-2 border border-border/40 px-2 py-0.5 rounded">
            {topic.completedSections} / {topic.totalSections} Concepts
          </span>
          <span className="text-mono text-[10px] text-foreground-subtle">
            {estLabel} remaining
          </span>
          <span className="inline-flex items-center gap-1 text-mono text-[10px] text-accent font-semibold">
            <Zap className="w-3 h-3" />
            +{xpReward} XP on completion
          </span>
        </div>

        {/* ── Progress bar ── */}
        <div className="mb-4">
          <div className="flex justify-between text-mono text-[10px] mb-1.5">
            <span className="text-foreground-subtle">
              {topic.completedSections}/{topic.totalSections} concepts verified
            </span>
            <span className="text-accent font-semibold">{topic.progress}%</span>
          </div>
          <div className="h-1 w-full bg-surface-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${topic.progress}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* ── Footer: CTA + sync status ── */}
        <div className="flex items-center justify-between gap-4 pt-0.5">
          <Button
            onClick={handleContinue}
            className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-5 text-[12px] font-semibold transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Resume Learning
          </Button>

          <div className="flex items-center gap-1.5 text-mono text-[10px] text-foreground-subtle">
            {topic.nextTitle && (
              <span className="hidden sm:flex items-center gap-1">
                <span className="text-foreground-subtle">Up next:</span>
                <span className="text-foreground">{topic.nextTitle}</span>
              </span>
            )}
            <div className="hidden sm:flex items-center gap-1 ml-2">
              <CheckCircle2 className="w-3 h-3 text-success" />
              <span>Synced</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
