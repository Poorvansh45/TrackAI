"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Cpu, ChevronDown } from "lucide-react"
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
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({})
  const [hasInitialized, setHasInitialized] = useState(false)

  // Automatically expand the active phase on initial load
  useEffect(() => {
    if (phases.length > 0 && !hasInitialized) {
      const activePhase = phases.find(p => p.nodes.some(n => n.status === "active"))
      const activeNum = activePhase?.phaseNumber ?? 1
      setExpandedPhases({ [activeNum]: true })
      setHasInitialized(true)
    }
  }, [phases, hasInitialized])

  const togglePhase = (phaseNumber: number) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseNumber]: !prev[phaseNumber]
    }))
  }

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
        const isExpanded     = !!expandedPhases[phase.phaseNumber]

        return (
          <motion.div
            key={phase.phaseNumber}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: pIdx * 0.05, ease: "easeOut" }}
          >
            {/* Phase header (Click to expand/collapse) */}
            <div 
              onClick={() => togglePhase(phase.phaseNumber)}
              className="flex items-center gap-3 mb-5 cursor-pointer group/header select-none hover:opacity-90 transition-opacity"
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center"
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
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-mono text-[9px] text-foreground-subtle uppercase tracking-widest">
                    Phase {phase.phaseNumber}
                  </span>
                </div>
                <h2 className="text-[14px] font-semibold text-foreground leading-tight truncate group-hover/header:text-accent transition-colors">
                  {phase.phaseTitle}
                </h2>
              </div>

              {/* Phase completion badge + Toggle Chevron */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2/60 border border-border/40">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    phaseCompleted
                      ? "bg-success"
                      : phaseActive
                      ? "bg-accent"
                      : "bg-foreground-subtle/30"
                  }`} />
                  <span className="text-mono text-[9px] text-foreground-subtle">
                    {allNodesInPhase.filter(n => n.status === "completed").length}/{allNodesInPhase.length}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-foreground-subtle/70 group-hover/header:text-foreground transition-transform duration-200 ${
                  isExpanded ? "rotate-0" : "-rotate-90"
                }`} />
              </div>
            </div>

            {/* Clean Static Phase Divider */}
            <div className="phase-glow-line mb-5" />

            {/* Collapsible nodes */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col items-stretch space-y-0 pb-3">
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Inter-phase connector */}
            {pIdx < phases.length - 1 && (
              <div className="flex flex-col items-center mt-4">
                <div
                  className={`node-connector h-10 ${phaseCompleted ? "node-connector-done" : ""}`}
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
