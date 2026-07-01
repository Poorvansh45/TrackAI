"use client"

import { motion } from "framer-motion"
import { Brain, ArrowRight, BookOpen, Zap } from "lucide-react"
import Link from "next/link"
import { useActiveTopic } from "@/hooks/use-active-topic"
import { useRoadmapProgress } from "@/lib/roadmap-state"

export function AIMentorCard() {
  const { activeTopic } = useActiveTopic()
  const { data } = useRoadmapProgress()

  // Derive context from real data
  const completedCount = data
    ? data.phases.flatMap((p) => p.topics).filter((t) => t.status === "completed").length
    : 0
  const totalCount = data
    ? data.phases.flatMap((p) => p.topics).length
    : 0
  const remaining = activeTopic
    ? activeTopic.totalSections - activeTopic.completedSections
    : 0

  // Contextual mentor message
  let mentorTitle = "Mentor Recommendation"
  let mentorMessage = ""

  if (activeTopic) {
    if (activeTopic.completedSections === 0) {
      mentorTitle = "Ready to begin"
      mentorMessage = `Start "${activeTopic.title}" — it's the next step in your ${activeTopic.phaseTitle} phase. Consistent daily sessions build lasting knowledge.`
    } else if (remaining > 0) {
      mentorTitle = "Keep going"
      mentorMessage = `You're making solid progress on "${activeTopic.title}". ${remaining} concept${remaining > 1 ? "s" : ""} left. Completing this unlocks the next topic and earns you XP.`
    } else {
      mentorTitle = "Topic ready to complete"
      mentorMessage = `All concepts in "${activeTopic.title}" are done. Mark it complete to unlock the next topic and trigger your verification quiz.`
    }
  } else if (completedCount === totalCount && totalCount > 0) {
    mentorTitle = "Track complete!"
    mentorMessage = `You've mastered all ${totalCount} topics. Review past concepts, attempt challenge quizzes, or explore your analytics to reinforce your learning.`
  } else {
    mentorTitle = "Getting started"
    mentorMessage = "Complete your onboarding to generate a personalized learning track and get contextual guidance here."
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="surface-card p-5"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">AI Mentor</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">
              {activeTopic ? activeTopic.phaseTitle : "Personalized guidance"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-mono text-[9px] text-foreground-subtle">Active</span>
        </div>
      </div>

      {/* ── Context chips ── */}
      {activeTopic && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-mono text-[9px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent">
            Phase {activeTopic.phaseNumber}
          </span>
          <span className="text-mono text-[9px] px-2 py-0.5 rounded-full bg-surface-2 border border-border/40 text-foreground-subtle">
            {activeTopic.completedSections}/{activeTopic.totalSections} concepts
          </span>
          {completedCount > 0 && (
            <span className="text-mono text-[9px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-border/40 text-foreground-subtle">
              <Zap className="w-2.5 h-2.5 text-accent" />
              {completedCount} topics mastered
            </span>
          )}
        </div>
      )}

      {/* ── Mentor message ── */}
      <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border/40 mb-4 text-[12px] text-foreground-muted leading-relaxed">
        <span className="font-semibold text-foreground block mb-1">{mentorTitle}</span>
        {mentorMessage}
      </div>

      {/* ── Current topic pill ── */}
      {activeTopic && (
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-md bg-surface-2/40 border border-border/30">
          <BookOpen className="w-3 h-3 text-accent flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-mono text-[9px] text-foreground-subtle block">Current Topic</span>
            <span className="text-[12px] font-medium text-foreground truncate block">{activeTopic.title}</span>
          </div>
          <span className="text-mono text-[9px] text-accent font-semibold flex-shrink-0">
            {activeTopic.progress}%
          </span>
        </div>
      )}

      {/* ── Action button ── */}
      <Link href="/dashboard/roadmap" className="block">
        <button className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5">
          <Brain className="w-3.5 h-3.5" />
          View Full Roadmap
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  )
}
