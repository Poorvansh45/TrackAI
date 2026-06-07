"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Calendar, Clock, CheckCircle2 } from "lucide-react"

interface Plan {
  id: number
  time: string
  subject: string
  done: boolean
  active?: boolean
}

export function PlannerCard() {
  const [plans, setPlans] = useState<Plan[]>([
    { id: 1, time: "--:--", subject: "Loading plan...", done: false }
  ])

  useEffect(() => {
    const saved = localStorage.getItem("generatedRoadmap")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.timeline_result?.weekly_schedule) {
          const schedule = parsed.timeline_result.weekly_schedule
          
          if (schedule.length > 0) {
            const firstWeek = schedule[0]
            const newPlans: Plan[] = []
            
            // Map milestones to today's plan
            if (firstWeek.milestones && firstWeek.milestones.length > 0) {
              const times = ["09:00 - 10:30", "11:00 - 12:30", "14:00 - 15:30", "16:00 - 17:30"]
              
              firstWeek.milestones.slice(0, 3).forEach((milestone: string, i: number) => {
                newPlans.push({
                  id: i + 1,
                  time: times[i] || "18:00 - 19:30",
                  subject: milestone,
                  done: false,
                  active: i === 0 // Make first one active
                })
              })
            }
            
            if (newPlans.length > 0) {
              setPlans(newPlans)
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse roadmap", e)
      }
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Today&apos;s Plan</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Block schedule</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {plans.map((plan) => (
          <div 
            key={plan.id}
            className={`flex items-center gap-3 p-2.5 rounded border transition-all ${
              plan.active 
                ? "bg-surface-2 border-accent/20" 
                : "bg-surface-1/40 border-transparent"
            }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              plan.done 
                ? "bg-success" 
                : plan.active 
                  ? "bg-accent animate-pulse" 
                  : "bg-foreground-subtle/30"
            }`} />
            
            <div className="flex-1 min-w-0">
              <span className={`text-[12px] font-medium block truncate ${
                plan.done ? "text-foreground-subtle line-through" : "text-foreground"
              }`}>
                {plan.subject}
              </span>
            </div>

            <div className="flex items-center gap-1 text-mono text-[9px] text-foreground-subtle flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>{plan.time.split(" ")[0]}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
