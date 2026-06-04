"use client"

import { motion } from "framer-motion"
import { Target, CheckCircle2, AlertTriangle, Circle, BarChart3 } from "lucide-react"

const quizTopics = [
  {
    topic: "Prompt Engineering",
    questions: 15,
    difficulty: "Intermediate",
    mastery: 88,
    status: "verified" as const,
  },
  {
    topic: "RAG Architecture",
    questions: 12,
    difficulty: "Advanced",
    mastery: 45,
    status: "needs-review" as const,
  },
  {
    topic: "Vector Databases",
    questions: 10,
    difficulty: "Intermediate",
    mastery: 72,
    status: "in-progress" as const,
  },
  {
    topic: "LangChain Basics",
    questions: 8,
    difficulty: "Beginner",
    mastery: 0,
    status: "untested" as const,
  },
]

const statusConfig = {
  verified: { icon: CheckCircle2, color: "text-success", bg: "bg-success-muted", label: "Verified" },
  "needs-review": { icon: AlertTriangle, color: "text-warning", bg: "bg-warning-muted", label: "Needs Review" },
  "in-progress": { icon: BarChart3, color: "text-accent", bg: "bg-accent-muted", label: "In Progress" },
  untested: { icon: Circle, color: "text-foreground-subtle", bg: "bg-surface-2", label: "Untested" },
}

export function FeaturesSection() {
  return (
    <section className="py-20" id="quizzes">
      <div className="max-w-[1200px] mx-auto px-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">
              Section 03 · Core Feature
            </span>
          </div>

          <h2 className="text-display text-3xl sm:text-4xl mb-3 leading-[1.15] max-w-lg">
            Skill Verification, Not{" "}
            <span className="text-accent">Passive Consumption</span>
          </h2>

          <p className="text-foreground-muted text-[15px] leading-relaxed max-w-lg">
            Adaptive quizzes that test real understanding. Every concept gets verified 
            through AI-generated questions that adjust to your level.
          </p>
        </motion.div>

        {/* Quiz cards grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {quizTopics.map((quiz, i) => {
            const config = statusConfig[quiz.status]
            const StatusIcon = config.icon
            return (
              <motion.div
                key={quiz.topic}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="surface-card p-5 hover-lift hover-border transition-all group"
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-[15px] text-emphasis text-foreground mb-0.5">{quiz.topic}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-mono text-[10px] text-foreground-subtle">{quiz.questions} questions</span>
                      <span className="text-foreground-subtle">·</span>
                      <span className="text-mono text-[10px] text-foreground-subtle">{quiz.difficulty}</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bg}`}>
                    <StatusIcon className={`w-3 h-3 ${config.color}`} />
                    <span className={`text-mono text-[10px] ${config.color}`}>{config.label}</span>
                  </div>
                </div>

                {/* Mastery meter */}
                <div className="mb-3">
                  <div className="flex justify-between text-mono text-[10px] mb-1.5">
                    <span className="text-foreground-subtle">Mastery</span>
                    <span className={quiz.mastery > 0 ? config.color : "text-foreground-subtle"}>
                      {quiz.mastery > 0 ? `${quiz.mastery}%` : "—"}
                    </span>
                  </div>
                  <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${quiz.mastery}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className={`h-full rounded-full ${
                        quiz.status === "verified"
                          ? "bg-success"
                          : quiz.status === "needs-review"
                          ? "bg-warning"
                          : "bg-accent"
                      }`}
                    />
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-3">
                    {quiz.status === "needs-review" && (
                      <span className="text-mono text-[10px] text-warning">
                        3 weak concepts
                      </span>
                    )}
                  </div>
                  <button className="text-mono text-[11px] text-accent hover:text-accent-hover transition-colors opacity-0 group-hover:opacity-100">
                    {quiz.status === "untested" ? "Start Quiz →" : quiz.status === "needs-review" ? "Revise →" : "Retake →"}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Question preview card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 }}
          className="mt-6 surface-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-mono text-[10px] text-foreground-subtle">LIVE PREVIEW</span>
            <span className="text-mono text-[10px] text-accent">Q4 of 15</span>
          </div>

          <p className="text-[14px] text-foreground mb-4 max-w-2xl">
            In a RAG pipeline, what is the primary role of the retriever component when processing a user query?
          </p>

          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { label: "A", text: "Generate the final response text", active: false },
              { label: "B", text: "Fetch relevant context from the vector store", active: true },
              { label: "C", text: "Embed the user query into vectors", active: false },
              { label: "D", text: "Fine-tune the language model weights", active: false },
            ].map((opt) => (
              <div
                key={opt.label}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg border transition-colors ${
                  opt.active
                    ? "border-accent bg-accent-subtle"
                    : "border-border bg-surface-2 hover:border-border"
                }`}
              >
                <span className={`text-mono text-[11px] ${opt.active ? "text-accent" : "text-foreground-subtle"}`}>
                  {opt.label}
                </span>
                <span className={`text-[13px] ${opt.active ? "text-accent" : "text-foreground-muted"}`}>
                  {opt.text}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
