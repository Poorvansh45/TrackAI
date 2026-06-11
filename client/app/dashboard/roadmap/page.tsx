"use client"

import { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Cpu, ChevronDown } from "lucide-react"
import { TrackInfoPanel } from "@/components/roadmap/track-info-panel"
import { LearningGraph, type PhaseData } from "@/components/roadmap/learning-graph"
import { AIAssistantPanel } from "@/components/roadmap/ai-assistant-panel"
import type { RoadmapNodeData, NodeStatus } from "@/components/roadmap/roadmap-node"
import { PageWrapper } from "@/components/dashboard/page-wrapper"

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDifficulty(pIdx: number, nIdx: number): "Beginner" | "Intermediate" | "Advanced" {
  const combined = pIdx * 10 + nIdx
  if (combined <= 4)  return "Beginner"
  if (combined <= 12) return "Intermediate"
  return "Advanced"
}

function getXP(d: "Beginner" | "Intermediate" | "Advanced") {
  return d === "Beginner" ? 100 : d === "Intermediate" ? 180 : 280
}

function getDuration(d: "Beginner" | "Intermediate" | "Advanced") {
  return d === "Beginner" ? "~1.5h" : d === "Intermediate" ? "~3h" : "~5h"
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "")
}

// ─── Roadmap parser (reads _nodeStatus overrides) ──────────────────────────

interface ParsedRoadmap {
  skill: string
  phases: PhaseData[]
  completedNodes: number
  totalNodes: number
  currentPhaseLabel: string
  currentPhaseNumber: number
  /** Set of topic slugs that were JUST unlocked (for glow animation) */
  justUnlockedSlugs: Set<string>
}

function parseRoadmapData(prevJustUnlocked?: Set<string>): ParsedRoadmap | null {
  try {
    const saved = localStorage.getItem("generatedRoadmap")
    if (!saved) return null
    const data = JSON.parse(saved)
    if (!data?.roadmap_result?.phases) return null

    const rawPhases = data.roadmap_result.phases
    let firstActiveSet = false
    const justUnlockedSlugs = new Set<string>()

    const phases: PhaseData[] = rawPhases.map((p: any, pIdx: number) => {
      const nodeStatusOverrides: Record<string, string> = p._nodeStatus || {}

      const nodes: RoadmapNodeData[] = (p.topics || []).map((topic: string, nIdx: number) => {
        const difficulty = getDifficulty(pIdx, nIdx)
        const slug = toSlug(topic)

        // Determine status: override → first-active fallback → locked
        let status: NodeStatus = "locked"
        if (nodeStatusOverrides[topic]) {
          status = nodeStatusOverrides[topic] as NodeStatus
        } else if (!firstActiveSet) {
          status = "active"
        }

        if (status === "active" || status === "completed") {
          firstActiveSet = true
        }

        // Check if this node was newly unlocked (compare to previous state)
        if (status === "active" && prevJustUnlocked === undefined) {
          // first render — don't glow anything
        } else if (status === "active" && prevJustUnlocked && !prevJustUnlocked.has(slug)) {
          // Was previously not active → newly unlocked
          justUnlockedSlugs.add(slug)
        }

        // Derive progress from saved localStorage progress
        let progress = 0
        if (status === "completed") {
          progress = 100
        } else if (status === "active") {
          try {
            const saved = localStorage.getItem(`topic_progress_${slug}`)
            if (saved) {
              const arr: string[] = JSON.parse(saved)
              // We don't know total from roadmap; assume 5 subtopics
              progress = Math.min(100, Math.round((arr.length / 5) * 100))
            }
          } catch {}
        }

        return {
          id:         `P${pIdx + 1}N${nIdx + 1}`,
          name:       topic,
          status,
          progress,
          xp:         getXP(difficulty),
          difficulty,
          duration:   getDuration(difficulty),
          phaseIndex: pIdx,
          nodeIndex:  nIdx,
        }
      })

      return {
        phaseNumber: p.phase_number || pIdx + 1,
        phaseTitle:  p.phase_title  || `Phase ${pIdx + 1}`,
        nodes,
      }
    })

    const allNodes       = phases.flatMap(p => p.nodes)
    const completedNodes = allNodes.filter(n => n.status === "completed").length
    const activePhase    = phases.find(p => p.nodes.some(n => n.status === "active"))

    return {
      skill:              data.skill || "Custom Track",
      phases,
      completedNodes,
      totalNodes:         allNodes.length,
      currentPhaseLabel:  activePhase?.phaseTitle  || phases[0]?.phaseTitle || "Phase 1",
      currentPhaseNumber: activePhase?.phaseNumber || 1,
      justUnlockedSlugs,
    }
  } catch {
    return null
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<ParsedRoadmap | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showLeftPanel,  setShowLeftPanel]  = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)

  const loadRoadmap = useCallback((prevUnlocked?: Set<string>) => {
    const parsed = parseRoadmapData(prevUnlocked)
    setRoadmap(parsed)
  }, [])

  useEffect(() => {
    loadRoadmap()
    setMounted(true)

    // Listen for storage events (fired from topic page after completion)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "generatedRoadmap") {
        setRoadmap(prev => {
          const prevSlugs = prev
            ? new Set(prev.phases.flatMap(p => p.nodes.filter(n => n.status === "active").map(n => toSlug(n.name))))
            : undefined
          return parseRoadmapData(prevSlugs)
        })
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [loadRoadmap])

  if (!mounted) return null

  if (!roadmap) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center mb-5">
          <Cpu className="w-7 h-7 text-accent opacity-60" />
        </div>
        <h2 className="text-display text-2xl text-foreground mb-2">No Roadmap Yet</h2>
        <p className="text-foreground-muted text-[13px] max-w-xs leading-relaxed">
          Complete the onboarding flow to generate your personalized AI learning roadmap.
        </p>
        <a
          href="/onboarding"
          className="mt-6 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-accent-foreground text-[13px] font-semibold transition-colors"
        >
          Start Onboarding
        </a>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb-glow absolute w-[500px] h-[500px] bg-accent/8 -top-32 -left-24" style={{ animationDelay: "0s" }} />
        <div className="orb-glow absolute w-[400px] h-[400px] bg-accent/5 top-1/2 -right-32"  style={{ animationDelay: "3.5s" }} />
        <div className="orb-glow absolute w-[300px] h-[300px] bg-success/4 bottom-0 left-1/3"  style={{ animationDelay: "2s" }} />
      </div>

      <PageWrapper maxWidth="full" className="relative z-10 !space-y-6">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6 pb-5 border-b border-border/40"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-mono text-[9px] text-accent uppercase tracking-widest font-semibold">
                Mission Control
              </span>
            </div>
            <h1 className="text-display text-2xl sm:text-3xl text-foreground">
              Learning <span className="text-accent">Roadmap</span>
            </h1>
            <p className="text-mono text-[10px] text-foreground-subtle mt-1">
              {roadmap.skill.toUpperCase()} · {roadmap.totalNodes} TOPICS · {roadmap.phases.length} PHASES
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 glass-panel px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-mono text-[9px] text-success uppercase">AI Online</span>
          </div>
        </motion.div>

        {/* Mobile toggles */}
        <div className="flex gap-2 mb-4 lg:hidden">
          <button
            onClick={() => setShowLeftPanel(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel text-mono text-[10px] text-foreground-muted"
          >
            Track Info <ChevronDown className={`w-3 h-3 transition-transform ${showLeftPanel ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={() => setShowRightPanel(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel text-mono text-[10px] text-foreground-muted"
          >
            AI Mentor <ChevronDown className={`w-3 h-3 transition-transform ${showRightPanel ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] xl:grid-cols-[280px_1fr_280px] gap-5">

          {/* LEFT */}
          <div className={`${showLeftPanel ? "block" : "hidden"} lg:block`}>
            <TrackInfoPanel
              skill={roadmap.skill}
              totalPhases={roadmap.phases.length}
              completedNodes={roadmap.completedNodes}
              totalNodes={roadmap.totalNodes}
              currentPhaseLabel={roadmap.currentPhaseLabel}
              currentPhaseNumber={roadmap.currentPhaseNumber}
            />
          </div>

          {/* CENTER — Learning Graph */}
          <div className="min-w-0">
            <div className="glass-panel px-4 py-3 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-accent" />
                <span className="text-[12px] font-semibold text-foreground">Learning Graph</span>
              </div>
              <div className="flex items-center gap-3 text-mono text-[9px] text-foreground-subtle">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-success inline-block" />Completed
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse inline-block" />Active
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-foreground-subtle/30 inline-block" />Locked
                </span>
              </div>
            </div>

            <LearningGraph
              phases={roadmap.phases}
              skill={roadmap.skill}
              justUnlockedSlugs={roadmap.justUnlockedSlugs}
            />
          </div>

          {/* RIGHT */}
          <div className={`${showRightPanel ? "block" : "hidden"} lg:block`}>
            <AIAssistantPanel phases={roadmap.phases} skill={roadmap.skill} />
          </div>
        </div>
      </PageWrapper>
    </div>
  )
}
