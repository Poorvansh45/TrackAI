"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Flame, Zap } from "lucide-react"
import { useRoadmapProgress } from "@/lib/roadmap-state"

interface WelcomeHeaderProps {
  hideStreak?: boolean
}

export function WelcomeHeader({ hideStreak = false }: WelcomeHeaderProps) {
  const [userName, setUserName] = useState("Learner")
  const { data } = useRoadmapProgress()

  // Total XP = sum of xp_earned across all completed topics, from the
  // backend roadmap_progress collection (single source of truth).
  const totalXP = data
    ? data.phases
        .flatMap((p) => p.topics)
        .reduce((sum, t) => sum + (t.status === "completed" ? t.xp_earned : 0), 0)
    : 0

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        const name = user.first_name || user.name || user.username || "Learner"
        setUserName(name)
      }
    } catch {}
  }, [])

  const greetingHour = new Date().getHours()
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening"

  const currentDate = new Date()
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5 mb-2"
    >
      <div className="min-w-0">
        <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
          {greeting}, <span className="text-accent">{userName}</span>
        </h1>
        <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider">
          SYSTEM TIMESTAMP: {currentDate}
        </p>
      </div>

      {/* Streak + XP badges — top right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {!hideStreak && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-1 border border-border">
            <Flame className="w-3.5 h-3.5 text-warning" />
            <span className="text-mono text-[11px] font-bold text-foreground">7D STREAK</span>
          </div>
        )}
        <motion.div
          key={totalXP}
          initial={{ scale: totalXP > 0 ? 1.1 : 1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-accent/10 border border-accent/25"
        >
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span className="text-mono text-[11px] font-bold text-accent">
            {totalXP.toLocaleString()} XP
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}
