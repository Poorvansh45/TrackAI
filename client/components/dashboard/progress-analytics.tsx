"use client"

import { motion } from "framer-motion"
import { BarChart3, TrendingUp, Clock, Target, Calendar } from "lucide-react"

const weeklyData = [
  { day: "Mon", hours: 2.5, active: false },
  { day: "Tue", hours: 3.0, active: true },
  { day: "Wed", hours: 2.0, active: false },
  { day: "Thu", hours: 4.0, active: true },
  { day: "Fri", hours: 3.5, active: false },
  { day: "Sat", hours: 1.5, active: false },
  { day: "Sun", hours: 2.0, active: false },
]

const maxHours = Math.max(...weeklyData.map((d) => d.hours))

export function ProgressAnalytics() {
  const totalHours = weeklyData.reduce((acc, d) => acc + d.hours, 0)
  const avgHours = (totalHours / 7).toFixed(1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Progress Analytics</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Weekly target: 14.0h</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-success text-mono text-[10px]">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+15.4% vs last week</span>
        </div>
      </div>

      {/* Stats row with Berkeley Mono values */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
          <div className="text-mono text-[9px] text-foreground-subtle mb-0.5 uppercase">TOTAL TIME</div>
          <div className="text-mono text-base font-semibold text-foreground">{totalHours.toFixed(1)}h</div>
        </div>
        <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
          <div className="text-mono text-[9px] text-foreground-subtle mb-0.5 uppercase">DAILY AVG</div>
          <div className="text-mono text-base font-semibold text-foreground">{avgHours}h</div>
        </div>
        <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
          <div className="text-mono text-[9px] text-foreground-subtle mb-0.5 uppercase">VERIFIED</div>
          <div className="text-mono text-base font-semibold text-foreground">8 / 12</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-28 bg-surface-2/20 border border-border/40 rounded-lg p-3 flex items-end justify-between gap-2.5">
        {weeklyData.map((d, index) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="w-full relative group">
              <div
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  d.active ? "bg-accent" : "bg-foreground-subtle/30 group-hover:bg-foreground-subtle/50"
                }`}
                style={{ height: `${(d.hours / maxHours) * 60}px` }}
              />
            </div>
            <span className="text-mono text-[9px] text-foreground-subtle">{d.day}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
