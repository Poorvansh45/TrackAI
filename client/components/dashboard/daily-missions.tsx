"use client"

import { motion } from "framer-motion"
import { Zap, CheckCircle2, Clock, Target } from "lucide-react"
import { useActiveTopic } from "@/hooks/use-active-topic"
import { useRouter } from "next/navigation"

interface Mission {
  id: number
  name: string
  time: string
  xp: number
  status: "done" | "active" | "pending"
  slug?: string
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function isTopicDone(topicName: string, phase: any): boolean {
  if (phase._nodeStatus?.[topicName] === "completed") return true
  try {
    const slug = toSlug(topicName)
    const raw = localStorage.getItem(`topic_progress_${slug}`)
    if (raw) return JSON.parse(raw).length >= 5
  } catch {}
  return false
}

export function DailyMissions() {
  const router = useRouter()
  const { activeTopic } = useActiveTopic()

  // Build missions from roadmap around the current active topic
  const missions: Mission[] = []

  try {
    const raw = localStorage.getItem("generatedRoadmap")
    if (raw) {
      const parsed = JSON.parse(raw)
      const phases: any[] = parsed?.roadmap_result?.phases || []

      // Flatten all topics
      const allTopics: Array<{ name: string; phase: any }> = []
      for (const phase of phases) {
        for (const topic of phase.topics || []) {
          allTopics.push({ name: topic, phase })
        }
      }

      // Find active index
      const activeIdx = activeTopic
        ? allTopics.findIndex(({ name }) => toSlug(name) === activeTopic.slug)
        : 0

      // Show: 1 completed before active (if exists) + active + 2 upcoming
      const start = Math.max(0, activeIdx - 1)
      const window = allTopics.slice(start, start + 4)

      window.forEach(({ name, phase }, i) => {
        const slug = toSlug(name)
        const done = isTopicDone(name, phase)
        const isActive = slug === activeTopic?.slug

        let status: "done" | "active" | "pending" = "pending"
        if (done) status = "done"
        else if (isActive) status = "active"

        missions.push({
          id: i + 1,
          name: `Study: ${name}`,
          time: "~1.5h",
          xp: 100,
          status,
          slug,
        })
      })
    }
  } catch {}

  // If no roadmap data yet, show loading placeholder
  const displayMissions =
    missions.length > 0
      ? missions
      : [{ id: 1, name: "Loading missions...", time: "--", xp: 0, status: "pending" as const }]

  const completedCount = displayMissions.filter((m) => m.status === "done").length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">Today&apos;s Missions</h3>
          <p className="text-mono text-[9px] text-foreground-subtle mt-0.5">
            {completedCount} of {displayMissions.length} completed
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-2 border border-border">
          <Zap className="w-3 h-3 text-warning" />
          <span className="text-mono text-[9px] text-warning font-medium">Streak active</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {displayMissions.map((mission) => {
          const isDone = mission.status === "done"
          const isActive = mission.status === "active"

          return (
            <div
              key={mission.id}
              onClick={() => {
                if (mission.slug && !isDone) router.push(`/topic/${mission.slug}`)
              }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-all ${
                isActive
                  ? "bg-surface-2 border-accent/20 cursor-pointer hover:border-accent/40"
                  : isDone
                  ? "bg-surface-1/20 border-transparent opacity-60"
                  : "bg-surface-1/40 border-transparent"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              ) : isActive ? (
                <div className="w-4 h-4 rounded-full border-2 border-accent flex-shrink-0 animate-pulse" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <span
                  className={`text-[12px] truncate block ${
                    isDone ? "text-foreground-subtle line-through" : "text-foreground"
                  }`}
                >
                  {mission.name}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 text-mono text-[9px]">
                <div className="flex items-center gap-0.5 text-foreground-subtle">
                  <Clock className="w-3 h-3" />
                  <span>{mission.time}</span>
                </div>
                <span className={isDone ? "text-success" : "text-accent"}>+{mission.xp} XP</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Active topic CTA */}
      {activeTopic && (
        <button
          onClick={() => router.push(`/topic/${activeTopic.slug}`)}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-md border border-accent/25 bg-accent/8 hover:bg-accent/15 text-mono text-[10px] text-accent font-semibold transition-all"
        >
          <Target className="w-3.5 h-3.5" />
          Open: {activeTopic.title}
        </button>
      )}
    </motion.div>
  )
}
