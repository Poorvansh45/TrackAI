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
      </PageWrapper>
    </div>
  )
}
