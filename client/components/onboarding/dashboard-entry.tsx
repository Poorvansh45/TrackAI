"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Route, Zap, Brain, ChevronRight, Check } from "lucide-react"
import type { OnboardingData } from "@/app/onboarding/page"

interface DashboardEntryProps {
  data: OnboardingData
}

export function DashboardEntry({ data }: DashboardEntryProps) {
  const router = useRouter()
  const [roadmap, setRoadmap] = useState<any>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem("generatedRoadmap")
      if (saved) {
        setRoadmap(JSON.parse(saved))
      }
    } catch (e) {
      console.error("Failed to access or parse roadmap", e)
    }
  }, [])

  const handleEnterDashboard = () => {
    router.replace("/dashboard")
  }

  const roadmapData = roadmap?.roadmap_result || {}
  const moduleCount = Array.isArray(roadmapData.phases) ? roadmapData.phases.length : 8
  const checkpointCount = Array.isArray(roadmapData.phases) 
    ? roadmapData.phases.reduce((acc: number, p: any) => acc + (Array.isArray(p.topics) ? p.topics.length : 0), 0) 
    : 12
  const firstMissionName = roadmapData.phases?.[0]?.topics?.[0] || 
    (data.selectedSkill === "ai-ml" ? "Complete RAG Fundamentals" : "Review ES6+ Fundamentals")

  const skillName = roadmap?.skill || data.selectedSkill || "Custom Engineering Path"

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-[500px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="w-9 h-9 rounded-md bg-success-muted flex items-center justify-center mx-auto mb-4 text-success">
            <Check className="w-5 h-5" />
          </div>
          <h2 className="text-display text-3xl text-foreground mb-2">
            System is <span className="text-accent">Ready</span>
          </h2>
          <p className="text-foreground-muted text-[14px]">
            Your customized roadmap and curriculum have been initialized.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="surface-card p-6 mb-8 space-y-5"
        >
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded bg-accent/15 flex items-center justify-center text-accent flex-shrink-0">
              <Route className="w-4 h-4" />
            </div>
            <div>
              <span className="text-mono text-[9px] text-foreground-subtle uppercase">Target Curriculum</span>
              <h3 className="text-[13px] font-semibold text-foreground mt-0.5">{skillName}</h3>
              <p className="text-[11px] text-foreground-subtle mt-0.5">
                {moduleCount} phases · {checkpointCount} topics
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded bg-warning-muted flex items-center justify-center text-warning flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-mono text-[9px] text-foreground-subtle uppercase">First Mission Unlocked</span>
              <h3 className="text-[13px] font-semibold text-foreground mt-0.5">
                {firstMissionName}
              </h3>
              <p className="text-[11px] text-foreground-subtle mt-0.5">
                Target: {data.studyHours.toFixed(1)}h daily pace · {data.weeklyDays} days / week
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-8 h-8 rounded bg-success-muted flex items-center justify-center text-success flex-shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <span className="text-mono text-[9px] text-foreground-subtle uppercase">AI Learning Assistant</span>
              <h3 className="text-[13px] font-semibold text-foreground mt-0.5">Active & Customized</h3>
              <p className="text-[11px] text-foreground-subtle mt-0.5">
                Tuned to your preference profile.
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <Button
            onClick={handleEnterDashboard}
            size="lg"
            className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-10 px-5 text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            Enter Dashboard
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
