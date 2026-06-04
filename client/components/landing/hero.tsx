"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Play, CheckCircle2, Lock, Sparkles, BarChart3, Clock, Target, Brain, FileText } from "lucide-react"
import Link from "next/link"

const roadmapNodes = [
  { label: "Python", status: "done" },
  { label: "APIs", status: "done" },
  { label: "ML Basics", status: "done" },
  { label: "RAG", status: "current" },
  { label: "Agents", status: "locked" },
]

export function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 overflow-hidden" id="hero">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left side — Content */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-1 mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-[12px] text-mono text-foreground-muted tracking-wide uppercase">
                AI Learning Command Deck
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-display text-4xl sm:text-5xl lg:text-[56px] mb-5 leading-[1.08]"
            >
              Stop Consuming Tutorials.{" "}
              <span className="text-accent">Start Verifying Skills.</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-foreground-muted text-[17px] leading-relaxed mb-8 max-w-[520px] mx-auto lg:mx-0"
            >
              Tracks AI builds personalized roadmaps, asks adaptive questions, 
              verifies understanding with quizzes, generates notes, tracks progress, 
              and helps you revise the right things at the right time.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <Link href="/onboarding">
                <Button
                  className="h-10 px-5 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md text-[14px] group"
                  id="hero-cta-primary"
                >
                  Start Setup
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Button
                variant="outline"
                className="h-10 px-5 border-border hover:bg-surface-1 text-foreground-muted hover:text-foreground rounded-md text-[14px]"
                id="hero-cta-secondary"
              >
                <Play className="mr-2 w-3.5 h-3.5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="flex flex-wrap justify-center lg:justify-start gap-8 mt-10 pt-8 border-t border-border"
            >
              {[
                { value: "10K+", label: "Active Learners" },
                { value: "95%", label: "Skills Verified" },
                { value: "50+", label: "Learning Tracks" },
              ].map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-xl text-emphasis text-foreground">{stat.value}</div>
                  <div className="text-[12px] text-mono text-foreground-muted mt-0.5">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right side — Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            className="relative"
          >
            <div className="surface-card p-5 space-y-3">
              {/* Dashboard header bar */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-accent/15 flex items-center justify-center">
                    <span className="text-accent text-emphasis text-xs">JD</span>
                  </div>
                  <div>
                    <div className="text-[13px] text-emphasis text-foreground">John Doe</div>
                    <div className="text-mono text-[11px] text-foreground-subtle">LVL 12 · 4,250 XP</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-2 border border-border">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-mono text-[11px] text-foreground-muted">7d streak</span>
                </div>
              </div>

              {/* Roadmap nodes */}
              <div className="surface-elevated rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">Roadmap · AI/ML Track</span>
                  <span className="text-mono text-[11px] text-accent">60%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {roadmapNodes.map((node, i) => (
                    <div key={node.label} className="flex items-center gap-1.5">
                      <div
                        className={`h-7 px-2.5 rounded-md flex items-center justify-center text-[11px] border transition-colors ${
                          node.status === "done"
                            ? "bg-accent-subtle border-accent/20 text-accent"
                            : node.status === "current"
                            ? "bg-accent text-accent-foreground border-accent"
                            : "bg-surface-2 border-border text-foreground-subtle"
                        }`}
                      >
                        {node.status === "done" ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : node.status === "locked" ? (
                          <Lock className="w-3 h-3 mr-1 opacity-50" />
                        ) : null}
                        <span className="text-mono">{node.label}</span>
                      </div>
                      {i < roadmapNodes.length - 1 && (
                        <div className={`w-3 h-px ${node.status === "done" ? "bg-accent/40" : "bg-border"}`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Two-column: AI Mentor + Quiz */}
              <div className="grid grid-cols-2 gap-3">
                {/* AI Mentor */}
                <div className="surface-elevated rounded-lg p-3.5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-md bg-accent/15 flex items-center justify-center">
                      <Brain className="w-3 h-3 text-accent" />
                    </div>
                    <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">AI Mentor</span>
                  </div>
                  <p className="text-[12px] text-foreground-muted leading-snug">
                    Ready for the RAG module? I suggest reviewing vector embeddings first.
                  </p>
                </div>

                {/* Quiz Verification */}
                <div className="surface-elevated rounded-lg p-3.5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-md bg-success-muted flex items-center justify-center">
                      <Target className="w-3 h-3 text-success" />
                    </div>
                    <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">Verification</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-foreground-muted">ML Basics</span>
                      <span className="text-mono text-success">92%</span>
                    </div>
                    <div className="h-1 bg-surface-1 rounded-full overflow-hidden">
                      <div className="h-full w-[92%] bg-success rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Two-column: Daily Mission + Progress */}
              <div className="grid grid-cols-2 gap-3">
                {/* Daily Mission */}
                <div className="surface-elevated rounded-lg p-3.5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-md bg-warning-muted flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-warning" />
                    </div>
                    <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">Mission</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-[11px]">
                      <CheckCircle2 className="w-3 h-3 text-success" />
                      <span className="text-foreground-muted line-through">Complete 1 lesson</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <div className="w-3 h-3 rounded-full border border-border" />
                      <span className="text-foreground">Pass quiz on APIs</span>
                    </div>
                  </div>
                </div>

                {/* Analytics */}
                <div className="surface-elevated rounded-lg p-3.5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-md bg-accent-muted flex items-center justify-center">
                      <BarChart3 className="w-3 h-3 text-accent" />
                    </div>
                    <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">Analytics</span>
                  </div>
                  <div className="flex items-end gap-1 h-8">
                    {[35, 55, 40, 70, 60, 45, 65].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm bg-accent/30"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Weak Topics strip */}
              <div className="surface-elevated rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-foreground-subtle" />
                  <span className="text-[12px] text-foreground-muted">
                    <span className="text-warning">3 weak topics</span> need revision
                  </span>
                </div>
                <span className="text-mono text-[11px] text-foreground-subtle">View all →</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
