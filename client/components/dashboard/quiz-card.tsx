"use client"

import { motion } from "framer-motion"
import { Target, ArrowRight, ClipboardCheck } from "lucide-react"
import Link from "next/link"

export function QuizCard() {
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
            <h3 className="text-[13px] font-semibold text-foreground">Pending verification</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Quiz checkpoint ready</p>
          </div>
        </div>
      </div>

      {/* Quiz details */}
      <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border/40 mb-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-foreground">Vector Database Indexing</span>
          <span className="text-mono text-[8px] bg-accent-subtle text-accent border border-accent/20 px-1.5 py-0.5 rounded font-semibold uppercase">
            Intermediate
          </span>
        </div>
        <div className="text-[11px] text-foreground-muted">
          12 conceptual questions testing HNSW graph traversal and IVF indexing recall.
        </div>
      </div>

      {/* Action buttons */}
      <Link href="/dashboard/quiz">
        <button className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          Start Verification Quiz
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  )
}
