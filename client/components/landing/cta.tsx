"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function CTASection() {
  return (
    <section className="py-24 border-t border-border/40 relative overflow-hidden">
      <div className="max-w-[800px] mx-auto px-5 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="surface-card rounded-2xl p-8 sm:p-12 text-center"
        >
          <h2 className="text-display text-3xl sm:text-4xl lg:text-5xl mb-4 leading-tight">
            Ready to <span className="text-accent">Verify Your Skills?</span>
          </h2>

          <p className="text-foreground-muted text-[15px] leading-relaxed mb-8 max-w-lg mx-auto">
            Build your personalized learning roadmap, test your mastery with adaptive quizzes, 
            and revise weak concepts under the guidance of an AI mentor.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
            <Link href="/onboarding" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent-hover text-accent-foreground w-full group rounded-md h-10 px-5 text-[13px] font-medium transition-colors"
              >
                Start Setup
                <ArrowRight className="ml-2 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-border bg-transparent hover:bg-surface-2 w-full sm:w-auto rounded-md h-10 px-5 text-[13px] font-medium text-foreground-muted hover:text-foreground transition-colors"
            >
              Watch Demo
            </Button>
          </div>

          <p className="mt-5 text-mono text-[10px] text-foreground-subtle">
            Free to start · Instant setup
          </p>
        </motion.div>
      </div>
    </section>
  )
}
