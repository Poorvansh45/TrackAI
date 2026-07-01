"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle2, Lock, ChevronRight, Play, Circle } from "lucide-react"
import Link from "next/link"
import { useRoadmapProgress, type BackendPhase } from "@/lib/roadmap-state"

interface Node {
  id: string
  name: string
  slug: string
  status: "completed" | "current" | "locked"
  xp: number
  progress?: number
  completedSubtopics: number
  totalSubtopics: number
}

export function RoadmapCard() {
  const router = useRouter()
  const { data, loading } = useRoadmapProgress()

  // ── Resolve the active phase ─────────────────────────────────────────────
  let activePhase: BackendPhase | null = null
  if (data) {
    activePhase =
      data.phases.find((p) => p.topics.some((t) => t.status === "active")) ??
      data.phases[data.phases.length - 1] ??
      null
  }

  const skillLabel = data?.skill
    ? activePhase
      ? `${data.skill} · ${activePhase.phase_title}`
      : `${data.skill} Track`
    : "Loading Track..."

  // ── Build node list from the active phase only ───────────────────────────
  const nodes: Node[] = []
  if (activePhase) {
    const phaseTopics = [...activePhase.topics].sort((a, b) => a.order - b.order)

    for (const topic of phaseTopics.slice(0, 5)) {
      nodes.push({
        id: `RD-${String(topic.order + 1).padStart(3, "0")}`,
        name: topic.topic_name,
        slug: topic.topic_id,
        status:
          topic.status === "completed" ? "completed" :
          topic.status === "active"    ? "current"   :
          "locked",
        xp: topic.status === "completed" ? topic.xp_earned : 100 * (topic.order + 1),
        progress:
          topic.status === "completed" ? 100 :
          topic.status === "active"    ? topic.progress_pct :
          undefined,
        completedSubtopics: topic.completed_subtopics.length,
        totalSubtopics: topic.total_subtopics || 5,
      })
    }
  }

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
        <div className="absolute left-3.5 top-2.5 bottom-2.5 w-[1px] bg-border/60" />

        <div className="space-y-2.5">
          {nodes.map((node) => {
            const isCurrent = node.status === "current"
            const isCompleted = node.status === "completed"
            const isLocked = node.status === "locked"

            return (
              <div
                key={node.id}
                className={`relative flex items-center gap-3.5 pl-8 pr-3 py-2.5 rounded-lg transition-all ${
                  isCurrent
                    ? "bg-surface-2/60 border border-accent/20"
                    : isCompleted
                    ? "bg-transparent border border-transparent"
                    : "bg-transparent border border-transparent opacity-60"
                }`}
              >
                {/* Node icon */}
                <div className="absolute left-1.5 z-10 w-4 h-4 rounded-full flex items-center justify-center bg-background border border-border">
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  ) : (
                    <Lock className="w-2.5 h-2.5 text-foreground-subtle/50" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row + status chip + XP */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4
                        className={`text-[12px] font-semibold truncate ${
                          isCompleted
                            ? "text-foreground-muted"
                            : isCurrent
                            ? "text-foreground"
                            : "text-foreground-subtle"
                        }`}
                      >
                        {node.name}
                      </h4>

                      {/* Status chip */}
                      {isCompleted && (
                        <span className="flex-shrink-0 text-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-success/10 border border-success/25 text-success">
                          Mastered
                        </span>
                      )}
                      {isCurrent && (
                        <span className="flex-shrink-0 text-mono text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isLocked && (
                        <span className="text-mono text-[9px] text-foreground-subtle">
                          +{node.xp} XP
                        </span>
                      )}
                      {isCurrent && node.slug && (
                        <button
                          onClick={() => router.push(`/topic/${node.slug}`)}
                          className="flex items-center gap-1 text-mono text-[9px] font-semibold text-accent bg-accent/10 border border-accent/30 hover:bg-accent/20 px-2 py-0.5 rounded transition-colors"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          Go
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Concept count + progress bar */}
                  {!isLocked && (
                    <div className="flex items-center gap-3">
                      {/* Concepts count pill */}
                      <span className="text-mono text-[9px] text-foreground-subtle flex-shrink-0">
                        {isCompleted ? (
                          <span className="text-success font-medium">
                            {node.totalSubtopics} / {node.totalSubtopics} Concepts
                          </span>
                        ) : (
                          `${node.completedSubtopics} / ${node.totalSubtopics} Concepts`
                        )}
                      </span>

                      {/* Progress bar */}
                      {node.progress !== undefined && (
                        <div className="flex-1 h-0.5 bg-surface-3 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${node.progress}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            style={{
                              background: isCompleted
                                ? "oklch(0.60 0.16 155)"
                                : "oklch(0.62 0.20 275)",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Locked label */}
                  {isLocked && (
                    <span className="text-mono text-[9px] text-foreground-subtle/50">
                      Complete active topic to unlock
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {!loading && nodes.length === 0 && (
            <p className="text-[12px] text-foreground-subtle py-4 text-center">
              No roadmap data yet — complete onboarding to generate your track.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
