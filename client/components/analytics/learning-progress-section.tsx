"use client"

import { motion } from "framer-motion"
import { TrendingUp, CheckCircle2, Circle } from "lucide-react"
import { VelocityData, PhasePoint } from "@/lib/analytics-engine"

interface LearningProgressProps {
  velocity: VelocityData
  phaseTimeline: PhasePoint[]
}

export function LearningProgressSection({ velocity, phaseTimeline }: LearningProgressProps) {
  // Find max count for scaling the velocity chart
  const maxVelocity = Math.max(...velocity.history.map(h => h.count), 1)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="surface-card p-5 space-y-6"
    >
      <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
        <TrendingUp className="w-4 h-4 text-accent" />
        <span>Learning Progress & Velocity</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Phase Timeline */}
        <div>
          <h4 className="text-mono text-[9px] text-foreground-subtle uppercase mb-4">Phase Completion</h4>
          <div className="space-y-4 relative">
            {/* Connecting line */}
            <div className="absolute left-[7px] top-2 bottom-4 w-px bg-border/60 z-0" />
            
            {phaseTimeline.map((phase, idx) => {
              const isCompleted = phase.progressPct === 100
              
              return (
                <div key={idx} className="relative z-10 flex gap-3 group">
                  <div className="mt-0.5 flex-shrink-0 bg-surface-1">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : phase.isActive ? (
                      <div className="w-4 h-4 rounded-full border-2 border-accent flex items-center justify-center bg-surface-1 shadow-[0_0_8px_oklch(0.62_0.20_275/0.4)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      </div>
                    ) : (
                      <Circle className="w-4 h-4 text-border" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[12px] font-medium transition-colors ${phase.isActive ? "text-foreground" : isCompleted ? "text-foreground" : "text-foreground-muted group-hover:text-foreground"}`}>
                        {phase.phaseTitle}
                      </span>
                      <span className="text-mono text-[9px] text-foreground-subtle ml-2 whitespace-nowrap mt-0.5">
                        {phase.completedTopics} / {phase.totalTopics}
                      </span>
                    </div>
                    {/* Micro Progress Bar */}
                    <div className="h-1 bg-surface-3 rounded-full overflow-hidden w-full max-w-[120px]">
                      <motion.div
                        className="h-full rounded-full transition-all duration-1000"
                        initial={{ width: 0 }}
                        animate={{ width: `${phase.progressPct}%` }}
                        style={{ background: isCompleted ? "var(--success)" : "var(--accent)" }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Velocity Chart */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-mono text-[9px] text-foreground-subtle uppercase">Topics Completed (7 Days)</h4>
            <div className="bg-accent/10 text-accent text-mono text-[9px] px-2 py-0.5 rounded font-semibold border border-accent/20">
              {velocity.topicsPerWeek} / wk avg
            </div>
          </div>
          
          <div className="h-32 bg-surface-2/30 border border-border/40 rounded-lg p-4 flex items-end justify-between gap-2">
            {velocity.history.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full relative flex items-end justify-center h-full">
                  {/* Tooltip (CSS only) */}
                  <div className="absolute -top-8 bg-surface-3 border border-border text-foreground text-mono text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    {h.count}
                  </div>
                  
                  {/* Bar */}
                  <motion.div
                    className="w-full max-w-[24px] bg-accent/80 rounded-t-sm group-hover:bg-accent transition-colors relative z-10"
                    initial={{ height: 0 }}
                    animate={{ height: `${(h.count / maxVelocity) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 * i }}
                    style={{ minHeight: h.count > 0 ? "4px" : "0" }}
                  />
                  {/* Background Track */}
                  <div className="absolute inset-0 bg-surface-2/20 rounded-t-sm w-full max-w-[24px] mx-auto z-0" />
                </div>
                <span className="text-mono text-[8px] text-foreground-subtle">{h.week}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
