"use client"

import { motion } from "framer-motion"
import { Target } from "lucide-react"
import { ForecastData } from "@/lib/analytics-engine"
import { format } from "date-fns"

interface ForecastSectionProps {
  forecast: ForecastData
}

export function ForecastSection({ forecast }: ForecastSectionProps) {
  const isComplete = forecast.remainingTopics === 0

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="surface-card p-5 space-y-4"
    >
      <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
        <Target className="w-4 h-4 text-accent" />
        <span>Forecast</span>
      </div>

      <div className="bg-surface-2/40 border border-border/40 rounded-lg p-4 space-y-4">
        {isComplete ? (
          <div className="text-center py-4">
            <div className="inline-block px-3 py-1 bg-success/10 text-success border border-success/20 rounded-full text-[11px] font-semibold mb-2">
              Track Complete
            </div>
            <p className="text-[12px] text-foreground-subtle">
              You have completed all topics in your current roadmap!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
              <div>
                <span className="text-mono text-[9px] uppercase text-foreground-subtle block mb-1">Target Date</span>
                <span className="text-[13px] font-semibold text-accent">
                  {forecast.estimatedCompletionDate 
                    ? format(forecast.estimatedCompletionDate, "MMM d, yyyy") 
                    : "Need more data"}
                </span>
              </div>
              <div>
                <span className="text-mono text-[9px] uppercase text-foreground-subtle block mb-1">Forecast Status</span>
                <span className={`text-[13px] font-semibold capitalize ${
                  forecast.pace === "fast" ? "text-success" :
                  forecast.pace === "steady" ? "text-foreground" :
                  "text-warning"
                }`}>
                  {forecast.pace}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-foreground-subtle leading-relaxed">
                {forecast.estimatedCompletionDate ? (
                  <>
                    At your current learning pace, you are on track to complete the remaining <span className="text-foreground font-semibold">{forecast.remainingTopics}</span> topics in approximately <span className="text-foreground font-semibold">{forecast.weeksRemaining}</span> weeks.
                  </>
                ) : (
                  <>
                    Complete at least one topic to generate a completion forecast for the remaining <span className="text-foreground font-semibold">{forecast.remainingTopics}</span> topics.
                  </>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
