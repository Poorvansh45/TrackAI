"use client"

import { motion } from "framer-motion"
import { BarChart3, TrendingUp, Award, Calendar, CheckCircle2 } from "lucide-react"

export function AnalyticsSection() {
  return (
    <section className="py-20 border-t border-border/40">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left — Content */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">
                Section 06
              </span>
            </div>

            <h2 className="text-display text-3xl sm:text-4xl mb-3 leading-[1.15] max-w-md">
              Measure Mastery, Not Just <span className="text-accent">Hours</span>
            </h2>

            <p className="text-foreground-muted text-[15px] leading-relaxed mb-8 max-w-md">
              Visualize your skill acquisition journey. Spot knowledge gaps, track consistency, 
              and see exactly when you&apos;ll be ready for your target goals.
            </p>

            <div className="space-y-3">
              {[
                "Targeted weakness identification based on quiz failures",
                "Projected mastery completion date based on pace",
                "Daily study time and precision metrics",
                "No bloat, clean data-driven command deck dashboards",
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

          {/* Right — Analytics Panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="surface-card overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-accent/10 flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div>
                    <div className="text-[13px] text-foreground text-emphasis">Progress Analytics</div>
                    <div className="text-mono text-[10px] text-foreground-subtle">Week 3 updates · Active status</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-success bg-success-muted border border-success/20 px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-mono text-[10px] font-medium">+12.4% this week</span>
                </div>
              </div>

              {/* Grid content */}
              <div className="p-5 space-y-6">
                {/* Metrics grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg">
                    <div className="text-mono text-[10px] text-foreground-subtle mb-1">STUDY TIME</div>
                    <div className="text-mono text-lg font-semibold text-foreground">24.5h</div>
                    <div className="text-mono text-[9px] text-success mt-0.5">+3.2h vs last week</div>
                  </div>
                  <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg">
                    <div className="text-mono text-[10px] text-foreground-subtle mb-1">ACCURACY</div>
                    <div className="text-mono text-lg font-semibold text-foreground">88.2%</div>
                    <div className="text-mono text-[9px] text-success mt-0.5">+1.5% mastery lift</div>
                  </div>
                  <div className="bg-surface-2/50 border border-border/60 p-3 rounded-lg">
                    <div className="text-mono text-[10px] text-foreground-subtle mb-1">VERIFIED SKILLS</div>
                    <div className="text-mono text-lg font-semibold text-foreground">12/15</div>
                    <div className="text-mono text-[9px] text-foreground-subtle mt-0.5">3 remaining</div>
                  </div>
                </div>

                {/* Simulated Chart */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground-subtle uppercase tracking-wider font-semibold">Weekly Study Distribution</span>
                    <span className="text-mono text-[10px] text-foreground-subtle">Daily target: 2h</span>
                  </div>
                  <div className="h-28 bg-surface-2/30 border border-border/40 rounded-lg p-3 flex items-end justify-between gap-2.5">
                    {[
                      { day: "Mon", hrs: 1.8, active: false },
                      { day: "Tue", hrs: 2.4, active: true },
                      { day: "Wed", hrs: 2.1, active: false },
                      { day: "Thu", hrs: 1.2, active: false },
                      { day: "Fri", hrs: 3.0, active: true },
                      { day: "Sat", hrs: 0.8, active: false },
                      { day: "Sun", hrs: 2.5, active: true },
                    ].map((d, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="w-full relative group">
                          {/* Daily bar */}
                          <div 
                            className={`w-full rounded-t-sm transition-all duration-300 ${
                              d.active ? "bg-accent" : "bg-foreground-subtle/30 group-hover:bg-foreground-subtle/50"
                            }`}
                            style={{ height: `${(d.hrs / 3.0) * 60}px` }}
                          />
                        </div>
                        <span className="text-mono text-[9px] text-foreground-subtle">{d.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estimated completion banner */}
                <div className="border border-border/80 bg-surface-2/40 px-4 py-3 rounded-lg flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 text-accent flex-shrink-0" />
                    <div>
                      <div className="text-[12px] text-foreground font-medium">Estimated Goal Completion</div>
                      <div className="text-[10px] text-foreground-subtle">Based on your learning preferences and quiz accuracy</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-mono text-[12px] text-accent font-semibold">June 18, 2026</span>
                    <div className="text-[9px] text-success">On Track</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
