"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Clock, Zap, Brain, ChevronRight } from "lucide-react"
import type { TopicData } from "@/app/topic/[topicId]/page"

interface TopicHeroProps {
  topicData: TopicData
  onReExplain: () => void
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Beginner:     "badge-beginner",
  Intermediate: "badge-intermediate",
  Advanced:     "badge-advanced",
}

function useTypewriter(text: string, speed = 18, startDelay = 400) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed("")
    setDone(false)
    let i = 0
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          clearInterval(interval)
          setDone(true)
        }
      }, speed)
      return () => clearInterval(interval)
    }, startDelay)
    return () => clearTimeout(timeout)
  }, [text, speed, startDelay])

  return { displayed, done }
}

export function TopicHero({ topicData, onReExplain }: TopicHeroProps) {
  const { displayed, done } = useTypewriter(topicData.overview, 16, 600)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-xl border border-border"
      style={{ background: "oklch(0.10 0.01 260 / 0.8)" }}
    >
      {/* Top accent glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      {/* Subtle scan overlay */}
      <div className="absolute inset-0 scanlines opacity-20 pointer-events-none" />

      <div className="relative z-10 p-6 lg:p-8">
        {/* ── Header row ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-mono text-[9px] text-accent uppercase tracking-widest font-semibold">
                Topic Workspace
              </span>
              <span className="text-foreground-subtle text-[9px]">/</span>
              <span className="text-mono text-[9px] text-foreground-subtle uppercase tracking-wider">
                Phase 1
              </span>
            </div>
            <h1 className="text-display text-3xl lg:text-4xl text-foreground tracking-tight">
              {topicData.title}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${DIFFICULTY_STYLES[topicData.difficulty] || "badge-beginner"}`}>
                {topicData.difficulty}
              </span>
              <span className="flex items-center gap-1.5 text-mono text-[10px] text-foreground-subtle">
                <Clock className="w-3 h-3" />
                Est. {topicData.estimated_time}
              </span>
              <span className="flex items-center gap-1.5 text-mono text-[10px] text-foreground-subtle">
                <Zap className="w-3 h-3 text-accent" />
                +100 XP on mastery
              </span>
            </div>
          </div>

          {/* AI Avatar */}
          <div className="flex-shrink-0 relative">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-accent/30"
              style={{
                background: "oklch(0.62 0.20 275 / 0.12)",
                boxShadow: "0 0 20px oklch(0.62 0.20 275 / 0.15)",
              }}
            >
              <Brain className="w-5 h-5 text-accent" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-background" />
          </div>
        </div>

        {/* ── AI Explanation ── */}
        <div
          className="rounded-lg p-4 mb-6 border border-accent/10"
          style={{ background: "oklch(0.08 0.01 260 / 0.6)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-mono text-[9px] text-accent uppercase tracking-widest">
              AI Mentor
            </span>
          </div>
          <p className="text-[13px] text-foreground leading-relaxed">
            {displayed}
            {!done && (
              <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
            )}
          </p>
        </div>

        {/* ── Why This Matters ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ChevronRight className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
              Why This Matters
            </span>
          </div>
          <ul className="space-y-2">
            {topicData.why_it_matters.map((point, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + i * 0.08, duration: 0.3 }}
                className="flex items-start gap-2.5 text-[12px] text-foreground-muted"
              >
                <span
                  className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
                  style={{ background: "oklch(0.62 0.20 275 / 0.7)" }}
                />
                {point}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  )
}
