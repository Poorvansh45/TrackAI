"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Route, FileQuestion, RefreshCw, CheckCircle2, Loader2 } from "lucide-react"
import type { OnboardingData } from "@/app/onboarding/page"

const generationSteps = [
  { id: 1, label: "Analyzing your profile", icon: User, duration: 1500 },
  { id: 2, label: "Checking prerequisites", icon: CheckCircle2, duration: 1200 },
  { id: 3, label: "Generating roadmap layout", icon: Route, duration: 1800 },
  { id: 4, label: "Creating validation quizzes", icon: FileQuestion, duration: 1200 },
  { id: 5, label: "Preparing revision system", icon: RefreshCw, duration: 1200 },
]

interface RoadmapGenerationProps {
  data: OnboardingData
  onNext: () => void
}

export function RoadmapGeneration({ data, onNext }: RoadmapGenerationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  useEffect(() => {
    let timeout: NodeJS.Timeout

    const runStep = (stepIndex: number) => {
      if (stepIndex >= generationSteps.length) {
        timeout = setTimeout(() => {
          onNext()
        }, 800)
        return
      }

      setCurrentStep(stepIndex)
      
      timeout = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, stepIndex])
        runStep(stepIndex + 1)
      }, generationSteps[stepIndex].duration)
    }

    runStep(0)

    return () => clearTimeout(timeout)
  }, [onNext])

  const progress = (completedSteps.length / generationSteps.length) * 100

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
            ESTIMATED COMPILE TIME: ~6.5s
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-border/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-accent rounded-full"
            />
          </div>
        </div>

        {/* Generation steps card */}
        <div className="surface-card p-4 space-y-2">
          {generationSteps.map((step, index) => {
            const isCompleted = completedSteps.includes(index)
            const isCurrent = currentStep === index && !isCompleted
            const isPending = !isCompleted && !isCurrent
            
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
                
                <span className="text-mono text-[9px] text-foreground-subtle uppercase">
                  {isCompleted ? "DONE" : isCurrent ? "COMPILING" : "PENDING"}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
