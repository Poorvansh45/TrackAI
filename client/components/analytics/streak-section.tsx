"use client"

import { motion } from "framer-motion"
import { Calendar, Flame } from "lucide-react"
import { StreakData } from "@/lib/analytics-engine"
import { format, subDays } from "date-fns"

interface StreakSectionProps {
  streak: StreakData
}

export function StreakSection({ streak }: StreakSectionProps) {
  // Generate a mini 14-day history for the grid
  const today = new Date()
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = subDays(today, i)
    const dateStr = format(d, "yyyy-MM-dd")
    days.push({
      dateStr,
      dayLabel: format(d, "EEEE").charAt(0), // 'M', 'T', 'W' etc
      isActive: streak.activeDates.has(dateStr),
      isToday: i === 0,
    })
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="surface-card p-5 space-y-5"
    >
      <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
        <Calendar className="w-4 h-4 text-accent" />
        <span>Study Consistency</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Current Streak */}
        <div className="bg-surface-2/40 border border-border/40 rounded-lg p-3">
          <div className="text-mono text-[9px] uppercase text-foreground-subtle mb-1.5 flex items-center gap-1">
            <Flame className="w-3 h-3 text-warning" /> Current Streak
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-display text-2xl font-semibold text-foreground">{streak.currentStreak}</span>
            <span className="text-mono text-[9px] text-foreground-subtle">days</span>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-surface-2/40 border border-border/40 rounded-lg p-3">
          <div className="text-mono text-[9px] uppercase text-foreground-subtle mb-1.5">Longest Streak</div>
          <div className="flex items-baseline gap-1">
            <span className="text-display text-2xl font-semibold text-foreground">{streak.longestStreak}</span>
            <span className="text-mono text-[9px] text-foreground-subtle">days</span>
          </div>
        </div>
      </div>

      {/* Activity Map (Last 14 days) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-mono text-[9px] text-foreground-subtle uppercase">Last 14 Days</span>
        </div>
        <div className="flex justify-between items-end gap-1">
          {days.map((day, i) => (
            <div key={day.dateStr} className="flex flex-col items-center gap-1.5 group relative flex-1">
              
              {/* Tooltip */}
              <div className={`absolute -top-7 bg-surface-3 border border-border text-foreground text-mono text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 ${
                i === 0 ? "left-0" : i === 13 ? "right-0" : "left-1/2 -translate-x-1/2"
              }`}>
                {format(new Date(day.dateStr), "MMM d")}
              </div>

              <div 
                className={`w-full aspect-square max-w-[16px] sm:max-w-[20px] rounded-sm transition-colors ${
                  day.isActive 
                    ? "bg-accent shadow-[0_0_8px_oklch(0.62_0.20_275/0.4)]" 
                    : "bg-surface-3 border border-border/40"
                } ${day.isToday && !day.isActive ? "border-accent/50" : ""}`} 
              />
              <span className={`text-mono text-[8px] ${day.isToday ? "text-accent font-bold" : "text-foreground-subtle"}`}>
                {day.dayLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
