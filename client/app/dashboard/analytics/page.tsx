"use client"

import { useMemo } from "react"
import { Calendar, Loader2 } from "lucide-react"
import { PageWrapper } from "@/components/dashboard/page-wrapper"
import { useRoadmapProgress } from "@/lib/roadmap-state"
import { useQuizAnalytics } from "@/hooks/use-quiz-analytics"
import { EmptyAnalytics } from "@/components/analytics/empty-analytics"
import { OverviewCards } from "@/components/analytics/overview-cards"
import { LearningProgressSection } from "@/components/analytics/learning-progress-section"
import { XPGrowthSection } from "@/components/analytics/xp-growth-section"
import { StreakSection } from "@/components/analytics/streak-section"
import { ForecastSection } from "@/components/analytics/forecast-section"
import { InsightsSection } from "@/components/analytics/insights-section"
import { QuizPerformanceSection } from "@/components/analytics/quiz-performance-section"
import { RevisionSection } from "@/components/analytics/revision-section"
import { 
  deriveStreak, 
  deriveVelocity, 
  deriveForecast, 
  deriveXPTimeline, 
  derivePhaseTimeline, 
  deriveInsights 
} from "@/lib/analytics-engine"

export default function AnalyticsPage() {
  const { data, loading } = useRoadmapProgress()
  const { data: quizData, loading: quizLoading } = useQuizAnalytics()

  const streak = useMemo(() => deriveStreak(data), [data])
  const velocity = useMemo(() => deriveVelocity(data), [data])
  const forecast = useMemo(() => deriveForecast(data, velocity), [data, velocity])
  const xpHistory = useMemo(() => deriveXPTimeline(data), [data])
  const phaseTimeline = useMemo(() => derivePhaseTimeline(data), [data])
  const insights = useMemo(() => deriveInsights(data, streak, velocity, forecast), [data, streak, velocity, forecast])

  if (loading || quizLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-9 h-9 rounded-md bg-accent/15 flex items-center justify-center text-accent">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </div>
    )
  }

  // If no data or roadmap not started (0 phases/topics)
  if (!data || data.phases.length === 0) {
    return (
      <PageWrapper maxWidth="lg">
        <EmptyAnalytics />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper maxWidth="lg">
      {/* Header */}
      <div className="border-b border-border/40 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
            Performance <span className="text-accent">Analytics</span>
          </h1>
          <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider uppercase">
            {data.skill} • Progress Report
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-mono text-[10px] text-foreground-subtle bg-surface-1 border border-border px-3 py-1.5 rounded self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5" />
          <span>ALL TIME</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* KPI Row */}
        <OverviewCards data={data} />

        <div className="grid lg:grid-cols-3 gap-6 items-start">
          {/* Main Column (2/3) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <LearningProgressSection velocity={velocity} phaseTimeline={phaseTimeline} />
            {quizData && <QuizPerformanceSection quizData={quizData} />}
            <XPGrowthSection timeline={xpHistory} />
          </div>

          {/* Sidebar Column (1/3) */}
          <div className="flex flex-col gap-6">
            <StreakSection streak={streak} />
            <ForecastSection forecast={forecast} />
            {quizData && <RevisionSection quizData={quizData} />}
            <InsightsSection insights={insights} />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
