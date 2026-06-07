# Tracks AI Platform - MVP Implementation Plan

As requested, here is the detailed breakdown before editing any files.

## 1. backend/app/api/deps.py (ObjectId fix)
**A. Why the change is required:** The user token decoding returns a string `user_id`. MongoDB strictly requires `ObjectId` for `_id` lookups.
**B. Exact file path:** `d:\tracks-ai-platform\backend\app\api\deps.py`
**C. Complete updated code:** 
**Observation:** Upon inspection, the file **already** contains the correct implementation (lines 31-40). No changes are required.

## 2. backend/app/tracks/llm/gemini.py (API key fix)
**A. Why the change is required:** LangChain Google GenAI requires an API key to be passed explicitly, or it throws errors.
**B. Exact file path:** `d:\tracks-ai-platform\backend\app\tracks\llm\gemini.py`
**C. Complete updated code:** 
**Observation:** The file **already** checks `settings.GOOGLE_API_KEY` and raises a `RuntimeError` if missing (lines 26-32). No changes are required.

## 3. client/components/onboarding/roadmap-generation.tsx
**A. Why the change is required:** It currently fakes the loading. It must hit the real `POST /api/v1/tracks/generate` endpoint, process the user's data, handle loading states, and store the result.
**B. Exact file path:** `d:\tracks-ai-platform\client\components\onboarding\roadmap-generation.tsx`
**D. Breaking risks:** The backend workflow is synchronous and blocking. Setting appropriate frontend timeouts and error handling is critical so the UI doesn't freeze or fail silently.
**E. Data flow changes:** Frontend form state (`OnboardingData`) is mapped to the API schema, sent to the backend, and the resulting `GenerateRoadmapResponse` is stored in `localStorage` for the dashboard.

#### [MODIFY] roadmap-generation.tsx
```tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { User, Route, FileQuestion, RefreshCw, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import type { OnboardingData } from "@/app/onboarding/page"

const generationSteps = [
  { id: 1, label: "Analyzing your profile", icon: User },
  { id: 2, label: "Checking prerequisites", icon: CheckCircle2 },
  { id: 3, label: "Generating roadmap layout", icon: Route },
  { id: 4, label: "Creating validation quizzes", icon: FileQuestion },
  { id: 5, label: "Preparing revision system", icon: RefreshCw },
]

interface RoadmapGenerationProps {
  data: OnboardingData
  onNext: () => void
}

export function RoadmapGeneration({ data, onNext }: RoadmapGenerationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const isGenerating = useRef(false)

  useEffect(() => {
    let isCancelled = false

    const runSimulatedProgress = () => {
       let step = 0;
       const interval = setInterval(() => {
           if (step < 4 && !isCancelled) {
               setCompletedSteps(prev => [...new Set([...prev, step])])
               step++
               setCurrentStep(step)
           }
       }, 2000)
       return interval
    }

    const generateRoadmap = async () => {
      if (isGenerating.current) return
      isGenerating.current = true
      
      const progressInterval = runSimulatedProgress()
      
      try {
        const payload = {
          skill: data.selectedSkill || "custom",
          assessment_answers: Object.fromEntries(
            Object.entries(data.assessmentAnswers).map(([k, v]) => [k, v ? "Yes" : "No"])
          ),
          user_preferences: {
            daily_hours: data.studyHours,
            weekly_availability: data.weeklyDays,
            learning_style: data.learningStyles.join(", ") || "Mixed",
            goal: data.goals.join(", ") || "General Learning"
          }
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"
        
        const response = await fetch(`${apiUrl}/tracks/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          throw new Error("Failed to generate roadmap from server.")
        }
        
        const result = await response.json()
        if (isCancelled) return
        
        localStorage.setItem("generatedRoadmap", JSON.stringify(result))
        
        clearInterval(progressInterval)
        setCompletedSteps([0, 1, 2, 3, 4])
        setCurrentStep(5)
        
        setTimeout(() => {
          if (!isCancelled) onNext()
        }, 800)

      } catch (err: any) {
        clearInterval(progressInterval)
        if (!isCancelled) {
          setError(err.message || "An error occurred during generation.")
        }
      }
    }

    generateRoadmap()

    return () => {
      isCancelled = true
    }
  }, [data, onNext])

  const progress = error ? 0 : (completedSteps.length / generationSteps.length) * 100

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-[500px] mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center mx-auto mb-4 ${error ? 'bg-destructive/15 text-destructive' : 'bg-accent/15 text-accent'}`}>
            {error ? <AlertCircle className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          <h2 className="text-display text-2xl sm:text-3xl text-foreground mb-2">
            {error ? "Generation Failed" : <>Building Your <span className="text-accent">Cockpit</span></>}
          </h2>
          <p className="text-foreground-muted text-[13px] font-mono">
            {error ? "Please try again later." : "ESTIMATED COMPILE TIME: ~10.5s"}
          </p>
        </div>

        <div className="mb-6">
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-border/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className={`h-full rounded-full ${error ? 'bg-destructive' : 'bg-accent'}`}
            />
          </div>
        </div>

        <div className="surface-card p-4 space-y-2">
          {generationSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(index)
            const isCurrent = currentStep === index && !isCompleted && !error
            
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3.5 p-3 rounded-lg border transition-all ${
                  isCurrent 
                    ? "bg-surface-2 border-accent/20" 
                    : "bg-surface-1/40 border-transparent"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded flex items-center justify-center ${
                    isCompleted
                      ? "bg-success-muted text-success"
                      : isCurrent
                      ? "bg-accent/15 text-accent"
                      : "bg-surface-2 text-foreground-subtle"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <step.icon className="w-3.5 h-3.5" />
                  )}
                </div>
                
                <span
                  className={`text-[12px] font-medium flex-1 ${
                    isCompleted
                      ? "text-foreground-muted line-through"
                      : isCurrent
                      ? "text-foreground"
                      : "text-foreground-subtle"
                  }`}
                >
                  {step.label}
                </span>
                
                <span className={`text-mono text-[9px] uppercase ${error && isCurrent ? 'text-destructive' : 'text-foreground-subtle'}`}>
                  {isCompleted ? "DONE" : error && isCurrent ? "ERROR" : isCurrent ? "COMPILING" : "PENDING"}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

## 4. client/components/onboarding/dashboard-entry.tsx
**A. Why the change is required:** It hardcodes the expected modules and verification checkpoints. It needs to dynamically display the generated `roadmap_result`.
**B. Exact file path:** `d:\tracks-ai-platform\client\components\onboarding\dashboard-entry.tsx`
**D. Breaking risks:** Using `localStorage` requires hydration safety checks (`useEffect`), otherwise Next.js will throw a hydration mismatch.
**E. Data flow changes:** Component reads `generatedRoadmap` from `localStorage` on mount instead of relying only on the parent's `data`.

#### [MODIFY] dashboard-entry.tsx
```tsx
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
    const saved = localStorage.getItem("generatedRoadmap")
    if (saved) {
      try {
        setRoadmap(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse roadmap", e)
      }
    }
  }, [])

  const handleEnterDashboard = () => {
    router.push("/dashboard")
  }

  const roadmapData = roadmap?.roadmap_result || {}
  const moduleCount = roadmapData.phases?.length || 8
  const checkpointCount = roadmapData.phases?.reduce((acc: number, p: any) => acc + (p.topics?.length || 0), 0) || 12
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
```

## 5. client/app/dashboard/roadmap/page.tsx
**A. Why the change is required:** It uses a static array `roadmapPhases`. It needs to dynamically parse `roadmap_result.phases` from the backend LLM output.
**B. Exact file path:** `d:\tracks-ai-platform\client\app\dashboard\roadmap\page.tsx`
**D. Breaking risks:** The LLM's returned schema maps "topics" instead of "nodes". We must safely map these dynamically.
**E. Data flow changes:** `useEffect` pulls data from local storage on mount, transforms the schema, and updates local component state.

#### [MODIFY] page.tsx
```tsx
"use client"

import { useEffect, useState } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { CheckCircle2, Lock, Play, Target, FileText, Clock } from "lucide-react"
import Link from "next/link"

interface Node {
  id: string
  name: string
  status: "completed" | "current" | "locked"
  time: string
  mastery?: number
}

interface Phase {
  phase: string
  nodes: Node[]
}

export default function RoadmapPage() {
  const [roadmapPhases, setRoadmapPhases] = useState<Phase[]>([])
  const [skillLabel, setSkillLabel] = useState<string>("CUSTOM")
  const [activeNode, setActiveNode] = useState<string>("TBD")

  useEffect(() => {
    const saved = localStorage.getItem("generatedRoadmap")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.skill) setSkillLabel(parsed.skill.toUpperCase())
        
        if (parsed.roadmap_result && parsed.roadmap_result.phases) {
          let foundCurrent = false
          const mappedPhases: Phase[] = parsed.roadmap_result.phases.map((p: any, i: number) => {
            return {
              phase: `PHASE ${p.phase_number || i + 1}: ${(p.phase_title || 'FOUNDATIONS').toUpperCase()}`,
              nodes: (p.topics || []).map((t: string, j: number) => {
                const isCurrent = !foundCurrent
                if (isCurrent) {
                  foundCurrent = true
                  setActiveNode(`RD-${String(i + 1).padStart(2, '0')}${String(j + 1).padStart(2, '0')}`)
                }
                return {
                  id: `RD-${String(i + 1).padStart(2, '0')}${String(j + 1).padStart(2, '0')}`,
                  name: t,
                  status: isCurrent ? "current" : "locked",
                  time: "TBD",
                  mastery: isCurrent ? 0 : undefined
                }
              })
            }
          })
          setRoadmapPhases(mappedPhases)
        }
      } catch (e) {
        console.error("Failed to parse roadmap data", e)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      
      <div className="flex">
        <DashboardSidebar />
        
        <main className="flex-1 p-5 lg:p-8 lg:pl-20 pt-16">
          <div className="max-w-[800px] mx-auto space-y-6">
            <div className="border-b border-border/40 pb-5 mb-6">
              <h1 className="text-display text-2xl sm:text-3xl text-foreground">
                Learning <span className="text-accent">Roadmap</span>
              </h1>
              <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider">
                TRACK: {skillLabel} · ACTIVE NODE: {activeNode}
              </p>
            </div>

            {roadmapPhases.length === 0 ? (
              <div className="text-center py-10 text-foreground-subtle">
                No roadmap data available. Please complete onboarding.
              </div>
            ) : (
              <div className="relative pl-1">
                <div className="absolute left-[19px] top-6 bottom-6 w-[1px] bg-border/60" />

                <div className="space-y-10">
                  {roadmapPhases.map((phase, pIdx) => (
                    <div key={pIdx} className="space-y-4">
                      <div className="relative pl-10">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-border border-2 border-background" />
                        <span className="text-mono text-[9px] text-foreground-subtle tracking-widest font-semibold">
                          {phase.phase}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {phase.nodes.map((node) => {
                          const isCompleted = node.status === "completed"
                          const isCurrent = node.status === "current"
                          
                          return (
                            <div 
                              key={node.id} 
                              className={`relative pl-10 transition-all`}
                            >
                              <div className="absolute left-3 top-4 z-10 w-3.5 h-3.5 rounded-full flex items-center justify-center bg-background border border-border">
                                {isCompleted ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                ) : isCurrent ? (
                                  <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
                                ) : (
                                  <Lock className="w-2 h-2 text-foreground-subtle/50" />
                                )}
                              </div>

                              <div className={`surface-card p-5 transition-all ${
                                isCurrent 
                                  ? "border-accent/40 bg-surface-2/40 shadow-sm" 
                                  : isCompleted
                                    ? "bg-surface-1/40 opacity-90"
                                    : "opacity-60"
                              }`}>
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-mono text-[9px] text-foreground-subtle font-semibold">
                                        {node.id}
                                      </span>
                                      <h3 className={`text-[13px] font-semibold ${
                                        isCompleted ? "text-foreground-muted" : "text-foreground"
                                      }`}>
                                        {node.name}
                                      </h3>
                                    </div>
                                    
                                    <div className="flex items-center gap-3.5 mt-1.5 text-mono text-[10px] text-foreground-subtle">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>Est: {node.time}</span>
                                      </div>
                                      {isCompleted && node.mastery && (
                                        <span className="text-success font-medium">Mastery: {node.mastery}%</span>
                                      )}
                                      {isCurrent && node.mastery !== undefined && (
                                        <span className="text-accent font-medium">Current progress: {node.mastery}%</span>
                                      )}
                                    </div>
                                  </div>

                                  {!isCompleted && !isCurrent ? (
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-2 border border-border/60 text-mono text-[9px] text-foreground-subtle self-start">
                                      <Lock className="w-2.5 h-2.5" />
                                      <span>LOCKED</span>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2">
                                      <Link href="/dashboard/quiz">
                                        <button className="flex items-center gap-1 border border-border hover:bg-surface-2 text-foreground-muted hover:text-foreground text-mono text-[9px] px-2 py-1 rounded transition-colors font-medium">
                                          <Target className="w-3 h-3" />
                                          QUIZ
                                        </button>
                                      </Link>
                                      <Link href="/dashboard/notes">
                                        <button className="flex items-center gap-1 border border-border hover:bg-surface-2 text-foreground-muted hover:text-foreground text-mono text-[9px] px-2 py-1 rounded transition-colors font-medium">
                                          <FileText className="w-3 h-3" />
                                          NOTES
                                        </button>
                                      </Link>
                                    </div>
                                  )}
                                </div>

                                {isCurrent && node.mastery !== undefined && (
                                  <div className="h-0.5 w-full bg-surface-3 rounded-full overflow-hidden mt-3">
                                    <div 
                                      className="h-full bg-accent transition-all duration-300"
                                      style={{ width: `${node.mastery}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
```

## 6. client/.env.local (Environment Variable Creation)
**A. Why the change is required:** It points the Next.js frontend to the FastAPI backend `v1` endpoint.
**B. Exact file path:** `d:\tracks-ai-platform\client\.env.local`
**D. Breaking risks:** Without `NEXT_PUBLIC_API_URL`, the frontend will default to undefined or standard Next.js routing, failing to hit the python server.
**E. Data flow changes:** Enables `fetch()` to route outside Next.js to FastAPI.

#### [NEW] .env.local
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
```

## Review
Once approved, I will replace the files with this production code and output the final required items (Architecture Diagram, testing checklist, etc).
