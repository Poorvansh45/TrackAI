"use client"

import { motion } from "framer-motion"
import { Flame, Award, Calendar } from "lucide-react"

const weekDays = ["M", "T", "W", "T", "F", "S", "S"]
const streakData = [true, true, true, true, true, true, true]

export function StreakCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-warning-muted flex items-center justify-center text-warning">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Active Streak</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">7 days consistent</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-mono text-base font-semibold text-foreground">4,250</div>
          <div className="text-mono text-[9px] text-foreground-subtle">TOTAL XP</div>
        </div>
      </div>

      {/* Week view */}
      <div className="flex justify-between gap-1.5 mb-4">
        {weekDays.map((day, index) => (
          <div key={index} className="flex-1 text-center">
            <span className="text-mono text-[9px] text-foreground-subtle block mb-1.5">{day}</span>
            <div
              className={`aspect-square rounded-md flex items-center justify-center border transition-all ${
                streakData[index]
                  ? "bg-accent/15 border-accent text-accent"
                  : "bg-surface-2 border-border/60 text-foreground-subtle/40"
              }`}
            >
              {streakData[index] ? (
                <Flame className="w-3.5 h-3.5 fill-current" />
              ) : (
                <span className="w-1 h-1 rounded-full bg-current" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Streak milestones */}
      <div className="flex items-center gap-2 pt-3.5 border-t border-border/40 text-mono text-[10px] text-foreground-subtle">
        <Award className="w-3.5 h-3.5 text-accent" />
        <span>
          Next Milestone: <span className="text-foreground font-semibold">10-day streak</span>
        </span>
      </div>
    </motion.div>
  )
}
