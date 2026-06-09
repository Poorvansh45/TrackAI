"use client"

import { BarChart3, TrendingUp, Clock, Target, Calendar, Award, AlertTriangle, ShieldCheck } from "lucide-react"
import { PageWrapper } from "@/components/dashboard/page-wrapper"

const monthlyTrend = [
  { week: "Wk 1", hours: 14.5, accuracy: 82 },
  { week: "Wk 2", hours: 18.2, accuracy: 85 },
  { week: "Wk 3", hours: 24.5, accuracy: 88 },
  { week: "Wk 4", hours: 12.0, accuracy: 90 }, // Current partial
]

const weakAreas = [
  { name: "Vector Graph Indexing (HNSW)", count: 3, score: "45%" },
  { name: "Chunking & Text Splitting", count: 2, score: "55%" },
  { name: "Retrieval-Augmented Benchmarks", count: 1, score: "62%" }
]

export default function AnalyticsPage() {
  return (
    <PageWrapper maxWidth="lg">
            {/* Header */}
            <div className="border-b border-border/40 pb-5 mb-6 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
                  Performance <span className="text-accent">Analytics</span>
                </h1>
                <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider">
                  SYSTEM LEVEL: AUDIT REPORT & METRICS ENGINE
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-mono text-[10px] text-foreground-subtle bg-surface-1 border border-border px-3 py-1.5 rounded">
                <Calendar className="w-3.5 h-3.5" />
                <span>LAST 30 DAYS</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="surface-card p-4">
                <div className="flex items-center justify-between gap-2 text-foreground-subtle mb-1">
                  <span className="text-mono text-[9px] uppercase">Study Time</span>
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="text-mono text-xl font-semibold text-foreground">69.2h</div>
                <p className="text-[10px] text-success mt-1">+12.4% vs last period</p>
              </div>

              <div className="surface-card p-4">
                <div className="flex items-center justify-between gap-2 text-foreground-subtle mb-1">
                  <span className="text-mono text-[9px] uppercase">Accuracy Rating</span>
                  <Target className="w-3.5 h-3.5" />
                </div>
                <div className="text-mono text-xl font-semibold text-foreground">88.2%</div>
                <p className="text-[10px] text-success mt-1">+1.5% target improvement</p>
              </div>

              <div className="surface-card p-4">
                <div className="flex items-center justify-between gap-2 text-foreground-subtle mb-1">
                  <span className="text-mono text-[9px] uppercase">XP Accumulated</span>
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div className="text-mono text-xl font-semibold text-foreground">4,250</div>
                <p className="text-[10px] text-foreground-subtle mt-1">Level 4 Candidate</p>
              </div>

              <div className="surface-card p-4">
                <div className="flex items-center justify-between gap-2 text-foreground-subtle mb-1">
                  <span className="text-mono text-[9px] uppercase">Verified Nodes</span>
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-mono text-xl font-semibold text-foreground">12 / 15</div>
                <p className="text-[10px] text-accent mt-1">3 verification pending</p>
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid lg:grid-cols-3 gap-6 items-start">
              {/* Trend Chart (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="surface-card p-5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[12px] font-semibold text-foreground">Weekly Study Distribution</span>
                    <span className="text-mono text-[10px] text-foreground-subtle">Target: 14.0h/wk</span>
                  </div>

                  {/* Simple Custom Bar Chart */}
                  <div className="h-48 bg-surface-2/20 border border-border/40 rounded-lg p-5 flex items-end justify-between gap-4">
                    {monthlyTrend.map((data, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <div className="w-full relative group">
                           {/* Accuracy marker dot */}
                          <div 
                            className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent z-10"
                            style={{ bottom: `${(data.accuracy / 100) * 100}px` }}
                          />
                          {/* Study hours bar */}
                          <div 
                            className="w-full bg-foreground-subtle/30 rounded-t-sm group-hover:bg-accent/40 transition-colors"
                            style={{ height: `${(data.hours / 30) * 100}px` }}
                          />
                        </div>
                        <span className="text-mono text-[9px] text-foreground-subtle">{data.week}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 mt-3 text-mono text-[9px] text-foreground-subtle">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-1 bg-foreground-subtle/30 rounded" />
                      <span>Study Hours (left scale)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span>Quiz Accuracy % (right scale)</span>
                    </div>
                  </div>
                </div>

                {/* Completion Prediction */}
                <div className="surface-card p-5 border border-border bg-surface-2/20 space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded bg-accent/15 flex items-center justify-center text-accent flex-shrink-0">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold text-foreground">Completion Projections</h3>
                      <p className="text-[11px] text-foreground-subtle mt-0.5 leading-relaxed">
                        At your current pace of 18.2 hours/week and average accuracy rate of 88.2%, 
                        you are on track to complete the remaining modules of the AI/ML Engineering curriculum early.
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-4 grid grid-cols-2 gap-4 text-left">
                    <div>
                      <span className="text-mono text-[9px] text-foreground-subtle uppercase">Target Date</span>
                      <div className="text-mono text-sm font-semibold text-accent mt-0.5">June 18, 2026</div>
                    </div>
                    <div>
                      <span className="text-mono text-[9px] text-foreground-subtle uppercase">Forecast Status</span>
                      <div className="text-mono text-sm font-semibold text-success mt-0.5">On Track</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weak areas (1/3 width) */}
              <div className="surface-card p-5 space-y-4">
                <div className="flex items-center gap-2 text-foreground font-semibold text-[12px]">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span>Topic Weakness Breakdown</span>
                </div>

                <div className="space-y-3">
                  {weakAreas.map((area, idx) => (
                    <div key={idx} className="p-3 bg-surface-2/40 border border-border/40 rounded-lg space-y-1">
                      <div className="text-[11px] font-semibold text-foreground leading-relaxed">
                        {area.name}
                      </div>
                      <div className="flex items-center justify-between text-mono text-[9px] text-foreground-subtle pt-1">
                        <span>Failed: {area.count} times</span>
                        <span className="text-destructive font-semibold">Score: {area.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
    </PageWrapper>
  )
}
