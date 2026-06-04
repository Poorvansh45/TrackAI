"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

interface WelcomeScreenProps {
  onNext: () => void
}

export function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="text-center max-w-lg mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* Logo Mark */}
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mx-auto mb-2">
            <span className="text-accent-foreground font-semibold text-base">T</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-display text-4xl sm:text-5xl text-foreground">
              Welcome to <span className="text-accent">Tracks AI</span>
            </h1>
            <p className="text-foreground-muted text-[15px] leading-relaxed max-w-md mx-auto">
              Let&apos;s configure your personalized learning cockpit. We will customize your roadmap, 
              assessment level, and study schedules.
            </p>
          </div>

          <div>
            <Button
              size="lg"
              onClick={onNext}
              className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-10 px-6 text-[13px] font-medium transition-colors"
            >
              Start Setup
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
