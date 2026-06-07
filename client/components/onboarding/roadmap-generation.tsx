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
        
        try {
          localStorage.setItem("generatedRoadmap", JSON.stringify(result))
        } catch (e) {
          console.warn("localStorage access denied", e)
        }
        
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
