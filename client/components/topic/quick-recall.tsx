"use client"

import { motion } from "framer-motion"
import { Zap, ArrowRight } from "lucide-react"
import type { TopicData } from "@/app/topic/[topicId]/page"

interface QuickRecallProps {
  summary: string[]
  keyConcepts: TopicData["key_concepts"]
}

export function QuickRecall({ summary, keyConcepts }: QuickRecallProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="rounded-xl border border-border overflow-hidden"
      style={{ background: "oklch(0.10 0.01 260 / 0.7)" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/50 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-accent" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">Quick Recall</h2>
          <p className="text-[10px] text-foreground-muted">Revise this topic in under 30 seconds</p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary bullets */}
        <div className="space-y-2">
          {summary.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              className="flex items-start gap-2.5 text-[12px] text-foreground"
            >
              <div
                className="flex-shrink-0 w-4 h-4 rounded mt-0.5 flex items-center justify-center text-[8px] font-bold"
                style={{ background: "oklch(0.62 0.20 275 / 0.2)", color: "oklch(0.62 0.20 275)" }}
              >
                {i + 1}
              </div>
              {line}
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50" />

        {/* Key Concepts chips */}
        <div>
          <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wider mb-3">
            Key Concepts
          </p>
          <div className="flex flex-wrap gap-2">
            {keyConcepts.map((concept, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 + i * 0.05 }}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-accent/40 transition-all duration-200 hover:bg-accent/5"
                style={{ background: "oklch(0.08 0.01 260)" }}
              >
                <span className="text-[11px] font-semibold text-foreground group-hover:text-accent transition-colors">
                  {concept.term}
                </span>
                <ArrowRight className="w-3 h-3 text-foreground-subtle/50 flex-shrink-0" />
                <span className="text-[11px] text-foreground-muted">{concept.definition}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
