"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { User, Route, FileQuestion, RefreshCw, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import type { OnboardingData } from "@/app/onboarding/page"
import { initRoadmap } from "@/lib/roadmap-state"

const generationSteps = [
  { id: 1, label: "Analyzing your profile",    icon: User },
  { id: 2, label: "Checking prerequisites",    icon: CheckCircle2 },
  { id: 3, label: "Generating roadmap layout", icon: Route },
  { id: 4, label: "Building your schedule",    icon: FileQuestion },
  { id: 5, label: "Finalizing your plan",      icon: RefreshCw },
]

// Map frontend goal IDs to readable labels for the LLM
const GOAL_MAP: Record<string, string> = {
  internship:   "Internship",
  placement:    "Placement",
  startup:      "Startup",
  freelancing:  "Freelancing",
  personal:     "Personal Growth",
}

// Map frontend style IDs to readable labels for the LLM
const STYLE_MAP: Record<string, string> = {
  visual:      "Visual",
  reading:     "Reading",
  audio:       "Audio",
  "hands-on":  "Hands-On",
}

interface RoadmapGenerationProps {
  data: OnboardingData
  onNext: () => void
}

export function RoadmapGeneration({ data, onNext }: RoadmapGenerationProps) {
  const [currentStep, setCurrentStep]     = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [error, setError]                 = useState<string | null>(null)
  const [attempt, setAttempt]             = useState(0)   // increment to re-trigger effect
  const isGenerating                      = useRef(false)

  const handleRetry = useCallback(() => {
    setError(null)
    setCurrentStep(0)
    setCompletedSteps([])
    isGenerating.current = false
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    let isCancelled = false
    isGenerating.current = false   // reset flag on each attempt

    // Animate steps at 2 s interval while the API call is in flight
    let animStep = 0
    const progressInterval = setInterval(() => {
      if (animStep < generationSteps.length - 1 && !isCancelled) {
        setCompletedSteps((prev) => [...new Set([...prev, animStep])])
        animStep++
        setCurrentStep(animStep)
      }
    }, 2000)

    const generateRoadmap = async () => {
      if (isGenerating.current) return
      isGenerating.current = true

      try {
        const goalString  = data.goals.map((g) => GOAL_MAP[g]  || g).join(", ") || "Personal Growth"
        const styleString = data.learningStyles.map((s) => STYLE_MAP[s] || s).join(", ") || "Visual"

        const payload = {
          skill: data.selectedSkill || "custom",
          // assessmentAnswers is already Record<string, string>
          // (question text -> selected option text) from SkillAssessment
          assessment_answers: data.assessmentAnswers,
          user_preferences: {
            daily_hours:          data.studyHours,
            weekly_availability:  data.weeklyDays,
            learning_style:       styleString,
            goal:                 goalString,
          },
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"

        const response = await fetch(`${apiUrl}/tracks/generate`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        })

        if (!response.ok) {
          // Try to pull a readable detail from the FastAPI error body
          let detail = `Server error ${response.status}`
          try {
            const body = await response.json()
            if (body?.detail) detail = body.detail
          } catch { /* ignore parse error */ }
          throw new Error(detail)
        }

        const result = await response.json()
        if (isCancelled) return

        // Persist the full result for the roadmap & timeline dashboard pages
        try {
          localStorage.setItem("generatedRoadmap", JSON.stringify(result))
        } catch (e) {
          console.warn("localStorage unavailable — result will not persist across page loads", e)
        }

        // Initialize backend roadmap_progress (single source of truth for
        // topic unlock state). Idempotent — safe even if onboarding is rerun.
        try {
          await initRoadmap()
        } catch (e) {
          console.warn("[RoadmapGeneration] initRoadmap failed", e)
        }

        // Mark all steps done, then advance the onboarding stepper
        clearInterval(progressInterval)
        setCompletedSteps([0, 1, 2, 3, 4])
        setCurrentStep(5)

        setTimeout(() => {
          if (!isCancelled) onNext()
        }, 800)

      } catch (err: any) {
        clearInterval(progressInterval)
        if (!isCancelled) {
          setError(err.message || "An unexpected error occurred during generation.")
        }
      }
    }

    generateRoadmap()

    return () => {
      isCancelled = true
      clearInterval(progressInterval)
    }
    // Re-run when `attempt` increments (retry)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const progress = error ? 0 : (completedSteps.length / generationSteps.length) * 100

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5">
        <div className="w-full max-w-[480px] mx-auto text-center space-y-5">
          <div className="w-10 h-10 rounded-md bg-destructive/15 flex items-center justify-center mx-auto text-destructive">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-display text-2xl text-foreground mb-2">Generation Failed</h2>
            <p className="text-foreground-muted text-[13px] max-w-sm mx-auto leading-relaxed">{error}</p>
          </div>
          <div className="surface-card p-4 text-left space-y-1">
            <p className="text-mono text-[9px] text-foreground-subtle uppercase font-semibold mb-2">Checklist</p>
            {[
              "Backend running on http://127.0.0.1:8000",
              "GOOGLE_API_KEY set in backend/.env (AIza… format)",
              "Internet connection is active",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px] text-foreground-muted">
                <div className="w-1.5 h-1.5 rounded-full bg-destructive/50 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <button
            onClick={handleRetry}
            className="px-6 py-2.5 rounded-md bg-accent hover:bg-accent-hover text-accent-foreground text-[13px] font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Generation
          </button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Loading / progress state
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-[500px] mx-auto relative z-10">

        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-9 h-9 rounded-md bg-accent/15 flex items-center justify-center mx-auto mb-4 text-accent">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <h2 className="text-display text-2xl sm:text-3xl text-foreground mb-2">
            Building Your <span className="text-accent">Cockpit</span>
          </h2>
          <p className="text-foreground-muted text-[13px] font-mono">
            AI ANALYSIS IN PROGRESS · ESTIMATED ~30–60s
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-border/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
              className="h-full bg-accent rounded-full"
            />
          </div>
        </div>

        {/* Step list */}
        <div className="surface-card p-4 space-y-2">
          {generationSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(index)
            const isCurrent   = currentStep === index && !isCompleted

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3.5 p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? "bg-surface-2 border-accent/20"
                    : "bg-surface-1/40 border-transparent"
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center ${
                  isCompleted ? "bg-success-muted text-success"
                  : isCurrent  ? "bg-accent/15 text-accent"
                               : "bg-surface-2 text-foreground-subtle"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <step.icon className="w-3.5 h-3.5" />
                  )}
                </div>

                <span className={`text-[12px] font-medium flex-1 ${
                  isCompleted ? "text-foreground-muted line-through"
                  : isCurrent  ? "text-foreground"
                               : "text-foreground-subtle"
                }`}>
                  {step.label}
                </span>

                <span className="text-mono text-[9px] text-foreground-subtle uppercase">
                  {isCompleted ? "DONE" : isCurrent ? "RUNNING" : "PENDING"}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
