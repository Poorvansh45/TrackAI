"use client"

import { motion } from "framer-motion"
import { Target, CheckCircle2 } from "lucide-react"
import { QuizAnalyticsResponse } from "@/lib/quiz-analytics-engine"
import { format, parseISO } from "date-fns"

interface QuizPerformanceSectionProps {
  quizData: QuizAnalyticsResponse
}

export function QuizPerformanceSection({ quizData }: QuizPerformanceSectionProps) {
  // If no quizzes taken, show empty state
  if (quizData.total_quizzes_taken === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="surface-card p-5 space-y-4 h-full flex flex-col items-center justify-center text-center min-h-[280px]"
      >
        <Target className="w-8 h-8 text-foreground-subtle/40 mb-2" />
        <p className="text-[13px] font-medium text-foreground">No Quiz Data Yet</p>
        <p className="text-[11px] text-foreground-subtle max-w-[250px]">
          Complete topics and take their quizzes to unlock knowledge performance analytics.
        </p>
      </motion.div>
    )
  }

  const maxAttempts = Math.max(...quizData.score_trend.map(t => t.attempts), 1)
  
  // Format dates for display
  const trendData = quizData.score_trend.map(t => {
    let display = t.date
    try {
      // If it's a YYYY-Www format, just use it, or simplify
      if (t.date.includes("-W")) {
        const [year, week] = t.date.split("-W")
        display = `Wk ${week}`
      }
    } catch {}
    return { ...t, display }
  })

  // Show only last 10 weeks to prevent overcrowding
  const recentTrend = trendData.slice(-10)

  // Determine recent trend using multiple points
  let trendLabel = "Stable"
  let hasEnoughTrendData = true
  if (quizData.score_trend.length >= 4) {
    const sorted = [...quizData.score_trend].sort((a, b) => a.date.localeCompare(b.date))
    const recent = sorted.slice(-2)
    const previous = sorted.slice(-4, -2)
    
    const recentAvg = recent.reduce((sum, t) => sum + t.average_score, 0) / recent.length
    const prevAvg = previous.reduce((sum, t) => sum + t.average_score, 0) / previous.length
    
    if (recentAvg > prevAvg + 3) trendLabel = "Improving"
    else if (recentAvg < prevAvg - 3) trendLabel = "Declining"
  } else if (quizData.score_trend.length >= 2) {
    const sorted = [...quizData.score_trend].sort((a, b) => a.date.localeCompare(b.date))
    const last = sorted[sorted.length - 1]
    const prev = sorted[sorted.length - 2]
    if (last.average_score > prev.average_score + 3) trendLabel = "Improving"
    else if (last.average_score < prev.average_score - 3) trendLabel = "Declining"
  } else {
    trendLabel = "Requires 2+ weeks of data"
    hasEnoughTrendData = false
  }

  // Determine mastery status
  let masteryStatus = "Needs Improvement"
  let statusColorClasses = "bg-destructive/10 text-destructive border-destructive/20"
  
  const score = quizData.overall_average_score
  if (score >= 85) {
    masteryStatus = "Strong"
    statusColorClasses = "bg-success/10 text-success border-success/20"
  } else if (score >= 70) {
    masteryStatus = "Good"
    statusColorClasses = "bg-accent/10 text-accent border-accent/20"
  } else if (score >= 50) {
    masteryStatus = "Needs Revision"
    statusColorClasses = "bg-warning/10 text-warning border-warning/20"
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="surface-card p-5 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
          <Target className="w-4 h-4 text-accent" />
          <span>Knowledge Performance</span>
        </div>
        <div className={`text-mono text-[9px] px-2 py-1 rounded font-semibold border ${statusColorClasses}`}>
          Overall Status: {masteryStatus}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        {/* Left: KPIs */}
        <div className="space-y-3 flex flex-col justify-between">
          <div className="bg-surface-2/40 border border-border/40 p-4 rounded-lg text-left flex-1 flex flex-col justify-center">
             <div>
               <div className="text-mono text-[9px] text-foreground-subtle uppercase mb-1">Knowledge Score</div>
               <div className="text-display text-4xl font-semibold text-foreground">
                 {quizData.overall_average_score.toFixed(1)}%
               </div>
             </div>
             <div className="text-[10px] text-foreground-muted mt-2">
                Based on quiz performance ({quizData.total_attempts} attempts across {quizData.total_quizzes_taken} topics)
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-2/40 border border-border/40 p-3 rounded-lg text-left flex flex-col justify-center">
              <div className="text-mono text-[8px] text-foreground-subtle uppercase mb-1">Recent Trend</div>
              <div className={`text-sm mt-1 ${hasEnoughTrendData ? "font-semibold text-foreground" : "font-medium text-[10px] text-foreground-muted"}`}>
                {trendLabel}
              </div>
            </div>
            
            <div className="bg-surface-2/40 border border-border/40 p-3 rounded-lg text-left flex flex-col justify-center">
              <div className="text-mono text-[8px] text-foreground-subtle uppercase mb-1">Verified Topics</div>
              <div className="text-sm font-semibold text-foreground mt-1">
                {quizData.verification_rate.toFixed(0)}%
              </div>
              <div className="text-[9px] text-foreground-subtle mt-0.5">
                of attempted topics mastered
              </div>
            </div>
          </div>
        </div>

        {/* Right: Score Trend Area Chart */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-mono text-[9px] text-foreground-subtle uppercase">Score Trend</h4>
          </div>
          
          <div className="h-32 bg-surface-2/30 border border-border/40 rounded-lg p-3 flex flex-col justify-end relative">
             {hasEnoughTrendData ? (
               <>
                 {/* Simple Area Sparkline (CSS based for simplicity & performance) */}
                 <div className="absolute inset-0 p-3 flex items-end justify-between gap-1 z-10 pointer-events-none">
                   {recentTrend.map((t, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <motion.div
                          className="w-full bg-accent/30 rounded-t-[2px] relative border-t border-accent"
                          initial={{ height: 0 }}
                          animate={{ height: `${t.average_score}%` }}
                          transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 * i }}
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                        </motion.div>
                     </div>
                   ))}
                 </div>
                 
                 {/* Grid labels */}
                 <div className="flex justify-between items-center relative z-20 mt-auto pt-2 border-t border-border/30">
                   {recentTrend.filter((_, i) => i === 0 || i === recentTrend.length - 1 || i === Math.floor(recentTrend.length / 2)).map((t, i) => (
                     <span key={i} className="text-mono text-[8px] text-foreground-subtle">{t.display}</span>
                   ))}
                 </div>
               </>
             ) : (
               <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                 <p className="text-[11px] text-foreground-subtle">
                   Chart will appear when you have more weekly data points.
                 </p>
               </div>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
