"use client"

import { motion } from "framer-motion"
import { Play, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const currentLesson = {
  title: "Vector Embeddings & Semantic Search",
  module: "AI/ML Track · Module 3",
  progress: 65,
  timeLeft: "12 min left",
  completedSections: 3,
  totalSections: 5,
}

export function ContinueLearning() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="surface-card p-5 relative overflow-hidden"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-mono text-[9px] text-accent uppercase tracking-wider font-semibold">
            {currentLesson.module}
          </span>
          <h3 className="text-[14px] font-semibold text-foreground mt-1">
            {currentLesson.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 self-start md:self-auto text-mono text-[10px] text-foreground-subtle px-2 py-0.5 rounded bg-surface-2 border border-border">
          <Clock className="w-3 h-3" />
          <span>{currentLesson.timeLeft}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-mono text-[10px] mb-1.5">
          <span className="text-foreground-subtle">
            {currentLesson.completedSections}/{currentLesson.totalSections} concepts verified
          </span>
          <span className="text-accent font-semibold">{currentLesson.progress}%</span>
        </div>
        
        {/* Thin 2px progress bar */}
        <div className="h-0.5 w-full bg-surface-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${currentLesson.progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1.5">
        <Button className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 fill-current" />
          Continue Session
        </Button>
        
        <div className="flex items-center gap-1.5 text-mono text-[10px] text-foreground-subtle">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span>Session Sync: Active</span>
        </div>
      </div>
    </motion.div>
  )
}
