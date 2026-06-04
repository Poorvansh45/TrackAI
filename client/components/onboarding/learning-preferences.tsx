"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ArrowLeft, ArrowRight, Clock, Calendar, BookOpen, Video, Headphones, PenTool, Check } from "lucide-react"

const LEARNING_STYLE_OPTIONS = [
  { id: "visual", name: "Visual", description: "Videos & diagrams", icon: Video },
  { id: "reading", name: "Reading", description: "Articles & docs", icon: BookOpen },
  { id: "audio", name: "Audio", description: "Podcasts & lectures", icon: Headphones },
  { id: "hands-on", name: "Hands-on", description: "Projects & coding", icon: PenTool },
]

interface LearningPreferencesProps {
  studyHours: number
  weeklyDays: number
  learningStyles: string[]
  onUpdate: (updates: { studyHours?: number; weeklyDays?: number; learningStyles?: string[] }) => void
  onNext: () => void
  onBack: () => void
}

export function LearningPreferences({ studyHours, weeklyDays, learningStyles, onUpdate, onNext, onBack }: LearningPreferencesProps) {
  const toggleStyle = (styleId: string) => {
    const newStyles = learningStyles.includes(styleId)
      ? learningStyles.filter((s) => s !== styleId)
      : [...learningStyles, styleId]
    onUpdate({ learningStyles: newStyles })
  }

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
              Configuration
            </span>
          </div>
          <h2 className="text-display text-3xl sm:text-4xl text-foreground mb-2">
            Learning <span className="text-accent">Preferences</span>
          </h2>
          <p className="text-foreground-muted text-[14px]">
            Configure your pace and preferences to match your learning schedule.
          </p>
        </motion.div>

        <div className="space-y-4">
          {/* Daily study hours */}
          <div className="surface-card p-5">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Daily Study Target</h3>
                <p className="text-[11px] text-foreground-subtle">How many hours can you dedicate each day?</p>
              </div>
            </div>
            <div className="px-1.5">
              <Slider
                value={[studyHours]}
                onValueChange={([value]) => onUpdate({ studyHours: value })}
                min={1}
                max={8}
                step={0.5}
                className="mb-3"
              />
              <div className="flex justify-between text-mono text-[10px] text-foreground-subtle">
                <span>1.0h</span>
                <span className="text-accent font-semibold">{studyHours.toFixed(1)}h / day</span>
                <span>8.0h</span>
              </div>
            </div>
          </div>

          {/* Weekly availability */}
          <div className="surface-card p-5">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center text-accent">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-foreground">Weekly Schedule</h3>
                <p className="text-[11px] text-foreground-subtle">How many days per week are you active?</p>
              </div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  key={day}
                  onClick={() => onUpdate({ weeklyDays: day })}
                  className={`flex-1 py-2 rounded-md text-[13px] font-mono border transition-all ${
                    day <= weeklyDays
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "bg-surface-2 text-foreground-subtle border-border/60 hover:bg-surface-2/80 hover:border-border"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
            <p className="text-right text-mono text-[10px] text-foreground-subtle mt-2.5">
              {weeklyDays} day{weeklyDays > 1 ? "s" : ""} per week
            </p>
          </div>

          {/* Learning style - Multi-select */}
          <div className="surface-card p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-1">Preferred Medium</h3>
            <p className="text-[11px] text-foreground-subtle mb-4">Select all content types that match your style.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LEARNING_STYLE_OPTIONS.map((style) => {
                const isSelected = learningStyles.includes(style.id)
                return (
                  <button
                    key={style.id}
                    onClick={() => toggleStyle(style.id)}
                    className={`relative flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "bg-surface-2 border-accent"
                        : "bg-surface-1/50 border-border/60 hover:bg-surface-1 hover:border-border"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded flex items-center justify-center ${
                      isSelected ? "bg-accent/15 text-accent" : "bg-surface-2 text-foreground-subtle"
                    }`}>
                      <style.icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className={`text-[12px] font-semibold ${isSelected ? "text-foreground" : "text-foreground-muted"}`}>
                        {style.name}
                      </div>
                      <div className="text-[10px] text-foreground-subtle">{style.description}</div>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-accent-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-between items-center mt-8"
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
