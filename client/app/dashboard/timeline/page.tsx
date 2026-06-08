"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Clock, Calendar, Target, BookOpen, ChevronDown, ChevronUp, TrendingUp } from "lucide-react"
import { PageWrapper } from "@/components/dashboard/page-wrapper"

interface WeeklyPlan {
  week_number: number
  focus_area: string
  expected_hours: number
  milestones: string[]
  recommended_resources: string[]
}

interface TimelineData {
  total_duration_weeks: number
  total_estimated_hours: number
  weekly_schedule: WeeklyPlan[]
  completion_target: string
  planner_summary: string
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [skill, setSkill] = useState<string>("")
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]))

  useEffect(() => {
    try {
      const saved = localStorage.getItem("generatedRoadmap")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.timeline_result) {
          setTimeline(parsed.timeline_result)
        }
        if (parsed?.skill) {
          setSkill(parsed.skill)
        }
      }
    } catch (e) {
      console.error("Failed to load timeline data", e)
    }
  }, [])

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev)
      if (next.has(weekNum)) {
        next.delete(weekNum)
      } else {
        next.add(weekNum)
      }
      return next
    })
  }

  return (
    <PageWrapper maxWidth="md">

            {/* Header */}
            <div className="border-b border-border/40 pb-5 mb-6">
              <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
                Study <span className="text-accent">Timeline</span>
              </h1>
              <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider">
                {skill ? `TRACK: ${skill.toUpperCase()} · ` : ""}
                {timeline
                  ? `${timeline.total_duration_weeks} WEEKS · ${timeline.total_estimated_hours} TOTAL HOURS`
                  : "LOADING TIMELINE..."}
              </p>
            </div>

            {!timeline ? (
              <div className="text-center py-16 text-foreground-subtle">
                <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-[13px]">No timeline data available.</p>
                <p className="text-[11px] mt-1 text-foreground-subtle/60">
                  Complete the onboarding to generate your personalized schedule.
                </p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <div className="surface-card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent flex-shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-mono text-[9px] text-foreground-subtle uppercase">Duration</p>
                      <p className="text-[15px] font-bold text-foreground">{timeline.total_duration_weeks} weeks</p>
                    </div>
                  </div>

                  <div className="surface-card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent flex-shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-mono text-[9px] text-foreground-subtle uppercase">Total Hours</p>
                      <p className="text-[15px] font-bold text-foreground">{timeline.total_estimated_hours}h</p>
                    </div>
                  </div>

                  <div className="surface-card p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-success-muted flex items-center justify-center text-success flex-shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-mono text-[9px] text-foreground-subtle uppercase">Target</p>
                      <p className="text-[13px] font-semibold text-foreground truncate max-w-[120px]">{timeline.completion_target}</p>
                    </div>
                  </div>
                </div>

                {/* Planner Summary */}
                {timeline.planner_summary && (
                  <div className="surface-card p-4 mb-2 border-l-2 border-accent/50">
                    <p className="text-mono text-[9px] text-accent uppercase mb-1.5 font-semibold">Planner Summary</p>
                    <p className="text-[13px] text-foreground-muted leading-relaxed">{timeline.planner_summary}</p>
                  </div>
                )}

                {/* Weekly Schedule */}
                <div className="space-y-2">
                  {timeline.weekly_schedule.map((week, idx) => {
                    const isExpanded = expandedWeeks.has(week.week_number)
                    return (
                      <motion.div
                        key={week.week_number}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.25 }}
                        className="surface-card overflow-hidden"
                      >
                        {/* Week Header — always visible, click to expand */}
                        <button
                          onClick={() => toggleWeek(week.week_number)}
                          className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-2/40 transition-colors"
                        >
                          {/* Week badge */}
                          <div className="w-10 h-10 rounded-md bg-accent/10 flex flex-col items-center justify-center text-accent flex-shrink-0">
                            <span className="text-mono text-[8px] font-bold uppercase leading-none">WK</span>
                            <span className="text-[15px] font-bold leading-none">{week.week_number}</span>
                          </div>

                          {/* Focus area */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] font-semibold text-foreground truncate">
                              {week.focus_area}
                            </h3>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-mono text-[10px] text-foreground-subtle flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {week.expected_hours}h expected
                              </span>
                              <span className="text-mono text-[10px] text-foreground-subtle flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {week.milestones.length} milestone{week.milestones.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          {/* Expand icon */}
                          <div className="text-foreground-subtle flex-shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border/30">
                            {/* Milestones */}
                            {week.milestones.length > 0 && (
                              <div className="pt-3">
                                <p className="text-mono text-[9px] text-foreground-subtle uppercase mb-2 font-semibold flex items-center gap-1.5">
                                  <Target className="w-3 h-3" />
                                  Milestones
                                </p>
                                <ul className="space-y-1.5">
                                  {week.milestones.map((milestone, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[12px] text-foreground-muted">
                                      <div className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-1.5 flex-shrink-0" />
                                      {milestone}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Resources */}
                            {week.recommended_resources.length > 0 && (
                              <div>
                                <p className="text-mono text-[9px] text-foreground-subtle uppercase mb-2 font-semibold flex items-center gap-1.5">
                                  <BookOpen className="w-3 h-3" />
                                  Recommended Resources
                                </p>
                                <ul className="space-y-1.5">
                                  {week.recommended_resources.map((resource, i) => (
                                    <li key={i} className="flex items-start gap-2 text-[12px] text-foreground-muted">
                                      <div className="w-1.5 h-1.5 rounded-full bg-foreground-subtle/40 mt-1.5 flex-shrink-0" />
                                      {resource}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </>
            )}
    </PageWrapper>
  )
}
