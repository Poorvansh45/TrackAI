"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Briefcase, GraduationCap, Rocket, DollarSign, Heart, Check } from "lucide-react"

const goals = [
  { 
    id: "internship", 
    name: "Internship Preparation", 
    description: "Build portfolios and practice interviews to land a tech internship.",
    icon: GraduationCap
  },
  { 
    id: "placement", 
    name: "Job Placement", 
    description: "Deep-dive into advanced technical tracks for full-time roles.",
    icon: Briefcase
  },
  { 
    id: "startup", 
    name: "Startup & SaaS Building", 
    description: "Learn practical production skills to prototype and launch products.",
    icon: Rocket
  },
  { 
    id: "freelancing", 
    name: "Freelancing & Agency", 
    description: "Build robust standalone client projects and manage tech deliverables.",
    icon: DollarSign
  },
  { 
    id: "personal", 
    name: "Personal Growth & Skill-up", 
    description: "Learn for self-improvement and stay ahead of the technology curve.",
    icon: Heart
  },
]

interface GoalSelectionProps {
  selectedGoals: string[]
  onToggle: (goal: string) => void
  onNext: () => void
  onBack: () => void
}

export function GoalSelection({ selectedGoals, onToggle, onNext, onBack }: GoalSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 py-20">
      <div className="w-full max-w-[650px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-mono text-[11px] text-accent uppercase tracking-wider font-semibold">
              Intent
            </span>
          </div>
          <h2 className="text-display text-3xl sm:text-4xl text-foreground mb-2">
            Identify Your <span className="text-accent">Goal Path</span>
          </h2>
          <p className="text-foreground-muted text-[14px]">
            Select one or more goals to specialize your AI mentor&apos;s recommendations.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="space-y-2.5 mb-8"
        >
          {goals.map((goal, index) => {
            const isSelected = selectedGoals.includes(goal.id)
            return (
              <button
                key={goal.id}
                onClick={() => onToggle(goal.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "bg-surface-2 border-accent"
                    : "bg-surface-1/50 border-border/60 hover:bg-surface-1 hover:border-border"
                }`}
              >
                <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "bg-accent/15 text-accent" : "bg-surface-2 text-foreground-subtle"
                }`}>
                  <goal.icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={`text-[13px] font-semibold ${isSelected ? "text-foreground" : "text-foreground-muted"}`}>
                    {goal.name}
                  </h3>
                  <p className="text-[11px] text-foreground-subtle truncate max-w-[400px]">
                    {goal.description}
                  </p>
                </div>

                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  isSelected ? "border-accent bg-accent text-accent-foreground" : "border-border bg-surface-2"
                }`}>
                  {isSelected && <Check className="w-2.5 h-2.5" />}
                </div>
              </button>
            )
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center"
        >
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-[13px] text-foreground-muted hover:text-foreground hover:bg-transparent transition-colors px-0 h-9"
          >
            <ArrowLeft className="mr-2 w-3.5 h-3.5" />
            Back
          </Button>
          <Button
            onClick={onNext}
            disabled={selectedGoals.length === 0}
            className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-5 text-[13px] font-medium transition-colors"
          >
            Generate Roadmap
            <ArrowRight className="ml-2 w-3.5 h-3.5" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
