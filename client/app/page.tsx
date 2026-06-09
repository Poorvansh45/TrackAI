"use client";

import { Navbar } from "@/components/landing/navbar"
import { HeroSection } from "@/components/landing/hero"
import { AIMentorSection } from "@/components/landing/ai-mentor"
import { RoadmapVisualization } from "@/components/landing/roadmap-visualization"
import { FeaturesSection } from "@/components/landing/features"
import { SmartNotesSection } from "@/components/landing/smart-notes-section"
import { DailyMissionsSection } from "@/components/landing/daily-missions-section"
import { AnalyticsSection } from "@/components/landing/analytics-section"
import { PlannerSection } from "@/components/landing/planner-section"
import { CTASection } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"


export default function LandingPage() {

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <Navbar />
      <HeroSection />
      
      <div id="features">
        <AIMentorSection />
      </div>

      <div id="roadmap">
        <RoadmapVisualization />
      </div>

      <div id="quizzes">
        <FeaturesSection />
      </div>

      <div id="notes">
        <SmartNotesSection />
      </div>

      <div>
        <DailyMissionsSection />
      </div>

      <div id="analytics">
        <AnalyticsSection />
      </div>

      <div>
        <PlannerSection />
      </div>

      <CTASection />
      <Footer />
    </main>
  )
}
