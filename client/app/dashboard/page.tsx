"use client"

import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
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
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import useAuth from "@/hooks/use-Auth";

export default function DashboardPage() {
  
    const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      
      <div className="flex">
        <DashboardSidebar />
        
        <main className="flex-1 p-5 lg:p-8 lg:pl-20 pt-16">
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
        </main>
      </div>
    </div>
  )
}
