"use client"

import { motion } from "framer-motion"
import { Brain, Lightbulb, AlertTriangle, RefreshCw, Target, Sparkles, ArrowRight, BookOpen } from "lucide-react"
import type { PhaseData } from "./learning-graph"

interface AIAssistantPanelProps {
  phases: PhaseData[]
  skill: string
}

export function AIAssistantPanel({ phases, skill }: AIAssistantPanelProps) {
  // Derive contextual data from actual roadmap
  const allNodes     = phases.flatMap(p => p.nodes)
  const activeNode   = allNodes.find(n => n.status === "active")
  const lockedNodes  = allNodes.filter(n => n.status === "locked")
  const completedCnt = allNodes.filter(n => n.status === "completed").length

  // Next 3 locked topics as "upcoming"
  const nextTopics   = lockedNodes.slice(0, 3).map(n => n.name)

  // Weak concepts — derive from lower-xp completed nodes (simulate weaknesses)
  const weakConcepts = allNodes
    .filter(n => n.status === "completed" && n.xp <= 130)
    .slice(0, 3)
    .map(n => ({ name: n.name, accuracy: Math.floor(Math.random() * 25) + 55 }))

  // Upcoming quiz topic
  const quizTopic = activeNode?.name || nextTopics[0] || "Foundations"

  // AI mentor insight — contextual message
  const insight = activeNode
    ? `You're making solid progress on "${activeNode.name}". Based on your pace, completing this topic will unlock ${nextTopics.length} new concepts. Focus on practical exercises today.`
    : completedCnt > 0
    ? `You've completed ${completedCnt} topics. Keep the momentum going — consistent daily sessions outperform long irregular ones.`
    : `Welcome to your learning journey! Start with the first topic to build a strong foundation.`

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      className="glass-panel p-5 flex flex-col gap-4 h-fit lg:sticky lg:top-20"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-md bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-accent" />
          </div>
          <div>
            <p className="text-mono text-[9px] text-foreground-subtle uppercase tracking-widest">AI Assistant</p>
            <p className="text-[12px] font-semibold text-foreground">Learning Mentor</p>
          </div>
          <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 border border-success/25">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-mono text-[8px] text-success">ACTIVE</span>
          </div>
        </div>
        <div className="phase-glow-line" />
      </div>

      {/* Current Recommendation */}
      {activeNode && (
        <div className="ai-item p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="w-3 h-3 text-warning" />
            <p className="text-mono text-[9px] text-foreground-subtle uppercase">Current Focus</p>
          </div>
          <p className="text-[12px] font-semibold text-foreground mb-1 truncate">{activeNode.name}</p>
          <div className="flex items-center gap-2">
            <span className="text-mono text-[9px] text-foreground-subtle">{activeNode.duration}</span>
            <span className="text-mono text-[9px] text-accent">+{activeNode.xp} XP on completion</span>
          </div>
        </div>
      )}

      {/* Next Best Action */}
      {nextTopics.length > 0 && (
        <div className="ai-item p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3 h-3 text-accent" />
            <p className="text-mono text-[9px] text-foreground-subtle uppercase">Next Best Action</p>
          </div>
          <div className="space-y-1.5">
            {nextTopics.map((topic, i) => (
              <div key={i} className="flex items-center gap-2 group/next cursor-pointer">
                <div className="w-4 h-4 rounded flex items-center justify-center bg-accent/10 text-mono text-[8px] text-accent font-bold flex-shrink-0">{i + 1}</div>
                <p className="text-[11px] text-foreground-muted group-hover/next:text-foreground transition-colors truncate">{topic}</p>
                <ArrowRight className="w-3 h-3 text-foreground-subtle/40 group-hover/next:text-accent transition-colors ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weak Concepts */}
      {weakConcepts.length > 0 && (
        <div className="ai-item p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            <p className="text-mono text-[9px] text-foreground-subtle uppercase">Needs Revision</p>
          </div>
          <div className="space-y-2">
            {weakConcepts.map(({ name, accuracy }) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] text-foreground-muted truncate max-w-[140px]">{name}</p>
                  <span className="text-mono text-[9px] text-warning ml-1">{accuracy}%</span>
                </div>
                <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${accuracy}%`, background: "oklch(0.70 0.15 75 / 0.8)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Revision */}
      <div className="ai-item p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <RefreshCw className="w-3 h-3 text-accent" />
          <p className="text-mono text-[9px] text-foreground-subtle uppercase">Revision Queue</p>
        </div>
        <div className="space-y-1.5">
          {(weakConcepts.length > 0 ? weakConcepts.map(w => w.name) : nextTopics.slice(0, 2)).map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent/50 flex-shrink-0" />
              <p className="text-[11px] text-foreground-muted truncate">{t}</p>
            </div>
          ))}
          {weakConcepts.length === 0 && nextTopics.length === 0 && (
            <p className="text-[11px] text-foreground-subtle italic">No revision needed yet</p>
          )}
        </div>
      </div>

      {/* Upcoming Quiz */}
      <div className="ai-item p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BookOpen className="w-3 h-3 text-success" />
          <p className="text-mono text-[9px] text-foreground-subtle uppercase">Upcoming Quiz</p>
        </div>
        <p className="text-[12px] font-semibold text-foreground truncate mb-1">{quizTopic}</p>
        <div className="flex items-center gap-2">
          <span className="text-mono text-[9px] text-foreground-subtle">~10 questions</span>
          <span className="text-mono text-[9px] text-success">+250 XP</span>
        </div>
      </div>

      {/* AI Mentor Insight */}
      <div className="rounded-xl p-3" style={{ background: "oklch(0.62 0.20 275 / 0.08)", border: "1px solid oklch(0.62 0.20 275 / 0.2)" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-3 h-3 text-accent" />
          <p className="text-mono text-[9px] text-accent uppercase font-semibold">AI Mentor Insight</p>
        </div>
        <p className="text-[11px] text-foreground-muted leading-relaxed">{insight}</p>
      </div>
    </motion.div>
  )
}
