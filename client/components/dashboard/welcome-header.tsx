"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Flame } from "lucide-react"

interface WelcomeHeaderProps {
  hideStreak?: boolean
}

export function WelcomeHeader({ hideStreak = false }: WelcomeHeaderProps) {
  const [userName, setUserName] = useState("Learner")

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        // Check for common name fields: first_name, name, username, etc.
        const name = user.first_name || user.name || user.username || "Learner"
        setUserName(name)
      }
    } catch (e) {
      console.error("Failed to parse user profile", e)
    }
  }, [])

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5 mb-2"
    >
      <div className="min-w-0">
        <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
          Good morning, <span className="text-accent">{userName}</span>
        </h1>
        <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider">
          SYSTEM TIMESTAMP: {currentDate}
        </p>
      </div>

      {!hideStreak && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-1 border border-border">
            <Flame className="w-3.5 h-3.5 text-warning" />
            <span className="text-mono text-[11px] font-bold text-foreground">7D STREAK</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}
