"use client"

import { motion } from "framer-motion"
import { Cpu } from "lucide-react"
import { RoadmapNode, type RoadmapNodeData } from "./roadmap-node"

export interface PhaseData {
  phaseNumber: number
  phaseTitle: string
  nodes: RoadmapNodeData[]
}

interface LearningGraphProps {
  phases: PhaseData[]
  skill: string
  justUnlockedSlugs?: Set<string>
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

export function LearningGraph({ phases, skill, justUnlockedSlugs }: LearningGraphProps) {
  if (phases.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center mb-4">
          <Cpu className="w-6 h-6 text-accent opacity-60" />
        </div>
        <h3 className="text-[15px] font-semibold text-foreground mb-1">No Roadmap Data</h3>
        <p className="text-[12px] text-foreground-subtle max-w-xs">
          Complete onboarding to generate your personalized learning graph.
        </p>
      </div>
    )
  }

  let globalNodeIndex = 0

  return (
    <div className="space-y-8">
      {phases.map((phase, pIdx) => {
        const allNodesInPhase = phase.nodes
        const phaseStartIndex = globalNodeIndex
        globalNodeIndex += phase.nodes.length

        const phaseCompleted = allNodesInPhase.every(n => n.status === "completed")
        const phaseActive    = allNodesInPhase.some(n => n.status === "active")

        return (
          <motion.div
            key={phase.phaseNumber}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: pIdx * 0.1, ease: "easeOut" }}
          >
            {/* Phase header */}
            <div className="flex items-center gap-3 mb-5">
              <motion.div
                className="flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center"
                animate={phaseCompleted ? {
                  borderColor: ["oklch(0.60 0.16 155 / 0.3)", "oklch(0.60 0.16 155 / 0.6)", "oklch(0.60 0.16 155 / 0.3)"],
                  boxShadow: ["0 0 0px transparent", "0 0 12px oklch(0.60 0.16 155 / 0.2)", "0 0 0px transparent"],
                } : {}}
                transition={{ duration: 2, repeat: phaseCompleted ? Infinity : 0, ease: "easeInOut" }}
                style={{
                  background: phaseCompleted
                    ? "oklch(0.60 0.16 155 / 0.12)"
                    : "oklch(0.62 0.20 275 / 0.12)",
                  borderColor: phaseCompleted
                    ? "oklch(0.60 0.16 155 / 0.35)"
                    : "oklch(0.62 0.20 275 / 0.3)",
                }}
              >
                <span
                  className="text-mono text-[11px] font-bold"
                  style={{ color: phaseCompleted ? "oklch(0.60 0.16 155)" : "oklch(0.62 0.20 275)" }}
                >
                  {phase.phaseNumber}
                </span>
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-mono text-[9px] text-foreground-subtle uppercase tracking-widest">
                    Phase {phase.phaseNumber}
                  </span>
                </div>
                <h2 className="text-[14px] font-semibold text-foreground leading-tight truncate">
                  {phase.phaseTitle}
                </h2>
              </div>

              {/* Phase completion badge */}
              <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2/60 border border-border/40">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  phaseCompleted
                    ? "bg-success"
                    : phaseActive
                    ? "bg-accent animate-pulse"
                    : "bg-foreground-subtle/30"
                }`} />
                <span className="text-mono text-[9px] text-foreground-subtle">
                  {allNodesInPhase.filter(n => n.status === "completed").length}/{allNodesInPhase.length}
                </span>
              </div>
            </div>

            {/* Phase underline — animates green when phase complete */}
            <motion.div
              className="phase-glow-line mb-5"
              animate={phaseCompleted ? {
                background: [
                  "linear-gradient(to right, transparent, oklch(0.60 0.16 155 / 0.5), transparent)",
                  "linear-gradient(to right, transparent, oklch(0.60 0.16 155 / 0.8), transparent)",
                  "linear-gradient(to right, transparent, oklch(0.60 0.16 155 / 0.5), transparent)",
                ],
              } : {}}
              transition={{ duration: 2.5, repeat: phaseCompleted ? Infinity : 0 }}
            />

            {/* Nodes */}
            <div className="flex flex-col items-stretch space-y-0">
              {allNodesInPhase.map((node, nIdx) => {
                const slug = toSlug(node.name)
                const justUnlocked = justUnlockedSlugs?.has(slug) ?? false

                return (
                  <RoadmapNode
                    key={node.id}
                    node={node}
                    index={phaseStartIndex + nIdx}
                    isLast={nIdx === allNodesInPhase.length - 1}
                    justUnlocked={justUnlocked}
                  />
                )
              })}
            </div>

            {/* Inter-phase connector */}
            {pIdx < phases.length - 1 && (
              <div className="flex flex-col items-center mt-4">
                <motion.div
                  className="node-connector h-10"
                  animate={phaseCompleted ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={phaseCompleted ? { borderColor: "oklch(0.60 0.16 155 / 0.5)" } : {}}
                />
                <div className="px-3 py-1 rounded-full bg-surface-2/60 border border-border/30 text-mono text-[8px] text-foreground-subtle uppercase">
                  Phase {phase.phaseNumber + 1} unlocks
                </div>
                <div className="node-connector h-4" />
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
