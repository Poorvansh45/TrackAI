"use client"

import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Lock, Play, Zap, Clock, BarChart2, ArrowRight, Sparkles } from "lucide-react"

export type NodeStatus = "completed" | "active" | "locked"

export interface RoadmapNodeData {
  id: string
  name: string
  status: NodeStatus
  progress: number        // 0–100
  xp: number
  difficulty: "Beginner" | "Intermediate" | "Advanced"
  duration: string        // e.g. "~2h"
  phaseIndex: number
  nodeIndex: number
}

interface RoadmapNodeProps {
  node: RoadmapNodeData
  index: number           // global stagger index
  isLast: boolean
  justUnlocked?: boolean  // true = trigger unlock animation
}

const DIFFICULTY_CLASS: Record<string, string> = {
  Beginner:     "badge-beginner",
  Intermediate: "badge-intermediate",
  Advanced:     "badge-advanced",
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function RoadmapNode({ node, index, isLast, justUnlocked = false }: RoadmapNodeProps) {
  const router = useRouter()
  const isCompleted = node.status === "completed"
  const isActive    = node.status === "active"
  const isLocked    = node.status === "locked"

  const handleContinue = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/topic/${toSlug(node.name)}`)
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* ── Node Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.04, ease: "easeOut" }}
        className={`
          w-full group relative
          glass-panel px-4 py-3.5
          transition-all duration-200 ease-out
          ${isActive    ? "glow-active"  : ""}
          ${isCompleted ? "glow-success" : ""}
          ${isLocked    ? "opacity-45 cursor-not-allowed" : "cursor-pointer hover:border-accent/30 hover:bg-surface-2/10 hover:shadow-sm"}
        `}
      >

        <div className="relative z-10 flex items-start gap-3">
          {/* Status orb */}
          <div className="flex-shrink-0 mt-0.5">
            {isCompleted ? (
              <div className="w-6 h-6 rounded-full bg-success/15 border border-success/35 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              </div>
            ) : isActive ? (
              <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/45 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-accent" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-surface-2 border border-border/30 flex items-center justify-center">
                <Lock className="w-3 h-3 text-foreground-subtle/40" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h3 className={`text-[13px] font-semibold leading-tight ${
                  isLocked && !justUnlocked
                    ? "text-foreground-subtle"
                    : isCompleted
                    ? "text-foreground-muted"
                    : "text-foreground"
                }`}>
                  {node.name}
                </h3>
                {/* Status chip */}
                {isCompleted && (
                  <span className="flex-shrink-0 text-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-success/10 border border-success/25 text-success">
                    MASTERED
                  </span>
                )}
                {isActive && (
                  <span className="flex-shrink-0 text-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent">
                    IN PROGRESS
                  </span>
                )}
                {isLocked && !justUnlocked && (
                  <span className="flex-shrink-0 text-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-surface-2 border border-border/30 text-foreground-subtle/50">
                    LOCKED
                  </span>
                )}
              </div>
              {!isLocked && (
                <span className="xp-badge text-mono text-[9px] font-bold text-accent px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" />+{node.xp}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2.5">
              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_CLASS[node.difficulty]}`}>
                {node.difficulty}
              </span>
              <span className="text-mono text-[9px] text-foreground-subtle flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />{node.duration}
              </span>
              {isCompleted && (
                <span className="text-mono text-[9px] text-success font-semibold ml-auto">
                  ✓ Completed
                </span>
              )}
              {justUnlocked && isActive && (
                <span className="text-mono text-[9px] text-accent font-semibold ml-auto">
                  Available
                </span>
              )}
            </div>

            {/* Progress bar */}
            {!isLocked && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1 text-mono text-[8px] text-foreground-subtle">
                    <BarChart2 className="w-2.5 h-2.5" />Progress
                  </div>
                  <span className="text-mono text-[8px] text-foreground-subtle">{node.progress}%</span>
                </div>
                <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${node.progress}%` }}
                    transition={{ duration: 0.8, delay: index * 0.06 + 0.3, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: isCompleted
                        ? "oklch(0.60 0.16 155)"
                        : "linear-gradient(to right, oklch(0.62 0.20 275), oklch(0.70 0.22 280))",
                    }}
                  />
                </div>
              </div>
            )}

            {/* CTA */}
            {!isLocked && (
              <motion.button
                onClick={handleContinue}
                whileTap={{ scale: 0.97 }}
                className={`
                  flex items-center gap-1.5 text-mono text-[10px] font-semibold px-3 py-1.5 rounded-md
                  transition-all duration-200
                  ${isCompleted
                    ? "bg-success/15 text-success border border-success/30 hover:bg-success/25"
                    : "bg-accent/20 text-accent border border-accent/40 hover:bg-accent/30 hover:shadow-md hover:shadow-accent/10"
                  }
                `}
              >
                {isCompleted ? (
                  <><CheckCircle2 className="w-3 h-3" />Review</>
                ) : (
                  <><Play className="w-3 h-3 fill-current" />Continue<ArrowRight className="w-3 h-3" /></>
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Connector line ── */}
      {!isLast && (
        <div className="flex flex-col items-center py-1">
          <div className={`node-connector h-8 ${isCompleted ? "node-connector-done" : ""}`} />
          <div className={`w-1 h-1 rounded-full ${isCompleted ? "bg-success/50" : "bg-accent/20"}`} />
          <div className={`node-connector h-4 ${isCompleted ? "node-connector-done" : ""}`} />
        </div>
      )}
    </div>
  )
}
