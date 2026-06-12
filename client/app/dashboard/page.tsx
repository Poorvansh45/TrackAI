"use client"

import { useRoadmap } from "@/hooks/use-roadmap"
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard"
import { WelcomeHeader } from "@/components/dashboard/welcome-header"
import { ContinueLearning } from "@/components/dashboard/continue-learning"
import { RoadmapCard } from "@/components/dashboard/roadmap-card"
import { ProgressAnalytics } from "@/components/dashboard/progress-analytics"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { DailyMissions } from "@/components/dashboard/daily-missions"
import { PlannerCard } from "@/components/dashboard/planner-card"
import { QuizCard } from "@/components/dashboard/quiz-card"
import { NotesCard } from "@/components/dashboard/notes-card"
import { AIMentorCard } from "@/components/dashboard/ai-mentor-card"
import { Loader2 } from "lucide-react"
import { PageWrapper } from "@/components/dashboard/page-wrapper"

export default function DashboardPage() {
  const { roadmapExists, loading } = useRoadmap()

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-9 h-9 rounded-md bg-accent/15 flex items-center justify-center text-accent">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </div>
    )
  }

  if (!roadmapExists) {
    return <EmptyDashboard />
  }

  return (
    <PageWrapper maxWidth="xl">
      <WelcomeHeader />

      {/* Main Command Deck Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column — Main Content Deck (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <ContinueLearning />
          <RoadmapCard />
          <ProgressAnalytics />
          <RecentActivity />
        </div>

        {/* Right Column — Status & Support Deck (1/3 width)
            StreakCard removed — streak + XP now live in WelcomeHeader.
            PlannerCard promoted to the top slot. */}
        <div className="space-y-6">
          <PlannerCard />
          <DailyMissions />
          <QuizCard />
          <NotesCard />
          <AIMentorCard />
        </div>
      </div>
    </PageWrapper>
  )
}
