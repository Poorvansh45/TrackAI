"use client"

import { motion } from "framer-motion"
import { Shield, Lock, ChevronRight } from "lucide-react"

interface VerificationQuizProps {
  topicTitle: string
}

export function VerificationQuiz({ topicTitle }: VerificationQuizProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="relative rounded-xl border border-border overflow-hidden"
      style={{ background: "oklch(0.10 0.01 260 / 0.7)" }}
    >
      {/* Subtle diagonal pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 8px,
            oklch(0.15 0.01 260) 8px,
            oklch(0.15 0.01 260) 9px
          )`,
        }}
      />

      <div className="relative z-10 p-6">
        <div className="flex items-start justify-between gap-4">
          {/* Left */}
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-foreground-subtle/20 flex-shrink-0"
              style={{ background: "oklch(0.15 0.01 260 / 0.8)" }}
            >
              <Shield className="w-5 h-5 text-foreground-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[14px] font-semibold text-foreground">Verification Quiz</h2>
                <span className="text-mono text-[9px] font-semibold px-2 py-0.5 rounded-full border border-foreground-subtle/20 bg-surface-2 text-foreground-subtle uppercase tracking-wider">
                  Coming Soon
                </span>
              </div>
              <p className="text-[12px] text-foreground-muted leading-relaxed max-w-sm">
                Prove your mastery of{" "}
                <span className="text-foreground font-medium">{topicTitle}</span> with an
                adaptive quiz. Earn XP and unlock the next topic.
              </p>

              {/* Feature preview chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                {["Adaptive Questions", "XP Rewards", "Skill Verification", "Instant Feedback"].map(
                  (feat) => (
                    <span
                      key={feat}
                      className="text-[9px] font-medium px-2 py-1 rounded-md border border-foreground-subtle/15 text-foreground-subtle"
                      style={{ background: "oklch(0.12 0.01 260)" }}
                    >
                      {feat}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Right — disabled button */}
          <button
            disabled
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-foreground-subtle/15 cursor-not-allowed opacity-50 text-[12px] font-semibold text-foreground-subtle"
            style={{ background: "oklch(0.12 0.01 260)" }}
          >
            <Lock className="w-3.5 h-3.5" />
            Start Quiz
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom progress preview */}
        <div className="mt-4 pt-4 border-t border-border/40 flex items-center gap-3">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="w-6 h-1.5 rounded-full"
                style={{ background: "oklch(0.18 0.01 260)" }}
              />
            ))}
          </div>
          <span className="text-mono text-[9px] text-foreground-subtle">
            5 questions · ~3 min
          </span>
        </div>
      </div>
    </motion.div>
  )
}
