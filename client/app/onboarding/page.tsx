"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { WelcomeScreen } from "@/components/onboarding/welcome-screen"
import { SkillSelection } from "@/components/onboarding/skill-selection"
import { SkillAssessment } from "@/components/onboarding/skill-assessment"
import { LearningPreferences } from "@/components/onboarding/learning-preferences"
import { GoalSelection } from "@/components/onboarding/goal-selection"
import { RoadmapGeneration } from "@/components/onboarding/roadmap-generation"
import { DashboardEntry } from "@/components/onboarding/dashboard-entry"
import useAuth from "@/hooks/use-Auth";

export interface OnboardingData{

  selectedSkill: string | null
  assessmentAnswers: Record<string, string>
  studyHours: number
  weeklyDays: number
  learningStyles: string[]
  goals: string[]
}

const initialData: OnboardingData = {
  selectedSkill: null,
  assessmentAnswers: {},
  studyHours: 2,
  weeklyDays: 5,
  learningStyles: [],
  goals: [],
}

export default function OnboardingPage() {

  const [step, setStep] = useState(1)
  const [data, setData] = useState<OnboardingData>(initialData)
   
      const { loading, authenticated } = useAuth();

  if(loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  } 

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }

  const nextStep = () => setStep((prev) => prev + 1)
  const prevStep = () => setStep((prev) => Math.max(1, prev - 1))

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Progress indicator */}
      {step > 1 && step < 6 && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-6">
            {[
              { id: 2, label: "TRACK" },
              { id: 3, label: "BASE" },
              { id: 4, label: "SCHEDULE" },
              { id: 5, label: "GOAL" },
            ].map((s) => (
              <div key={s.id} className="flex flex-col items-center gap-1.5">
                <div
                  className={`h-0.5 w-8 transition-all duration-300 ${
                    s.id <= step ? "bg-accent" : "bg-border"
                  }`}
                />
                <span className={`text-mono text-[9px] ${
                  s.id === step ? "text-accent font-semibold" : "text-foreground-subtle"
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Screens */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <WelcomeScreen onNext={nextStep} />
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="skill"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <SkillSelection
              selectedSkill={data.selectedSkill}
              onSelect={(skill) => updateData({ selectedSkill: skill })}
              onNext={nextStep}
              onBack={prevStep}
            />
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="assessment"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <SkillAssessment
              selectedSkill={data.selectedSkill}
              answers={data.assessmentAnswers}
              onAnswer={(answers) => updateData({ assessmentAnswers: answers })}
              onNext={nextStep}
              onBack={prevStep}
            />
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <LearningPreferences
              studyHours={data.studyHours}
              weeklyDays={data.weeklyDays}
              learningStyles={data.learningStyles}
              onUpdate={updateData}
              onNext={nextStep}
              onBack={prevStep}
            />
          </motion.div>
        )}

        {step === 5 && (
          <motion.div
            key="goal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <GoalSelection
              selectedGoals={data.goals}
              onToggle={(goal) => {
                const newGoals = data.goals.includes(goal)
                  ? data.goals.filter((g) => g !== goal)
                  : [...data.goals, goal]
                updateData({ goals: newGoals })
              }}
              onNext={nextStep}
              onBack={prevStep}
            />
          </motion.div>
        )}

        {step === 6 && (
          <motion.div
            key="generation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <RoadmapGeneration data={data} onNext={nextStep} />
          </motion.div>
        )}

        {step === 7 && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            <DashboardEntry data={data} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
