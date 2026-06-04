"use client"

import { motion } from "framer-motion"
import { Calendar, Clock, ChevronRight, Check } from "lucide-react"

const scheduleBlocks = [
  { time: "09:00 - 10:00", subject: "RAG Pipeline Setup", type: "study", active: false, done: true },
  { time: "13:00 - 13:30", subject: "Evaluation & Benchmarks Quiz", type: "quiz", active: true, done: false },
  { time: "16:00 - 17:00", subject: "Review Chunking Strategies", type: "review", active: false, done: false },
]

export function PlannerSection() {
  return (
    <section className="py-20 border-t border-border/40">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — Planner Grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="surface-card overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div>
                    <div className="text-[13px] text-foreground text-emphasis">Productivity Planner</div>
                    <div className="text-mono text-[10px] text-foreground-subtle">Today&apos;s Block Schedule</div>
                  </div>
                </div>
                <div className="text-mono text-[10px] text-foreground-subtle px-2 py-0.5 rounded bg-surface-2 border border-border">
                  Thu, Jun 4
                </div>
              </div>

              {/* Grid content */}
              <div className="p-4 space-y-3">
                {scheduleBlocks.map((block, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-4 p-3 rounded-lg border transition-all ${
                      block.active 
                        ? "bg-surface-2 border-accent/30 shadow-sm" 
                        : "bg-surface-1/50 border-border/60 hover:border-border/80"
                    }`}
                  >
                    <div className="flex items-center gap-2 mt-0.5 flex-shrink-0">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                        block.done 
                          ? "bg-success-muted border-success text-success" 
                          : block.active 
                            ? "border-accent bg-accent-subtle text-accent" 
                            : "border-border text-foreground-subtle"
                      }`}>
                        {block.done ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[13px] font-medium ${block.done ? "text-foreground-subtle line-through" : "text-foreground"}`}>
                          {block.subject}
                        </span>
                        <span className={`text-mono text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          block.type === "quiz" 
                            ? "bg-accent-subtle text-accent border border-accent/20" 
                            : block.type === "review"
                              ? "bg-warning-muted text-warning border border-warning/10"
                              : "bg-surface-3 text-foreground-subtle border border-border"
                        }`}>
                          {block.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-mono text-[10px] text-foreground-subtle">
                        <Clock className="w-3 h-3" />
                        <span>{block.time}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Day selector at bottom */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-foreground-subtle">Weekday Schedule</span>
                  <div className="flex items-center gap-1">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, idx) => (
                      <div 
                        key={idx} 
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-mono text-[10px] border ${
                          idx === 3 
                            ? "bg-accent text-accent-foreground border-accent font-semibold" 
                            : idx === 5 || idx === 6
                              ? "bg-transparent text-foreground-subtle/40 border-transparent"
                              : "bg-surface-2 text-foreground-subtle border-border"
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right — Content */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">
                Section 07
              </span>
            </div>

            <h2 className="text-display text-3xl sm:text-4xl mb-3 leading-[1.15] max-w-md">
              A Planner Built for <span className="text-accent">Deep Learning</span>
            </h2>

            <p className="text-foreground-muted text-[15px] leading-relaxed mb-8 max-w-md">
              Schedule dedicated learning blocks. Sync with your calendar and stay focused 
              with structured daily plans tailored to your goal timeline.
            </p>

            <div className="space-y-3">
              {[
                "Personalized learning block scheduling",
                "Calendar integration for automatic time blocking",
                "Buffer time calculations to prevent burnout",
                "Dedicated revision sessions automatically slotted in",
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-[14px] text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
