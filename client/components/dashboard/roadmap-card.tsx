"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Lock, ChevronRight } from "lucide-react"
import Link from "next/link"

interface Node {
  id: string
  name: string
  status: "completed" | "current" | "locked"
  xp: number
  progress?: number
}

export function RoadmapCard() {
  const [nodes, setNodes] = useState<Node[]>([
    { id: "RD-001", name: "Loading...", status: "locked", xp: 0 }
  ])
  const [skillLabel, setSkillLabel] = useState("Loading Track...")

  useEffect(() => {
    const saved = localStorage.getItem("generatedRoadmap")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.skill) setSkillLabel(`${parsed.skill} Track`)
        
        if (parsed?.roadmap_result?.phases) {
          const phases = parsed.roadmap_result.phases
          const newNodes: Node[] = []
          let foundCurrent = false
          let count = 1

          for (const p of phases) {
            for (const topic of p.topics || []) {
              const isCurrent = !foundCurrent
              if (isCurrent) foundCurrent = true
              
              newNodes.push({
                id: `RD-${String(count).padStart(3, '0')}`,
                name: topic,
                status: isCurrent ? "current" : "locked",
                xp: 100 * count,
                progress: isCurrent ? 0 : undefined
              })
              count++
              if (newNodes.length >= 5) break // Only show first 5 on dashboard
            }
            if (newNodes.length >= 5) break
          }
          if (newNodes.length > 0) setNodes(newNodes)
        }
      } catch (e) {
        console.error("Failed to parse roadmap", e)
      }
    }
  }, [])

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
          <p className="text-[11px] text-foreground-subtle">{skillLabel}</p>
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
          {nodes.map((node) => {
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
                  
                  {isCurrent && node.progress !== undefined && (
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
