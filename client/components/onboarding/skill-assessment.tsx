"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Check, AlertCircle } from "lucide-react"

const assessmentQuestions: Record<string, { id: string; question: string; options: string[] }[]> = {
  "ai-ml": [
    { id: "q1", question: "How comfortable are you with programming?", options: ["Never written code", "Know basic programming concepts", "Can write small Python programs", "Can build complete applications"] },
    { id: "q2", question: "What is your Python experience?", options: ["Never used Python", "Know variables, loops and functions", "Used NumPy or Pandas", "Built Python projects"] },
    { id: "q3", question: "How comfortable are you with mathematics?", options: ["Basic arithmetic only", "Algebra and equations", "Statistics and probability", "Linear algebra and calculus"] },
    { id: "q4", question: "Have you worked with datasets before?", options: ["Never", "Excel or Google Sheets", "Python Pandas", "Large datasets and data pipelines"] },
    { id: "q5", question: "Which best describes your ML knowledge?", options: ["No ML knowledge", "Understand ML concepts", "Trained ML models", "Built and deployed ML projects"] }
  ],
  "fullstack": [
    { id: "q1", question: "What is your programming experience?", options: ["No experience", "Basic syntax and logic", "Comfortable coding", "Built projects"] },
    { id: "q2", question: "What is your frontend experience?", options: ["None", "HTML and CSS", "JavaScript", "React, Vue or Angular"] },
    { id: "q3", question: "What is your backend experience?", options: ["None", "Basic APIs", "CRUD applications", "Production backend systems"] },
    { id: "q4", question: "What is your database experience?", options: ["None", "Basic SQL", "Designed databases", "Worked on production databases"] },
    { id: "q5", question: "Have you deployed websites or applications?", options: ["Never", "Localhost only", "Vercel, Netlify or Render", "Cloud deployment with CI/CD"] }
  ],
  "data-science": [
    { id: "q1", question: "What is your Python Experience?", options: ["Never used Python", "Basic Python", "Python with libraries", "Built projects"] },
    { id: "q2", question: "What is your Statistics Knowledge?", options: ["None", "Basic statistics", "Probability and distributions", "Advanced statistics"] },
    { id: "q3", question: "What is your Data Analysis Experience?", options: ["Never", "Excel", "Pandas", "Professional projects"] },
    { id: "q4", question: "What is your Visualization Experience?", options: ["Never", "Excel charts", "Matplotlib or Seaborn", "Dashboards and BI tools"] },
    { id: "q5", question: "What is your Real Dataset Experience?", options: ["Never", "Small datasets", "Kaggle datasets", "Industry-scale datasets"] }
  ],
  "dsa": [
    { id: "q1", question: "What is your Programming Skill?", options: ["Never coded", "Basic coding", "Comfortable coding", "Strong coding skills"] },
    { id: "q2", question: "What is your experience with Arrays and Loops?", options: ["Don't know", "Basic understanding", "Comfortable", "Very confident"] },
    { id: "q3", question: "What is your experience with Functions and Recursion?", options: ["Don't know", "Functions only", "Basic recursion", "Comfortable recursion"] },
    { id: "q4", question: "How many Coding Problems Solved?", options: ["0", "1-50", "50-200", "200+"] },
    { id: "q5", question: "What is your Competitive Programming Experience?", options: ["None", "Beginner", "Intermediate", "Advanced"] }
  ],
  "devops": [
    { id: "q1", question: "What is your Linux Knowledge?", options: ["None", "Basic usage", "Comfortable", "Daily user"] },
    { id: "q2", question: "What is your Command Line Experience?", options: ["Never used", "Basic commands", "Daily usage", "Advanced scripting"] },
    { id: "q3", question: "What is your Git Experience?", options: ["Never used Git", "Basic Git", "Branching and merging", "Team collaboration workflows"] },
    { id: "q4", question: "What is your Cloud Experience?", options: ["None", "Familiar with AWS/Azure/GCP", "Used cloud services", "Deployed applications on cloud"] },
    { id: "q5", question: "What is your Deployment Experience?", options: ["Never", "Static websites", "Full applications", "Production systems"] }
  ],
  "trading": [
    { id: "q1", question: "What is your Market Knowledge?", options: ["Complete beginner", "Know basic market terms", "Understand technical analysis", "Active trader"] },
    { id: "q2", question: "What is your experience with Chart Reading?", options: ["Never used charts", "Basic chart reading", "Regular chart analysis", "Advanced price action analysis"] },
    { id: "q3", question: "What is your knowledge of Risk Management?", options: ["No knowledge", "Basic stop-loss understanding", "Position sizing knowledge", "Advanced risk management"] },
    { id: "q4", question: "What is your Trading Experience?", options: ["None", "Less than 6 months", "6 months to 2 years", "More than 2 years"] },
    { id: "q5", question: "Do you maintain a Trading Journal?", options: ["Never maintained one", "Occasionally", "Consistently", "Detailed performance tracking"] }
  ],
  "cybersecurity": [
    { id: "q1", question: "What is your Networking Knowledge?", options: ["None", "Basic internet concepts", "Understand TCP/IP", "Strong networking knowledge"] },
    { id: "q2", question: "What is your Operating System Experience?", options: ["Basic user", "Power user", "Linux familiar", "Linux comfortable"] },
    { id: "q3", question: "What is your Programming Knowledge?", options: ["None", "Basic", "Intermediate", "Advanced"] },
    { id: "q4", question: "What is your Security Knowledge?", options: ["None", "Common threats awareness", "Security fundamentals", "Practical security experience"] },
    { id: "q5", question: "What is your Hands-on Experience?", options: ["None", "Labs and tutorials", "CTF challenges", "Real security projects"] }
  ],
  "default": [
    { id: "q1", question: "What is your experience in this field?", options: ["None", "Basic", "Intermediate", "Advanced"] },
    { id: "q2", question: "Have you built projects related to this?", options: ["No projects", "Small scripts", "Academic projects", "Production applications"] },
    { id: "q3", question: "How comfortable are you with the tools?", options: ["Never used", "Familiar", "Comfortable", "Expert"] },
    { id: "q4", question: "What is your theoretical knowledge?", options: ["None", "Basic concepts", "Strong understanding", "Deep expertise"] },
    { id: "q5", question: "What is your main goal for this track?", options: ["Exploration", "Job preparation", "Skill enhancement", "Mastery"] }
  ]
}

interface SkillAssessmentProps {
  selectedSkill: string | null
  answers: Record<string, string>
  onAnswer: (answers: Record<string, string>) => void
  onNext: () => void
  onBack: () => void
}

export function SkillAssessment({ selectedSkill, answers, onAnswer, onNext, onBack }: SkillAssessmentProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  
  const questions = assessmentQuestions[selectedSkill || "default"] || assessmentQuestions["default"]
  const currentQ = questions[currentQuestion]
  const isComplete = currentQuestion >= questions.length

  const handleAnswer = (answer: string) => {
    const newAnswers = { ...answers, [currentQ.question]: answer }
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
            <span>{Math.min(completionPercentage, 100)}% complete</span>
          </div>
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-border/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((answeredCount / questions.length) * 100, 100)}%` }}
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

              <div className="flex flex-col gap-3 max-w-sm mx-auto">
                {currentQ.options.map((option, idx) => (
                  <Button
                    key={idx}
                    onClick={() => handleAnswer(option)}
                    className="bg-surface-2 hover:bg-surface-3 border border-border text-foreground-muted hover:text-foreground rounded-md h-auto py-3 px-4 text-[13px] font-medium transition-colors text-left justify-start"
                  >
                    {option}
                  </Button>
                ))}
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
                Your response profile has been recorded. Let's customize your learning preferences.
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
