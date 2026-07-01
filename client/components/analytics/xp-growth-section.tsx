"use client"

import { motion } from "framer-motion"
import { Zap } from "lucide-react"
import { XPWeek } from "@/lib/analytics-engine"

interface XPGrowthProps {
  timeline: XPWeek[]
}

export function XPGrowthSection({ timeline }: XPGrowthProps) {
  const maxXP = Math.max(...timeline.map(t => t.xp), 100) // minimum scale of 100

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="surface-card p-5 space-y-4 h-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
          <Zap className="w-4 h-4 text-accent" />
          <span>XP Growth</span>
        </div>
      </div>

      <div className="h-40 bg-surface-2/30 border border-border/40 rounded-lg p-4 flex items-end justify-between gap-3 relative">
        {/* Y-Axis scale markers */}
        <div className="absolute left-4 top-4 bottom-7 flex flex-col justify-between text-mono text-[8px] text-foreground-subtle/50 z-0">
          <span>{maxXP}</span>
          <span>{Math.round(maxXP / 2)}</span>
          <span>0</span>
        </div>
        
        {/* Horizontal grid lines */}
        <div className="absolute left-10 right-4 top-4 bottom-7 flex flex-col justify-between z-0 pointer-events-none">
          <div className="w-full border-t border-border/30 border-dashed h-px" />
          <div className="w-full border-t border-border/30 border-dashed h-px" />
          <div className="w-full border-t border-border/30 border-dashed h-px" />
        </div>

        {/* Bars */}
        <div className="flex-1 flex justify-between ml-8 h-full items-end z-10">
          {timeline.map((item, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="w-full relative flex items-end justify-center h-full">
                
                {/* Tooltip */}
                <div className="absolute -top-8 bg-surface-3 border border-border text-foreground text-mono text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {item.xp} XP
                </div>
                
                <motion.div
                  className="w-full max-w-[28px] rounded-t-[4px] relative"
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.xp / maxXP) * 100}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 * i }}
                  style={{ 
                    // Gradient fill matching accent color
                    background: "linear-gradient(180deg, oklch(0.62 0.20 275 / 0.9) 0%, oklch(0.62 0.20 275 / 0.3) 100%)",
                    minHeight: item.xp > 0 ? "4px" : "0" 
                  }}
                >
                  {/* Top cap reflection */}
                  {item.xp > 0 && <div className="absolute top-0 left-0 right-0 h-px bg-white/20 rounded-t-[4px]" />}
                </motion.div>
              </div>
              <span className="text-mono text-[8px] text-foreground-subtle">{item.week}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
