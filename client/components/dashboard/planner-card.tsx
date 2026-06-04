"use client"

import { motion } from "framer-motion"
import { Calendar, Clock, CheckCircle2 } from "lucide-react"

const todayPlans = [
  { id: 1, time: "09:00 - 10:00", subject: "RAG Pipeline Setup", done: true },
  { id: 2, time: "13:00 - 13:30", subject: "Evaluation & Benchmarks", active: true },
  { id: 3, time: "16:00 - 17:00", subject: "Chunking review session", done: false },
]

export function PlannerCard() {
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
        {todayPlans.map((plan) => (
          <div 
            key={plan.id}
            className={`flex items-center gap-3 p-2.5 rounded border transition-all ${
              plan.active 
                ? "bg-surface-2 border-accent/20" 
                : "bg-surface-1/40 border-transparent"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
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
