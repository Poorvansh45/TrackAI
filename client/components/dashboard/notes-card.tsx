"use client"

import { motion } from "framer-motion"
import { FileText, ArrowRight, BookOpen } from "lucide-react"
import Link from "next/link"

export function NotesCard() {
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
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">AI Study Notes</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Updated 10m ago</p>
          </div>
        </div>
      </div>

      {/* Note preview snippet */}
      <div className="p-3.5 rounded-lg bg-surface-2/60 border border-border/40 mb-4 space-y-2">
        <span className="text-mono text-[8px] text-accent uppercase tracking-wider font-semibold">Active Document</span>
        <h4 className="text-[12px] font-semibold text-foreground mt-0.5">RAG Architectures</h4>
        <div className="text-[11px] text-foreground-muted leading-relaxed truncate">
          RAG extends LLMs by querying external vector databases for context before generation...
        </div>
      </div>

      {/* Action button */}
      <Link href="/dashboard/notes">
        <button className="w-full bg-transparent hover:bg-surface-2 border border-border text-foreground-muted hover:text-foreground rounded-md h-9 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Open Notes Reader
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </Link>
    </motion.div>
  )
}
