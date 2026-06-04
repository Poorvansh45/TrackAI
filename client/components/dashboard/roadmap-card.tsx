"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Lock, Play, ChevronRight } from "lucide-react"
import Link from "next/link"

const roadmapNodes = [
  { id: "RD-001", name: "Python & Data Science Setup", status: "completed", xp: 500 },
  { id: "RD-002", name: "RAG Systems Architecture", status: "completed", xp: 750 },
  { id: "RD-003", name: "Vector Embeddings & Search", status: "current", xp: 1200, progress: 65 },
  { id: "RD-004", name: "Agentic Workflows (LangGraph)", status: "locked", xp: 1000 },
  { id: "RD-005", name: "LLM Fine-Tuning & Evaluation", status: "locked", xp: 2000 },
]

export function RoadmapCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold text-foreground">Learning Roadmap</h3>
          <p className="text-[11px] text-foreground-subtle">AI/ML Engineering Track</p>
        </div>
        <Link href="/dashboard/roadmap">
          <button className="flex items-center gap-1 text-mono text-[10px] text-accent hover:text-accent-hover transition-colors font-medium">
            View Full Map
            <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      <div className="relative">
        {/* Progress line */}
        <div className="absolute left-3.5 top-2.5 bottom-2.5 w-[1px] bg-border/60" />
        
        <div className="space-y-3">
          {roadmapNodes.map((node, index) => {
            const isCurrent = node.status === "current"
            const isCompleted = node.status === "completed"
            
            return (
              <div
                key={node.id}
                className={`relative flex items-center gap-3.5 pl-8 pr-3 py-2 rounded-lg transition-all ${
                  isCurrent 
                    ? "bg-surface-2/60 border border-accent/20" 
                    : "bg-transparent border border-transparent"
                }`}
              >
                {/* Node icon */}
                <div className="absolute left-1.5 z-10 w-4 h-4 rounded-full flex items-center justify-center bg-background border border-border">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  ) : (
                    <Lock className="w-2.5 h-2.5 text-foreground-subtle/50" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-mono text-[9px] text-foreground-subtle">{node.id}</span>
                      <h4 className={`text-[12px] font-semibold truncate ${
                        isCompleted ? "text-foreground-muted" : isCurrent ? "text-foreground" : "text-foreground-subtle"
                      }`}>
                        {node.name}
                      </h4>
                    </div>
                    <span className="text-mono text-[9px] text-foreground-subtle">
                      +{node.xp} XP
                    </span>
                  </div>
                  
                  {isCurrent && node.progress && (
                    <div className="mt-2 max-w-xs">
                      <div className="flex justify-between text-mono text-[9px] mb-1">
                        <span className="text-foreground-subtle">Concept verified</span>
                        <span className="text-accent font-semibold">{node.progress}%</span>
                      </div>
                      <div className="h-0.5 bg-surface-3 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${node.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
