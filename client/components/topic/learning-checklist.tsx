"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Circle, Trophy, ListChecks } from "lucide-react"

interface LearningChecklistProps {
  subtopics: string[]
  completedSubtopics: Set<string>
  onToggle: (subtopic: string) => void
  allMastered: boolean
}

export function LearningChecklist({
  subtopics,
  completedSubtopics,
  onToggle,
  allMastered,
}: LearningChecklistProps) {
  const completed = completedSubtopics.size
  const total = subtopics.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="rounded-xl border border-border overflow-hidden"
      style={{ background: "oklch(0.10 0.01 260 / 0.7)" }}
    >
      {/* Mastery celebration overlay */}
      <AnimatePresence>
        {allMastered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none z-10 rounded-xl"
            style={{
              background:
                "radial-gradient(ellipse at center, oklch(0.60 0.16 155 / 0.08), transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-5 pb-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
              <ListChecks className="w-3.5 h-3.5 text-accent" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">Learning Checklist</h2>
              <p className="text-[10px] text-foreground-muted">Track your understanding manually</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {allMastered ? (
              <motion.div
                key="mastered"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-success/40 bg-success/10"
              >
                <Trophy className="w-3 h-3 text-success" />
                <span className="text-[11px] font-semibold text-success">Topic Mastered</span>
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 border border-border"
              >
                <span className="text-mono text-[11px] font-semibold text-foreground">
                  {completed}
                </span>
                <span className="text-mono text-[11px] text-foreground-subtle">/ {total}</span>
                <span className="text-mono text-[10px] text-foreground-muted ml-0.5">
                  Complete
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-mono text-[10px]">
            <span className="text-foreground-subtle">Progress</span>
            <span
              className={`font-semibold ${
                allMastered ? "text-success" : "text-accent"
              }`}
            >
              {pct}%
            </span>
          </div>
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: allMastered
                  ? "oklch(0.60 0.16 155)"
                  : "linear-gradient(to right, oklch(0.62 0.20 275), oklch(0.70 0.22 280))",
              }}
            />
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="p-4 space-y-2">
        {subtopics.map((subtopic, i) => {
          const isDone = completedSubtopics.has(subtopic)
          return (
            <motion.button
              key={subtopic}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              onClick={() => onToggle(subtopic)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 text-left group ${
                isDone
                  ? "border-success/30 bg-success/5 hover:bg-success/8"
                  : "border-border hover:border-accent/40 hover:bg-accent/5"
              }`}
            >
              <div className="flex-shrink-0 transition-transform duration-150 group-hover:scale-110">
                <AnimatePresence mode="wait">
                  {isDone ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <CheckCircle2 className="w-4.5 h-4.5 text-success" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="circle"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Circle className="w-4.5 h-4.5 text-foreground-subtle/40 group-hover:text-accent/60 transition-colors" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <span
                className={`text-[12px] font-medium flex-1 transition-colors ${
                  isDone
                    ? "text-foreground-muted line-through decoration-foreground-subtle/40"
                    : "text-foreground"
                }`}
              >
                {subtopic}
              </span>

              {isDone && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-mono text-[9px] text-success font-semibold"
                >
                  ✓ Done
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
