"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Play, Lock, Clock, Route } from "lucide-react"

const nodes = [
  { id: "RD-001", name: "Python Fundamentals", status: "completed" as const, time: "12h", mastery: 95 },
  { id: "RD-002", name: "APIs & Web Scraping", status: "completed" as const, time: "8h", mastery: 88 },
  { id: "RD-003", name: "ML Fundamentals", status: "completed" as const, time: "16h", mastery: 82 },
  { id: "RD-004", name: "RAG Systems", status: "current" as const, time: "~14h", mastery: 35 },
  { id: "RD-005", name: "LangGraph & Agents", status: "locked" as const, time: "~18h", mastery: 0 },
  { id: "RD-006", name: "Production Deploy", status: "locked" as const, time: "~10h", mastery: 0 },
]

function NodeCard({ node, index }: { node: typeof nodes[0]; index: number }) {
  const isCompleted = node.status === "completed"
  const isCurrent = node.status === "current"
  const isLocked = node.status === "locked"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="relative group"
    >
      <div
        className={`surface-card p-4 hover-lift hover-border transition-all ${
          isCurrent ? "border-accent" : ""
        } ${isLocked ? "opacity-50" : ""}`}
      >
        {/* Node ID */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-mono text-[10px] text-foreground-subtle">{node.id}</span>
          {isCompleted && <CheckCircle2 className="w-4 h-4 text-success" />}
          {isCurrent && <Play className="w-4 h-4 text-accent" />}
          {isLocked && <Lock className="w-3.5 h-3.5 text-foreground-subtle" />}
        </div>

        {/* Name */}
        <h4 className={`text-[14px] text-emphasis mb-2 ${isLocked ? "text-foreground-subtle" : "text-foreground"}`}>
          {node.name}
        </h4>

        {/* Time estimate */}
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className="w-3 h-3 text-foreground-subtle" />
          <span className="text-mono text-[11px] text-foreground-subtle">{node.time}</span>
        </div>

        {/* Mastery bar */}
        {!isLocked && (
          <div>
            <div className="flex justify-between text-mono text-[10px] mb-1">
              <span className="text-foreground-subtle">Mastery</span>
              <span className={isCurrent ? "text-accent" : "text-success"}>{node.mastery}%</span>
            </div>
            <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${node.mastery}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className={`h-full rounded-full ${isCurrent ? "bg-accent" : "bg-success"}`}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {isCurrent && (
          <div className="flex gap-2 mt-3">
            <button className="text-mono text-[10px] text-accent hover:text-accent-hover transition-colors">
              Take Quiz →
            </button>
            <button className="text-mono text-[10px] text-foreground-subtle hover:text-foreground transition-colors">
              Gen Notes →
            </button>
          </div>
        )}
      </div>

      {/* Connector line (vertical for mobile, horizontal for desktop) */}
      {index < nodes.length - 1 && (
        <div className="hidden md:block absolute top-1/2 -right-4 w-4 h-px">
          <div className={`h-px w-full ${isCompleted ? "bg-accent/40" : "bg-border"}`} />
        </div>
      )}
    </motion.div>
  )
}

export function RoadmapVisualization() {
  return (
    <section className="py-20" id="roadmap">
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
              <Route className="w-3.5 h-3.5 text-accent" />
            </div>
            <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">
              Section 02
            </span>
          </div>

          <h2 className="text-display text-3xl sm:text-4xl mb-3 leading-[1.15] max-w-lg">
            Adaptive Roadmaps That{" "}
            <span className="text-accent">Evolve With You</span>
          </h2>

          <p className="text-foreground-muted text-[15px] leading-relaxed max-w-lg">
            Connected milestone nodes with real-time progress tracking. 
            Every node unlocks when prerequisites are verified — not just watched.
          </p>
        </motion.div>

        {/* Roadmap grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {nodes.map((node, i) => (
            <NodeCard key={node.id} node={node} index={i} />
          ))}
        </div>

        {/* Track progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-8 surface-card p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[13px] text-emphasis text-foreground">AI/ML Track Progress</span>
            <span className="text-mono text-[12px] text-accent">50%</span>
          </div>
          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "50%" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-accent rounded-full"
            />
          </div>
          <div className="flex justify-between mt-1.5 text-mono text-[10px] text-foreground-subtle">
            <span>3 completed</span>
            <span>3 remaining</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
