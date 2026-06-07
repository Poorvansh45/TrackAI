"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Zap, CheckCircle2, Clock } from "lucide-react"

interface Mission {
  id: number
  name: string
  time: string
  xp: number
  status: "done" | "active" | "pending"
}

export function DailyMissions() {
  const [missions, setMissions] = useState<Mission[]>([
    { id: 1, name: "Loading missions...", time: "--", xp: 0, status: "pending" }
  ])

  useEffect(() => {
    const saved = localStorage.getItem("generatedRoadmap")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.roadmap_result?.phases) {
          const phases = parsed.roadmap_result.phases
          
          if (phases.length > 0) {
            const firstPhase = phases[0]
            const newMissions: Mission[] = []
            
            // Generate missions from the first few topics
            if (firstPhase.topics && firstPhase.topics.length > 0) {
              firstPhase.topics.slice(0, 4).forEach((topic: string, i: number) => {
                newMissions.push({
                  id: i + 1,
                  name: `Study: ${topic}`,
                  time: "30 min",
                  xp: 100,
                  status: i === 0 ? "active" : "pending" // First one active, rest pending
                })
              })
            }
            
            if (newMissions.length > 0) {
              setMissions(newMissions)
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse roadmap", e)
      }
    }
  }, [])

  const completedCount = missions.filter((m) => m.status === "done").length

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
            {completedCount} of {missions.length} completed
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-2 border border-border">
          <Zap className="w-3 h-3 text-warning" />
          <span className="text-mono text-[9px] text-warning font-medium">Streak active</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {missions.map((mission) => {
          const isDone = mission.status === "done"
          const isActive = mission.status === "active"

          return (
            <div
              key={mission.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md border transition-all ${
                isActive 
                  ? "bg-surface-2 border-accent/20" 
                  : "bg-surface-1/40 border-transparent hover:bg-surface-1"
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              ) : isActive ? (
                <div className="w-4 h-4 rounded-full border-2 border-accent flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] truncate block ${isDone ? "text-foreground-subtle line-through" : "text-foreground"}`}>
                  {mission.name}
                </span>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0 text-mono text-[9px]">
                <div className="flex items-center gap-0.5 text-foreground-subtle">
                  <Clock className="w-3 h-3" />
                  <span>{mission.time}</span>
                </div>
                <span className="text-accent">+{mission.xp} XP</span>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
