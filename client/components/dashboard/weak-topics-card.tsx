"use client"

import { motion } from "framer-motion"
import { AlertTriangle, RefreshCw } from "lucide-react"

const weakTopics = [
  { id: 1, name: "Vector Indexing (HNSW)", accuracy: 45, module: "AI/ML Track" },
  { id: 2, name: "Chunking Strategies", accuracy: 55, module: "AI/ML Track" },
  { id: 3, name: "Retrieval Evaluation", accuracy: 62, module: "AI/ML Track" },
]

export function WeakTopicsCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-destructive-muted flex items-center justify-center text-destructive">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Weak Concepts</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Needs verification review</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {weakTopics.map((topic) => (
          <div
            key={topic.id}
            className="p-3 rounded-lg bg-surface-2/40 border border-border/40 hover:border-border/80 transition-all"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <span className="text-mono text-[8px] text-foreground-subtle block uppercase">{topic.module}</span>
                <span className="text-[12px] font-semibold text-foreground mt-0.5 block">{topic.name}</span>
              </div>
              <button className="text-mono text-[9px] text-accent hover:text-accent-hover transition-colors font-medium">
                REVISE
              </button>
            </div>

            {/* Accuracy bar */}
            <div>
              <div className="flex justify-between text-mono text-[9px] mb-1">
                <span className="text-foreground-subtle">Accuracy baseline</span>
                <span className={`font-semibold ${topic.accuracy < 50 ? "text-destructive" : "text-warning"}`}>
                  {topic.accuracy}%
                </span>
              </div>
              <div className="h-0.5 bg-surface-3 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${topic.accuracy < 50 ? "bg-destructive" : "bg-warning"}`}
                  style={{ width: `${topic.accuracy}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full bg-transparent hover:bg-surface-2 border border-border text-foreground-muted hover:text-foreground rounded-md h-9 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5">
        <RefreshCw className="w-3.5 h-3.5" />
        Start Practice Session
      </button>
    </motion.div>
  )
}
