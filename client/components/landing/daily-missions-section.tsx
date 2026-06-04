"use client"

import { motion } from "framer-motion"
import { Zap, CheckCircle2, Clock, Flame } from "lucide-react"

const missions = [
  { name: "Complete RAG lesson 3", time: "15 min", xp: 75, status: "done" as const },
  { name: "Pass quiz: Vector Embeddings", time: "10 min", xp: 100, status: "done" as const },
  { name: "Review weak concept: Chunking", time: "8 min", xp: 50, status: "active" as const },
  { name: "30 min focused study session", time: "30 min", xp: 150, status: "pending" as const },
  { name: "Generate notes for RAG Systems", time: "5 min", xp: 40, status: "pending" as const },
]

export function DailyMissionsSection() {
  return (
    <section className="py-20">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — Missions Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="surface-card overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-warning-muted flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-warning" />
                  </div>
                  <div>
                    <div className="text-[13px] text-emphasis text-foreground">Today&apos;s Missions</div>
                    <div className="text-mono text-[10px] text-foreground-subtle">2 of 5 completed · 415 XP available</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-2 border border-border">
                  <Flame className="w-3 h-3 text-warning" />
                  <span className="text-mono text-[10px] text-warning">7d streak</span>
                </div>
              </div>

              {/* Missions list */}
              <div className="p-4 space-y-1">
                {missions.map((mission, i) => (
                  <motion.div
                    key={mission.name}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      mission.status === "active" ? "bg-surface-2 border border-accent/20" : "hover:bg-surface-1"
                    }`}
                  >
                    {/* Status */}
                    {mission.status === "done" ? (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    ) : mission.status === "active" ? (
                      <div className="w-4 h-4 rounded-full border-2 border-accent flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border flex-shrink-0" />
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <span className={`text-[13px] ${
                        mission.status === "done" ? "text-foreground-subtle line-through" : "text-foreground"
                      }`}>
                        {mission.name}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-foreground-subtle" />
                        <span className="text-mono text-[10px] text-foreground-subtle">{mission.time}</span>
                      </div>
                      <span className="text-mono text-[10px] text-accent">+{mission.xp}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — Content */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">
                Section 05
              </span>
            </div>

            <h2 className="text-display text-3xl sm:text-4xl mb-3 leading-[1.15] max-w-md">
              Daily Missions Keep You{" "}
              <span className="text-accent">Consistent</span>
            </h2>

            <p className="text-foreground-muted text-[15px] leading-relaxed mb-8 max-w-md">
              Bite-sized tasks with clear time estimates. Complete missions to earn XP, 
              maintain your streak, and build unstoppable learning momentum.
            </p>

            <div className="space-y-3">
              {[
                "Time-boxed tasks that fit your schedule",
                "XP rewards tied to real progress",
                "Streak system for consistency",
                "Smart prioritization based on weak areas",
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-[14px] text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
