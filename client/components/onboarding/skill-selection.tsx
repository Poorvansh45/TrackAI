"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Brain, Code, Database, Binary, Cloud, LineChart, Shield, TrendingUp, Sparkles } from "lucide-react"

const skills = [
  { id: "ai-ml", name: "AI/ML", icon: Brain },
  { id: "fullstack", name: "Full Stack", icon: Code },
  { id: "data-science", name: "Data Science", icon: Database },
  { id: "dsa", name: "DSA / Algorithms", icon: Binary },
  { id: "devops", name: "DevOps", icon: Cloud },
  { id: "trading", name: "Trading", icon: TrendingUp },
  { id: "cybersecurity", name: "Cybersecurity", icon: Shield },
  { id: "cloud", name: "Cloud Architecture", icon: LineChart },
  { id: "custom", name: "Custom Track", icon: Sparkles },
]

interface SkillSelectionProps {
  selectedSkill: string | null
  onSelect: (skill: string) => void
  onNext: () => void
  onBack: () => void
}

export function SkillSelection({ selectedSkill, onSelect, onNext, onBack }: SkillSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 py-20">
      <div className="w-full max-w-[800px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10"
        >
          <h2 className="text-display text-3xl sm:text-4xl text-foreground mb-3">
            Select Your <span className="text-accent">Learning Track</span>
          </h2>
          <p className="text-foreground-muted text-[14px] max-w-md mx-auto">
            Choose a track below. Your AI mentor will customize the roadmap based on this foundation.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10"
        >
          {skills.map((skill, index) => {
            const isSelected = selectedSkill === skill.id
            return (
              <button
                key={skill.id}
                onClick={() => onSelect(skill.id)}
                className={`flex flex-col items-start p-5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "bg-surface-2 border-accent"
                    : "bg-surface-1/50 border-border/60 hover:bg-surface-1 hover:border-border"
                }`}
              >
                <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-3 ${
                  isSelected ? "bg-accent/15 text-accent" : "bg-surface-2 text-foreground-muted"
                }`}>
                  <skill.icon className="w-4 h-4" />
                </div>
                <span className={`text-[13px] font-medium ${isSelected ? "text-foreground" : "text-foreground-muted"}`}>
                  {skill.name}
                </span>
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
            disabled={!selectedSkill}
            className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-5 text-[13px] font-medium transition-colors"
          >
            Continue
            <ArrowRight className="ml-2 w-3.5 h-3.5" />
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
