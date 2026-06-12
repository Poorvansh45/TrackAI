"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Flame, Zap } from "lucide-react"

function readTotalXP(): number {
  try {
    let xp = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("topic_progress_")) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const arr: string[] = JSON.parse(raw)
          if (arr.length >= 5) xp += 100
        }
      }
    }
    return xp
  } catch {
    return 0
  }
}

export function WelcomeHeader() {
  const [userName, setUserName] = useState("Learner")
  const [totalXP, setTotalXP] = useState(0)

  useEffect(() => {
    // Read user name
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        const name = user.first_name || user.name || user.username || "Learner"
        setUserName(name)
      }
    } catch {}

    // Read XP
    setTotalXP(readTotalXP())

    // Sync XP when topics complete
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("topic_progress_") || e.key === "generatedRoadmap") {
        setTotalXP(readTotalXP())
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
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
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-1 border border-border">
          <Flame className="w-3.5 h-3.5 text-warning" />
          <span className="text-mono text-[11px] font-bold text-foreground">7D STREAK</span>
        </div>
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
