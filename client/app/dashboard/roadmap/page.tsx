"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Cpu, ChevronDown } from "lucide-react"
import { TrackInfoPanel } from "@/components/roadmap/track-info-panel"
import { LearningGraph, type PhaseData } from "@/components/roadmap/learning-graph"
import { AIAssistantPanel } from "@/components/roadmap/ai-assistant-panel"
import type { RoadmapNodeData, NodeStatus } from "@/components/roadmap/roadmap-node"
import { PageWrapper } from "@/components/dashboard/page-wrapper"
import { useRoadmapProgress, type BackendRoadmapState } from "@/lib/roadmap-state"

// ─── Difficulty/XP/duration heuristics (display-only — status & progress
//     come straight from the backend, the single source of truth) ─────────

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

// ─── Backend state -> view model ───────────────────────────────────────────

interface ViewModel {
  skill: string
  phases: PhaseData[]
  completedNodes: number
  totalNodes: number
  currentPhaseLabel: string
  currentPhaseNumber: number
}

function buildViewModel(state: BackendRoadmapState): ViewModel {
  const phases: PhaseData[] = state.phases.map((phase, pIdx) => ({
    phaseNumber: phase.phase_number,
    phaseTitle: phase.phase_title,
    nodes: phase.topics.map((topic, nIdx): RoadmapNodeData => {
      const difficulty = getDifficulty(pIdx, nIdx)
      return {
        id: topic.topic_id,
        name: topic.topic_name,
        status: topic.status as NodeStatus,
        // progress_pct is computed server-side, capped 0-100 — root-cause fix
        progress: topic.status === "completed" ? 100 : topic.progress_pct,
        xp: topic.status === "completed" ? topic.xp_earned : getXP(difficulty),
        difficulty,
        duration: getDuration(difficulty),
        phaseIndex: pIdx,
        nodeIndex: nIdx,
      }
    }),
  }))

  const allNodes = phases.flatMap((p) => p.nodes)
  const activePhase = phases.find((p) => p.nodes.some((n) => n.status === "active"))

  return {
    skill: state.skill,
    phases,
    completedNodes: state.completed_count,
    totalNodes: state.total_count,
    currentPhaseLabel: activePhase?.phaseTitle || phases[0]?.phaseTitle || "Phase 1",
    currentPhaseNumber: activePhase?.phaseNumber || 1,
  }
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function RoadmapPage() {
  const { data, loading } = useRoadmapProgress()
  const [mounted, setMounted] = useState(false)
  const [showLeftPanel, setShowLeftPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)

  // Track previously-active topic_ids so newly-unlocked nodes can glow once
  const prevActiveIds = useRef<Set<string>>(new Set())
  const [justUnlockedSlugs, setJustUnlockedSlugs] = useState<Set<string>>(new Set())

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!data) return
    const currentActive = new Set(
      data.phases.flatMap((p) => p.topics).filter((t) => t.status === "active").map((t) => t.topic_id)
    )

    if (prevActiveIds.current.size > 0) {
      const newlyUnlocked = new Set<string>()
      currentActive.forEach((id) => {
        if (!prevActiveIds.current.has(id)) newlyUnlocked.add(id)
      })
      if (newlyUnlocked.size > 0) setJustUnlockedSlugs(newlyUnlocked)
    }

    prevActiveIds.current = currentActive
  }, [data])

  // Only block render on the very first load (no data yet).
  // On subsequent refreshes (roadmap-update event), keep showing stale data
  // while the new fetch is in-flight — prevents a flash of blank content.
  if (!mounted) return null
  if (loading && !data) return null

  if (!data || data.total_count === 0) {
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

  const roadmap = buildViewModel(data)

  // roadmap-node.tsx navigates using toSlug(node.name); topic_id (our id)
  // is generated the same way server-side, so they're identical strings —
  // map node.id -> the slug the node component will compute for itself.
  const justUnlocked = new Set(
    roadmap.phases
      .flatMap((p) => p.nodes)
      .filter((n) => justUnlockedSlugs.has(n.id))
      .map((n) => n.id)
  )

  return (
    <div className="relative min-h-screen">
      {/* Ambient glow orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb-glow absolute w-[500px] h-[500px] bg-accent/8 -top-32 -left-24" style={{ animationDelay: "0s" }} />
        <div className="orb-glow absolute w-[400px] h-[400px] bg-accent/5 top-1/2 -right-32" style={{ animationDelay: "3.5s" }} />
        <div className="orb-glow absolute w-[300px] h-[300px] bg-success/4 bottom-0 left-1/3" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10">
        {/* Hero Section Container (Full bleed) */}
        <div className="relative border-b border-border/30 bg-gradient-to-b from-accent/[0.04] via-accent/[0.01] to-transparent mb-8">
          <div className="max-w-[1400px] mx-auto px-10 lg:px-14 pt-8 md:pt-10 pb-8">
            {/* Page header inside Hero */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="relative">
                {/* Soft background glow orb behind header */}
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-72 h-24 bg-accent/10 blur-[80px] rounded-full pointer-events-none" />

                {/* MISSION CONTROL badge */}
                <div className="mb-3.5 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-mono text-[9px] text-accent uppercase tracking-widest font-bold">
                    Mission Control
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-2 relative z-10">
                  Learning <span className="text-accent relative" style={{ textShadow: "0 0 30px oklch(0.62 0.20 275 / 0.35)" }}>Roadmap</span>
                </h1>

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-3 text-mono text-[10px] text-foreground-subtle uppercase tracking-wider font-semibold">
                  <span>{roadmap.skill}</span>
                  <span className="text-border/80">•</span>
                  <span>{roadmap.totalNodes} Topics</span>
                  <span className="text-border/80">•</span>
                  <span>{roadmap.phases.length} Phases</span>
                </div>
              </div>

              {/* AI Online badge balanced on the right */}
              <div className="flex items-center gap-2 bg-success/5 border border-success/15 hover:border-success/30 px-3.5 py-1.5 rounded-full w-fit self-start md:self-center transition-all duration-300 backdrop-blur-md shadow-[0_0_15px_rgba(96,244,155,0.05)]">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-mono text-[9px] text-success uppercase tracking-widest font-bold">
                  AI Online
                </span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content Area Container (1400px centered, aligns with Hero content, 64px bottom spacing after hero) */}
        <div className="max-w-[1400px] mx-auto px-10 lg:px-14 pb-16 z-10 relative">
          {/* Mobile toggles */}
          <div className="flex gap-2 mb-4 lg:hidden">
            <button
              onClick={() => setShowLeftPanel((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-panel text-mono text-[10px] text-foreground-muted"
            >
              Track Info <ChevronDown className={`w-3 h-3 transition-transform ${showLeftPanel ? "rotate-180" : ""}`} />
            </button>
            <button
              onClick={() => setShowRightPanel((v) => !v)}
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
                justUnlockedSlugs={justUnlocked}
              />
            </div>

            {/* RIGHT */}
            <div className={`${showRightPanel ? "block" : "hidden"} lg:block`}>
              <AIAssistantPanel phases={roadmap.phases} skill={roadmap.skill} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
