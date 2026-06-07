"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BarChart3, TrendingUp } from "lucide-react"

export function ProgressAnalytics() {
  const [analytics, setAnalytics] = useState({
    targetHours: 14.0,
    totalHours: 0,
    avgHours: 0,
    verifiedCount: 0,
    totalTopics: 12,
    weeklyData: [
      { day: "Mon", hours: 0, active: false },
      { day: "Tue", hours: 0, active: false },
      { day: "Wed", hours: 0, active: false },
      { day: "Thu", hours: 0, active: false },
      { day: "Fri", hours: 0, active: false },
      { day: "Sat", hours: 0, active: false },
      { day: "Sun", hours: 0, active: false },
    ]
  })

  useEffect(() => {
    const saved = localStorage.getItem("generatedRoadmap")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        let totalTopics = 0
        let targetHours = 14.0 // Default
        
        // Calculate total topics from roadmap
        if (parsed?.roadmap_result?.phases) {
          parsed.roadmap_result.phases.forEach((p: any) => {
            if (p.topics) totalTopics += p.topics.length
          })
        }
        
        // Get target hours from timeline
        if (parsed?.timeline_result?.weekly_schedule?.length > 0) {
          targetHours = parsed.timeline_result.weekly_schedule[0].expected_hours || 14.0
        }

        // Just display empty state for now since we don't have real analytics tracking
        setAnalytics({
          targetHours,
          totalHours: 0,
          avgHours: 0,
          verifiedCount: 0,
          totalTopics: totalTopics > 0 ? totalTopics : 12,
          weeklyData: [
            { day: "Mon", hours: 0, active: false },
            { day: "Tue", hours: 0, active: false },
            { day: "Wed", hours: 0, active: false },
            { day: "Thu", hours: 0, active: false },
            { day: "Fri", hours: 0, active: false },
            { day: "Sat", hours: 0, active: false },
            { day: "Sun", hours: 0, active: false },
          ]
        })
      } catch (e) {
        console.error("Failed to parse roadmap", e)
      }
    }
  }, [])

  const maxHours = Math.max(...analytics.weeklyData.map((d) => d.hours), 1) // Prevent division by zero

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
            <p className="text-mono text-[9px] text-foreground-subtle">Weekly target: {analytics.targetHours.toFixed(1)}h</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-success text-mono text-[10px]">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+0.0% vs last week</span>
        </div>
      </div>

      {/* Stats row with Berkeley Mono values */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
          <div className="text-mono text-[9px] text-foreground-subtle mb-0.5 uppercase">TOTAL TIME</div>
          <div className="text-mono text-base font-semibold text-foreground">{analytics.totalHours.toFixed(1)}h</div>
        </div>
        <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
          <div className="text-mono text-[9px] text-foreground-subtle mb-0.5 uppercase">DAILY AVG</div>
          <div className="text-mono text-base font-semibold text-foreground">{analytics.avgHours.toFixed(1)}h</div>
        </div>
        <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg text-left">
          <div className="text-mono text-[9px] text-foreground-subtle mb-0.5 uppercase">VERIFIED</div>
          <div className="text-mono text-base font-semibold text-foreground">{analytics.verifiedCount} / {analytics.totalTopics}</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="h-28 bg-surface-2/20 border border-border/40 rounded-lg p-3 flex items-end justify-between gap-2.5">
        {analytics.weeklyData.map((d, index) => (
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
