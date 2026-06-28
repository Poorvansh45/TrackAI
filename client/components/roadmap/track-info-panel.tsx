"use client"

import { useMemo, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, Zap, Clock, Trophy, TrendingUp, Activity, Target, Calendar, ChevronRight } from "lucide-react"

interface TrackInfoPanelProps {
  skill: string
  totalPhases: number
  completedNodes: number
  totalNodes: number
  currentPhaseLabel: string
  currentPhaseNumber: number
}

function RingProgress({ pct, size = 88, stroke = 6, color = "oklch(0.62 0.20 275)" }: {
  pct: number; size?: number; stroke?: number; color?: string
}) {
  const r = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="block -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
        fill="none" stroke="oklch(0.18 0.01 260)" />
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke}
        fill="none" stroke={color} strokeLinecap="round"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  )
}

/** Read total XP from localStorage topic_progress_* keys */
function readTotalXPFromStorage(): number {
  try {
    let xp = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith("topic_progress_")) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const arr: string[] = JSON.parse(raw)
          // Full completion = 100 XP; partial = 0 (only rewarded on full)
          // We check by comparing vs topic subtopics count (assume 5 default)
          if (arr.length >= 5) xp += 100
        }
      }
    }
    return xp
  } catch {
    return 0
  }
}

export function TrackInfoPanel({
  skill, totalPhases, completedNodes, totalNodes,
  currentPhaseLabel, currentPhaseNumber,
}: TrackInfoPanelProps) {
  const [totalXP, setTotalXP] = useState(0)
  const [prevCompleted, setPrevCompleted] = useState(completedNodes)
  const [xpFlash, setXpFlash] = useState(false)

  // Read XP from localStorage and keep in sync with storage events
  useEffect(() => {
    const read = () => setTotalXP(readTotalXPFromStorage())
    read()
    window.addEventListener("storage", read)
    return () => window.removeEventListener("storage", read)
  }, [])

  // Flash XP when completedNodes increases
  useEffect(() => {
    if (completedNodes > prevCompleted) {
      setTotalXP(readTotalXPFromStorage())
      setXpFlash(true)
      const t = setTimeout(() => setXpFlash(false), 1800)
      setPrevCompleted(completedNodes)
      return () => clearTimeout(t)
    }
  }, [completedNodes, prevCompleted])

  const completionPct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0
  const xpTarget      = totalNodes * 100
  const xpPct         = xpTarget > 0 ? Math.min(100, Math.round((totalXP / xpTarget) * 100)) : 0

  const remainingNodes = totalNodes - completedNodes
  const weeksLeft      = Math.max(1, Math.ceil(remainingNodes / 3))
  const eta = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weeksLeft * 7)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }, [weeksLeft])

  const ringColor = completionPct === 100
    ? "oklch(0.60 0.16 155)"
    : "oklch(0.62 0.20 275)"

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass-panel p-5 flex flex-col gap-5 h-fit"
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
        <div className="relative w-24 h-24">
          <RingProgress pct={completionPct} size={96} stroke={7} color={ringColor} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-bold text-foreground leading-none">{completionPct}%</span>
            <span className="text-mono text-[8px] text-foreground-subtle uppercase">done</span>
          </div>
        </div>
        <p className="text-[11px] text-foreground-muted">
          {completedNodes}/{totalNodes} topics complete
        </p>
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

        {/* XP Progress — animated on topic completion */}
        <div className="ai-item px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-mono text-[8px] text-foreground-subtle uppercase flex items-center gap-1">
              <Trophy className="w-3 h-3 text-warning" />XP Progress
            </p>
            <AnimatePresence mode="wait">
              <motion.span
                key={totalXP}
                initial={xpFlash ? { scale: 1.3, color: "oklch(0.78 0.16 275)" } : false}
                animate={{ scale: 1, color: "oklch(0.75 0.12 60)" }}
                transition={{ duration: 0.5 }}
                className="text-mono text-[9px] font-bold"
                style={{ color: "oklch(0.75 0.12 60)" }}
              >
                {totalXP.toLocaleString()} XP
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(to right, oklch(0.62 0.20 275), oklch(0.70 0.22 280))" }}
            />
          </div>
          <p className="text-mono text-[8px] text-foreground-subtle mt-1 text-right">
            {totalXP} / {xpTarget} XP
          </p>
        </div>

        {/* Learning Streak */}
        <div className="ai-item px-3 py-2.5 flex items-center justify-between hover:border-warning/45 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-warning/15 border border-warning/30 flex items-center justify-center flex-shrink-0">
              <Flame className="w-4 h-4 text-warning fill-warning/20 animate-pulse" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-foreground leading-none">7 Days</p>
              <p className="text-[9px] text-foreground-subtle mt-0.5">Keep it up!</p>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle/50 group-hover:text-warning group-hover:translate-x-0.5 transition-all duration-200" />
        </div>

        {/* Completed topics stat */}
        <div className="ai-item px-3 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            <div>
              <p className="text-mono text-[8px] text-foreground-subtle uppercase">Completed</p>
              <div className="flex items-baseline gap-1">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={completedNodes}
                    initial={completedNodes > prevCompleted ? { scale: 1.25, color: "oklch(0.60 0.16 155)" } : false}
                    animate={{ scale: 1, color: "oklch(0.92 0.02 260)" }}
                    transition={{ duration: 0.45 }}
                    className="text-[18px] font-bold text-foreground"
                  >
                    {completedNodes}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[11px] text-foreground-subtle font-medium">
                  / {totalNodes} topics
                </span>
              </div>
            </div>
          </div>
          {/* Mini bar chart */}
          <div className="flex items-end gap-0.5 h-7">
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = (completedNodes / totalNodes) * 5 > i
              return (
                <motion.div
                  key={i}
                  className="w-1.5 rounded-sm"
                  animate={{ height: `${40 + i * 15}%` }}
                  style={{
                    background: filled
                      ? "oklch(0.62 0.20 275 / 0.8)"
                      : "oklch(0.18 0.01 260)",
                    minHeight: "4px",
                  }}
                />
              )
            })}
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

      {/* Metrics grid */}
      <div>
        <p className="text-mono text-[9px] text-foreground-subtle uppercase mb-2.5 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-accent" />Learning Intelligence
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Velocity",  value: "3 nodes/wk", icon: Activity,  color: "text-accent" },
            { label: "This Week", value: "4.5h logged", icon: Clock,     color: "text-warning" },
            { label: "Progress",  value: `${completionPct}%`, icon: Trophy, color: "text-success" },
            { label: "Forecast",  value: eta.replace(",", ""), icon: Calendar, color: "text-accent" },
          ].map(({ label, value, icon: Icon, color }) => (
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
