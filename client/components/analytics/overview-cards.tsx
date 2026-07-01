"use client"

import { motion, Variants } from "framer-motion"
import { CheckCircle2, Target, Zap, Clock, BookOpen } from "lucide-react"
import { BackendRoadmapState } from "@/lib/roadmap-state"

interface OverviewCardsProps {
  data: BackendRoadmapState
}

export function OverviewCards({ data }: OverviewCardsProps) {
  const flat = data.phases.flatMap(p => p.topics)
  const completed = flat.filter(t => t.status === "completed")
  
  const verifiedCount = completed.length
  const totalTopics = flat.length
  const remaining = totalTopics - verifiedCount
  const totalXP = completed.reduce((sum, t) => sum + (t.xp_earned || 0), 0)
  const completionPct = totalTopics > 0 ? Math.round((verifiedCount / totalTopics) * 100) : 0

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const item: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className="grid grid-cols-2 md:grid-cols-4 gap-4"
    >
      {/* Topics Mastered */}
      <motion.div variants={item} className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-mono text-[9px] uppercase text-foreground-subtle">Mastered</span>
          </div>
        </div>
        <div className="text-display text-2xl font-semibold text-foreground leading-none">
          {verifiedCount}
        </div>
        <p className="text-mono text-[9px] text-foreground-subtle mt-1.5">
          of {totalTopics} total topics
        </p>
      </motion.div>

      {/* Topics Remaining */}
      <motion.div variants={item} className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-accent" />
            <span className="text-mono text-[9px] uppercase text-foreground-subtle">Remaining</span>
          </div>
        </div>
        <div className="text-display text-2xl font-semibold text-foreground leading-none">
          {remaining}
        </div>
        <p className="text-mono text-[9px] text-foreground-subtle mt-1.5">
          to complete track
        </p>
      </motion.div>

      {/* Completion Percentage */}
      <motion.div variants={item} className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-accent" />
            <span className="text-mono text-[9px] uppercase text-foreground-subtle">Progress</span>
          </div>
        </div>
        <div className="text-display text-2xl font-semibold text-foreground leading-none">
          {completionPct}%
        </div>
        <p className="text-mono text-[9px] text-foreground-subtle mt-1.5">
          track complete
        </p>
      </motion.div>

      {/* Lifetime XP */}
      <motion.div variants={item} className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span className="text-mono text-[9px] uppercase text-foreground-subtle">Lifetime XP</span>
          </div>
        </div>
        <div className="text-display text-2xl font-semibold text-foreground leading-none">
          {totalXP.toLocaleString()}
        </div>
        <p className="text-mono text-[9px] text-foreground-subtle mt-1.5">
          total earned
        </p>
      </motion.div>
    </motion.div>
  )
}
