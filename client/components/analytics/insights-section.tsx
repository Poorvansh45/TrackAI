"use client"

import { motion } from "framer-motion"
import { Lightbulb, Info, CheckCircle, AlertTriangle } from "lucide-react"
import { Insight } from "@/lib/analytics-engine"

interface InsightsSectionProps {
  insights: Insight[]
}

export function InsightsSection({ insights }: InsightsSectionProps) {
  if (insights.length === 0) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="surface-card p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
        <Lightbulb className="w-4 h-4 text-accent" />
        <span>Learning Insights</span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => {
          let Icon = Info
          let colorClass = "text-foreground-subtle bg-surface-2/40 border-border/40"
          let iconClass = "text-foreground-muted"

          if (insight.type === "positive") {
            Icon = CheckCircle
            colorClass = "bg-success/5 border-success/20"
            iconClass = "text-success"
          } else if (insight.type === "warning") {
            Icon = AlertTriangle
            colorClass = "bg-warning/5 border-warning/20"
            iconClass = "text-warning"
          }

          return (
            <div 
              key={idx} 
              className={`flex items-start gap-3 p-3 rounded-lg border ${colorClass}`}
            >
              <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconClass}`} />
              <p className="text-[11.5px] text-foreground leading-relaxed">
                {insight.message}
              </p>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
