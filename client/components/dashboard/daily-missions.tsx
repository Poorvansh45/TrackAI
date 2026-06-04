"use client"

import { motion } from "framer-motion"
import { Zap, CheckCircle2, Clock } from "lucide-react"

const missions = [
  { id: 1, name: "Complete RAG lesson 3", time: "15 min", xp: 75, status: "done" as const },
  { id: 2, name: "Pass quiz: Vector Embeddings", time: "10 min", xp: 100, status: "done" as const },
  { id: 3, name: "Review weak concept: Chunking", time: "8 min", xp: 50, status: "active" as const },
  { id: 4, name: "30 min focused study session", time: "30 min", xp: 150, status: "pending" as const },
]

export function DailyMissions() {
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
        {missions.map((mission, index) => {
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
                <span className={`text-[12px] ${isDone ? "text-foreground-subtle line-through" : "text-foreground"}`}>
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
