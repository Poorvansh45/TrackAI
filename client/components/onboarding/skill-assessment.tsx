"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Check, X, ShieldAlert } from "lucide-react"

const assessmentQuestions: Record<string, { id: string; question: string }[]> = {
  "ai-ml": [
    { id: "python", question: "Do you have experience with Python programming?" },
    { id: "math", question: "Are you comfortable with linear algebra and calculus?" },
    { id: "statistics", question: "Do you understand basic statistics and probability?" },
    { id: "ml-basics", question: "Have you built any machine learning models before?" },
    { id: "deep-learning", question: "Are you familiar with neural networks?" },
  ],
  "fullstack": [
    { id: "html-css", question: "Do you know HTML and CSS?" },
    { id: "javascript", question: "Are you comfortable with JavaScript?" },
    { id: "frameworks", question: "Have you used any frontend frameworks (React, Vue, etc.)?" },
    { id: "backend", question: "Have you built backend APIs before?" },
    { id: "databases", question: "Do you have experience with databases?" },
  ],
  "default": [
    { id: "basics", question: "Do you have any prior experience in this field?" },
    { id: "projects", question: "Have you built any projects before?" },
    { id: "theory", question: "Are you familiar with the theoretical concepts?" },
    { id: "tools", question: "Have you used industry-standard tools?" },
    { id: "advanced", question: "Are you ready for advanced topics?" },
  ],
}

interface SkillAssessmentProps {
  selectedSkill: string | null
  answers: Record<string, boolean>
  onAnswer: (answers: Record<string, boolean>) => void
  onNext: () => void
  onBack: () => void
}

export function SkillAssessment({ selectedSkill, answers, onAnswer, onNext, onBack }: SkillAssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  
  const questions = assessmentQuestions[selectedSkill || "default"] || assessmentQuestions["default"]
  const currentQ = questions[currentQuestion]
  const isComplete = currentQuestion >= questions.length

  const handleAnswer = (answer: boolean) => {
    const newAnswers = { ...answers, [currentQ.id]: answer }
    onAnswer(newAnswers)
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    } else {
      setCurrentQuestion(questions.length)
    }
  }

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    } else {
      onBack()
    }
  }

  const answeredCount = Object.keys(answers).length
  const completionPercentage = Math.round((answeredCount / questions.length) * 100)

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-[600px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-mono text-[11px] text-accent uppercase tracking-wider font-semibold">
              Assessment Mode
            </span>
          </div>
          <h2 className="text-display text-3xl sm:text-4xl text-foreground mb-2">
            Determine Your <span className="text-accent">Baseline</span>
          </h2>
          <p className="text-foreground-muted text-[14px]">
            Answer a few quick questions to customize your difficulty path.
          </p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-mono text-[10px] text-foreground-subtle mb-1.5">
            <span>Question {Math.min(currentQuestion + 1, questions.length)} of {questions.length}</span>
            <span>{completionPercentage}% complete</span>
          </div>
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-border/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(answeredCount / questions.length) * 100}%` }}
              transition={{ duration: 0.2 }}
              className="h-full bg-accent rounded-full"
            />
          </div>
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="surface-card p-8 text-center mb-8"
            >
              <p className="text-[15px] font-medium text-foreground mb-8 min-h-[50px] flex items-center justify-center">
                {currentQ.question}
              </p>

              <div className="flex justify-center gap-3">
                <Button
                  onClick={() => handleAnswer(false)}
                  className="bg-surface-2 hover:bg-surface-3 border border-border text-foreground-muted hover:text-foreground rounded-md h-10 px-6 text-[13px] font-medium transition-colors"
                >
                  No
                </Button>
                <Button
                  onClick={() => handleAnswer(true)}
                  className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-10 px-6 text-[13px] font-medium transition-colors"
                >
                  Yes
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="surface-card p-8 text-center mb-8"
            >
              <div className="w-10 h-10 rounded-md bg-success-muted flex items-center justify-center mx-auto mb-4">
                <Check className="w-5 h-5 text-success" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-2">Assessment Finished</h3>
              <p className="text-[13px] text-foreground-muted max-w-sm mx-auto leading-relaxed">
                Your response profile has been recorded. Let&apos;s customize your learning preferences.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-between items-center"
        >
          <Button
            variant="ghost"
            onClick={handleBack}
            className="text-[13px] text-foreground-muted hover:text-foreground hover:bg-transparent transition-colors px-0 h-9"
          >
            <ArrowLeft className="mr-2 w-3.5 h-3.5" />
            Back
          </Button>
          {isComplete && (
            <Button
              onClick={onNext}
              className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-5 text-[13px] font-medium transition-colors"
            >
              Continue
              <ArrowRight className="ml-2 w-3.5 h-3.5" />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
