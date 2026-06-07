"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Play, Clock, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ContinueLearning() {
  const [currentLesson, setCurrentLesson] = useState({
    title: "Loading...",
    module: "Loading Track...",
    progress: 0,
    timeLeft: "0 min left",
    completedSections: 0,
    totalSections: 0,
  })

  useEffect(() => {
    const saved = localStorage.getItem("generatedRoadmap")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed?.roadmap_result?.phases) {
          const phases = parsed.roadmap_result.phases
          
          let title = "Ready to start"
          let moduleLabel = parsed.skill ? `${parsed.skill} Track` : "Your Track"
          let totalSecs = 0

          // Just grab the first topic of the first phase for now
          if (phases.length > 0) {
            const firstPhase = phases[0]
            moduleLabel = `${parsed.skill ? parsed.skill + ' · ' : ''}Phase ${firstPhase.phase_number || 1}`
            if (firstPhase.topics && firstPhase.topics.length > 0) {
              title = firstPhase.topics[0]
              totalSecs = firstPhase.topics.length
            }
          }

          setCurrentLesson({
            title,
            module: moduleLabel,
            progress: 0, // No progress tracking yet
            timeLeft: "Start now", // No time tracking yet
            completedSections: 0,
            totalSections: totalSecs,
          })
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
      transition={{ delay: 0.1 }}
      className="surface-card p-5 relative overflow-hidden"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <span className="text-mono text-[9px] text-accent uppercase tracking-wider font-semibold">
            {currentLesson.module}
          </span>
          <h3 className="text-[14px] font-semibold text-foreground mt-1">
            {currentLesson.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 self-start md:self-auto text-mono text-[10px] text-foreground-subtle px-2 py-0.5 rounded bg-surface-2 border border-border">
          <Clock className="w-3 h-3" />
          <span>{currentLesson.timeLeft}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-mono text-[10px] mb-1.5">
          <span className="text-foreground-subtle">
            {currentLesson.completedSections}/{currentLesson.totalSections} concepts verified
          </span>
          <span className="text-accent font-semibold">{currentLesson.progress}%</span>
        </div>
        
        {/* Thin 2px progress bar */}
        <div className="h-0.5 w-full bg-surface-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${currentLesson.progress}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1.5">
        <Button className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 fill-current" />
          Continue Session
        </Button>
        
        <div className="flex items-center gap-1.5 text-mono text-[10px] text-foreground-subtle">
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          <span>Session Sync: Active</span>
        </div>
      </div>
    </motion.div>
  )
}
