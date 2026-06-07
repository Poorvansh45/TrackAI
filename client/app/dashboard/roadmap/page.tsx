"use client"

import { useEffect, useState } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { CheckCircle2, Lock, Play, Target, FileText, Clock } from "lucide-react"
import Link from "next/link"

interface Node {
  id: string
  name: string
  status: "completed" | "current" | "locked"
  time: string
  mastery?: number
}

interface Phase {
  phase: string
  nodes: Node[]
}

export default function RoadmapPage() {
  const [roadmapPhases, setRoadmapPhases] = useState<Phase[]>([])
  const [skillLabel, setSkillLabel] = useState<string>("CUSTOM")
  const [activeNode, setActiveNode] = useState<string>("TBD")

  useEffect(() => {
    const saved = localStorage.getItem("generatedRoadmap")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === "object") {
          if (parsed.skill) setSkillLabel(parsed.skill.toUpperCase())
          
          if (parsed.roadmap_result && Array.isArray(parsed.roadmap_result.phases)) {
            let foundCurrent = false
            const mappedPhases: Phase[] = parsed.roadmap_result.phases.map((p: any, i: number) => {
              return {
                phase: `PHASE ${p.phase_number || i + 1}: ${(p.phase_title || 'FOUNDATIONS').toUpperCase()}`,
                nodes: (p.topics || []).map((t: string, j: number) => {
                  const isCurrent = !foundCurrent
                  if (isCurrent) {
                    foundCurrent = true
                    setActiveNode(`RD-${String(i + 1).padStart(2, '0')}${String(j + 1).padStart(2, '0')}`)
                  }
                  return {
                    id: `RD-${String(i + 1).padStart(2, '0')}${String(j + 1).padStart(2, '0')}`,
                    name: t,
                    status: isCurrent ? "current" : "locked",
                    time: "TBD",
                    mastery: isCurrent ? 0 : undefined
                  }
                })
              }
            })
            setRoadmapPhases(mappedPhases)
          }
        }
      } catch (e) {
        console.error("Failed to parse roadmap data", e)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      
      <div className="flex">
        <DashboardSidebar />
        
        <main className="flex-1 p-5 lg:p-8 lg:pl-20 pt-16">
          <div className="max-w-[800px] mx-auto space-y-6">
            <div className="border-b border-border/40 pb-5 mb-6">
              <h1 className="text-display text-2xl sm:text-3xl text-foreground">
                Learning <span className="text-accent">Roadmap</span>
              </h1>
              <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider">
                TRACK: {skillLabel} · ACTIVE NODE: {activeNode}
              </p>
            </div>

            {roadmapPhases.length === 0 ? (
              <div className="text-center py-10 text-foreground-subtle">
                No roadmap data available. Please complete onboarding.
              </div>
            ) : (
              <div className="relative pl-1">
                <div className="absolute left-[19px] top-6 bottom-6 w-[1px] bg-border/60" />

                <div className="space-y-10">
                  {roadmapPhases.map((phase, pIdx) => (
                    <div key={pIdx} className="space-y-4">
                      <div className="relative pl-10">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border border-2 border-background" />
                        <span className="text-mono text-[9px] text-foreground-subtle tracking-widest font-semibold">
                          {phase.phase}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {phase.nodes.map((node) => {
                          const isCompleted = node.status === "completed"
                          const isCurrent = node.status === "current"
                          
                          return (
                            <div 
                              key={node.id} 
                              className={`relative pl-10 transition-all`}
                            >
                              <div className="absolute left-3 top-4 z-10 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-background border border-border">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                ) : isCurrent ? (
                                  <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                                ) : (
                                  <Lock className="w-2 h-2 text-foreground-subtle/50" />
                                )}
                              </div>

                              <div className={`surface-card p-5 transition-all ${
                                isCurrent 
                                  ? "border-accent/40 bg-surface-2/40 shadow-sm" 
                                  : isCompleted
                                    ? "bg-surface-1/40 opacity-90"
                                    : "opacity-60"
                              }`}>
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-mono text-[9px] text-foreground-subtle font-semibold">
                                        {node.id}
                                      </span>
                                      <h3 className={`text-[13px] font-semibold ${
                                        isCompleted ? "text-foreground-muted" : "text-foreground"
                                      }`}>
                                        {node.name}
                                      </h3>
                                    </div>
                                    
                                    <div className="flex items-center gap-3.5 mt-1.5 text-mono text-[10px] text-foreground-subtle">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>Est: {node.time}</span>
                                      </div>
                                      {isCompleted && node.mastery && (
                                        <span className="text-success font-medium">Mastery: {node.mastery}%</span>
                                      )}
                                      {isCurrent && node.mastery !== undefined && (
                                        <span className="text-accent font-medium">Current progress: {node.mastery}%</span>
                                      )}
                                    </div>
                                  </div>

                                  {!isCompleted && !isCurrent ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-2 border border-border/60 text-mono text-[9px] text-foreground-subtle self-start">
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>LOCKED</span>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <Link href="/dashboard/quiz">
                                        <button className="flex items-center gap-1 border border-border hover:bg-surface-2 text-foreground-muted hover:text-foreground text-mono text-[9px] px-2 py-1 rounded transition-colors font-medium">
                                          <Target className="w-3 h-3" />
                                          QUIZ
                                        </button>
                                      </Link>
                                      <Link href="/dashboard/notes">
                                        <button className="flex items-center gap-1 border border-border hover:bg-surface-2 text-foreground-muted hover:text-foreground text-mono text-[9px] px-2 py-1 rounded transition-colors font-medium">
                                          <FileText className="w-3 h-3" />
                                          NOTES
                                        </button>
                                      </Link>
                                    </div>
                                  )}
                                </div>

                                {isCurrent && node.mastery !== undefined && (
                                  <div className="h-0.5 w-full bg-surface-3 rounded-full overflow-hidden mt-3">
                                    <div 
                                      className="h-full bg-accent transition-all duration-300"
                                      style={{ width: `${node.mastery}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
