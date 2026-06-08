"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Flame, Zap, Clock, Trophy, TrendingUp, Activity, Target, Calendar } from "lucide-react"

interface TrackInfoPanelProps {
  skill: string
  totalPhases: number
  completedNodes: number
  totalNodes: number
  currentPhaseLabel: string
  currentPhaseNumber: number
}

// Circular SVG progress ring
function RingProgress({ pct, size = 88, stroke = 6, color = "oklch(0.62 0.20 275)" }: {
  pct: number; size?: number; stroke?: number; color?: string
}) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="block">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="progress-ring-track" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        strokeWidth={stroke}
        stroke={color}
        className="progress-ring-fill"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
      />
    </svg>
  )
}

export function TrackInfoPanel({
  skill, totalPhases, completedNodes, totalNodes,
  currentPhaseLabel, currentPhaseNumber,
}: TrackInfoPanelProps) {
  const completionPct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0
  const xpEarned  = completedNodes * 120
  const xpTarget  = totalNodes * 120
  const xpPct     = xpTarget > 0 ? Math.round((xpEarned / xpTarget) * 100) : 0

  // Derive estimated completion from pace (assume 3 nodes/week)
  const remainingNodes = totalNodes - completedNodes
  const weeksLeft      = Math.ceil(remainingNodes / 3)
  const eta = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weeksLeft * 7)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }, [weeksLeft])

  const metrics = [
    { label: "Velocity",  value: "3 nodes/wk", icon: Activity,    color: "text-accent" },
    { label: "This Week", value: "4.5h logged", icon: Clock,       color: "text-warning" },
    { label: "Mastery",   value: `${completionPct}%`,              icon: Trophy,   color: "text-success" },
    { label: "Forecast",  value: eta,           icon: Calendar,    color: "text-accent" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-panel p-5 flex flex-col gap-5 h-fit lg:sticky lg:top-20"
    >
      {/* Track Badge */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-md bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-accent" />
          </div>
          <div>
            <p className="text-mono text-[9px] text-foreground-subtle uppercase tracking-widest">Active Track</p>
            <p className="text-[12px] font-semibold text-foreground leading-tight truncate max-w-[160px]">{skill}</p>
          </div>
        </div>
        <div className="phase-glow-line" />
      </div>

      {/* Circular completion ring */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <RingProgress pct={completionPct} size={96} stroke={7} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-bold text-foreground leading-none">{completionPct}%</span>
            <span className="text-mono text-[8px] text-foreground-subtle uppercase">done</span>
          </div>
        </div>
        <p className="text-[11px] text-foreground-muted">{completedNodes}/{totalNodes} topics complete</p>
      </div>

      <div className="phase-glow-line" />

      {/* Phase + XP stack */}
      <div className="space-y-3">
        {/* Current Phase */}
        <div className="ai-item px-3 py-2.5">
          <p className="text-mono text-[8px] text-foreground-subtle uppercase mb-1">Current Phase</p>
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-foreground truncate max-w-[140px]">{currentPhaseLabel}</p>
            <span className="text-mono text-[9px] text-accent font-bold ml-2 flex-shrink-0">P{currentPhaseNumber}</span>
          </div>
        </div>

        {/* XP Progress */}
        <div className="ai-item px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-mono text-[8px] text-foreground-subtle uppercase flex items-center gap-1">
              <Trophy className="w-3 h-3 text-warning" />XP Progress
            </p>
            <span className="text-mono text-[9px] text-warning font-bold">{xpEarned.toLocaleString()} XP</span>
          </div>
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(to right, oklch(0.62 0.20 275), oklch(0.70 0.22 280))" }}
            />
          </div>
          <p className="text-mono text-[8px] text-foreground-subtle mt-1 text-right">{xpEarned} / {xpTarget}</p>
        </div>

        {/* Streak */}
        <div className="ai-item px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-warning" />
            <div>
              <p className="text-mono text-[8px] text-foreground-subtle uppercase">Streak</p>
              <p className="text-[13px] font-bold text-foreground">7 days</p>
            </div>
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i < 7 ? "bg-warning/80" : "bg-surface-3"}`} />
            ))}
          </div>
        </div>

        {/* ETA */}
        <div className="ai-item px-3 py-2.5 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-accent flex-shrink-0" />
          <div>
            <p className="text-mono text-[8px] text-foreground-subtle uppercase">Est. Completion</p>
            <p className="text-[12px] font-semibold text-foreground">{eta}</p>
          </div>
        </div>
      </div>

      <div className="phase-glow-line" />

      {/* Learning Intelligence metrics — 2x2 grid */}
      <div>
        <p className="text-mono text-[9px] text-foreground-subtle uppercase mb-2.5 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-accent" />Learning Intelligence
        </p>
        <div className="grid grid-cols-2 gap-2">
          {metrics.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="metric-card px-2.5 py-2">
              <Icon className={`w-3 h-3 ${color} mb-1`} />
              <p className="text-mono text-[8px] text-foreground-subtle uppercase leading-none">{label}</p>
              <p className="text-[11px] font-semibold text-foreground mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
