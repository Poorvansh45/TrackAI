"use client"

import { useRoadmap } from "@/hooks/use-roadmap"
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard"
import { WelcomeHeader } from "@/components/dashboard/welcome-header"
import { ContinueLearning } from "@/components/dashboard/continue-learning"
import { RoadmapCard } from "@/components/dashboard/roadmap-card"
import { ProgressAnalytics } from "@/components/dashboard/progress-analytics"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { StreakCard } from "@/components/dashboard/streak-card"
import { DailyMissions } from "@/components/dashboard/daily-missions"
import { QuizCard } from "@/components/dashboard/quiz-card"
import { NotesCard } from "@/components/dashboard/notes-card"
import { AIMentorCard } from "@/components/dashboard/ai-mentor-card"
import { PlannerCard } from "@/components/dashboard/planner-card"
import { Loader2 } from "lucide-react"

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
    <div className="max-w-[1200px] mx-auto space-y-6">
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
        
        {/* Right Column — Status & Support Deck (1/3 width) */}
        <div className="space-y-6">
          <StreakCard />
          <DailyMissions />
          <QuizCard />
          <NotesCard />
          <AIMentorCard />
          <PlannerCard />
        </div>
      </div>
    </div>
  )
}

