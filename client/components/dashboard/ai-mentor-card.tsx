"use client"

import { motion } from "framer-motion"
import { Brain, ArrowRight, MessageSquare } from "lucide-react"
import Link from "next/link"

export function AIMentorCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">AI Mentor</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Customized to your schedule</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-mono text-[9px] text-foreground-subtle">Ready</span>
        </div>
      </div>

      {/* Latest message preview */}
      <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border/40 mb-4 text-[12px] text-foreground-muted leading-relaxed">
        <span className="font-semibold text-foreground block mb-1">Mentor Recommendation</span>
        I noticed you skipped a few vector database concepts. Let&apos;s review vector quantization or take a quick practice quiz.
      </div>

      {/* Action button */}
      <Link href="/dashboard" className="block">
        <button className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          Consult Mentor
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  )
}
