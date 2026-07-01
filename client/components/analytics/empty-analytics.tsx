"use client"

import { Layers, ChevronRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export function EmptyAnalytics() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
        <Layers className="w-8 h-8 text-accent/60" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        No Analytics Available Yet
      </h2>
      <p className="text-[13px] text-foreground-subtle max-w-md mx-auto mb-6 leading-relaxed">
        Your performance analytics, study insights, and progress forecasts will
        appear here automatically as you complete topics and earn XP on your roadmap.
      </p>
      <Link href="/dashboard/roadmap">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-foreground font-semibold hover:bg-accent-hover transition-colors shadow-sm">
          Start Learning
          <ChevronRight className="w-4 h-4" />
        </button>
      </Link>
    </motion.div>
  )
}
