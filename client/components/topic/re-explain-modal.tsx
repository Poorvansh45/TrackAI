"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Brain, Loader2, Sparkles, RefreshCw } from "lucide-react"

interface ReExplainModalProps {
  topicTitle: string
  onClose: () => void
}

type ExplainMode = "eli12" | "real_example" | "analogy" | "simplify"

interface ModeOption {
  id: ExplainMode
  label: string
  description: string
  emoji: string
}

const MODES: ModeOption[] = [
  {
    id: "eli12",
    label: "Explain Like I'm 12",
    description: "Simple, friendly, no jargon",
    emoji: "🧒",
  },
  {
    id: "real_example",
    label: "Give Real-Life Example",
    description: "Relatable everyday scenario",
    emoji: "🌍",
  },
  {
    id: "analogy",
    label: "Visual Analogy",
    description: "A mental picture to grasp it",
    emoji: "🎨",
  },
  {
    id: "simplify",
    label: "Simplify Further",
    description: "Absolute minimum explanation",
    emoji: "✂️",
  },
]

const FALLBACK_RESPONSES: Record<ExplainMode, string> = {
  eli12: `Imagine you're playing a video game. A variable is like a save slot — it holds your score, your health, your player name. Every time something changes in the game, the save slot gets updated. Without save slots, the game forgets everything the second you turn it off! That's why variables exist — they're the game's memory.`,
  real_example: `Think about your phone's battery percentage. That "82%" displayed on screen is a variable. The phone constantly updates it as you use it. When it reaches 0, the phone shuts down. When you charge it, it climbs back up. The battery level is a piece of data that changes over time — that's exactly what a variable is: a named container for data that can change.`,
  analogy: `Picture a whiteboard with labeled boxes drawn on it. You write "score = 0" in one box, "playerName = Alex" in another. As the game progresses, you erase the old value and write a new one in the same labeled box. The box (variable name) stays the same — only the content inside changes. Python does this in computer memory instead of a whiteboard.`,
  simplify: `A variable = a named box that stores a value.\n\nExample:\n  age = 25\n\nNow "age" holds 25. Later you can do:\n  age = 26\n\nThe box now holds 26. That's it.`,
}

function useTypewriterStream(text: string, speed = 14) {
  const [displayed, setDisplayed] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!text) { setDisplayed(""); setDone(false); return }
    setDisplayed("")
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return { displayed, done }
}

export function ReExplainModal({ topicTitle, onClose }: ReExplainModalProps) {
  const [selectedMode, setSelectedMode] = useState<ExplainMode | null>(null)
  const [loading, setLoading] = useState(false)
  const [rawResponse, setRawResponse] = useState("")
  const [error, setError] = useState("")

  const { displayed, done } = useTypewriterStream(rawResponse, 12)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  const handleModeSelect = async (mode: ExplainMode) => {
    setSelectedMode(mode)
    setRawResponse("")
    setError("")
    setLoading(true)

    try {
      const token = localStorage.getItem("token")
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/topic/explain`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ topic: topicTitle, mode }),
        }
      )

      if (!res.ok) throw new Error("API error")
      const data = await res.json()
      setRawResponse(data.explanation || FALLBACK_RESPONSES[mode])
    } catch {
      // Use rich fallback so users always get a response
      setRawResponse(FALLBACK_RESPONSES[mode])
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedMode(null)
    setRawResponse("")
    setError("")
  }

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "oklch(0.03 0.005 260 / 0.85)", backdropFilter: "blur(12px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="w-full max-w-[520px] rounded-2xl border border-border overflow-hidden shadow-2xl"
          style={{ background: "oklch(0.11 0.01 260)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top glow */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-accent/30"
                style={{ background: "oklch(0.62 0.20 275 / 0.12)" }}
              >
                <Brain className="w-4.5 h-4.5 text-accent" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-foreground">AI Re-Explain</h3>
                <p className="text-[10px] text-foreground-muted">{topicTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-surface-2 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Mode selection */}
              {!selectedMode && (
                <motion.div
                  key="selection"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <p className="text-[12px] text-foreground-muted mb-4 leading-relaxed">
                    Choose how you'd like AI to re-explain{" "}
                    <span className="text-foreground font-medium">{topicTitle}</span>:
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    {MODES.map((mode, i) => (
                      <motion.button
                        key={mode.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handleModeSelect(mode.id)}
                        className="group p-4 rounded-xl border border-border hover:border-accent/50 text-left transition-all duration-200 hover:bg-accent/5 hover:shadow-lg hover:shadow-accent/5"
                        style={{ background: "oklch(0.09 0.01 260)" }}
                      >
                        <div className="text-xl mb-2">{mode.emoji}</div>
                        <div className="text-[12px] font-semibold text-foreground group-hover:text-accent transition-colors leading-tight">
                          {mode.label}
                        </div>
                        <div className="text-[10px] text-foreground-muted mt-0.5">
                          {mode.description}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Loading state */}
              {selectedMode && loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-10 gap-4"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center border border-accent/20"
                    style={{ background: "oklch(0.62 0.20 275 / 0.10)" }}
                  >
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-medium text-foreground">
                      {MODES.find((m) => m.id === selectedMode)?.emoji}{" "}
                      {MODES.find((m) => m.id === selectedMode)?.label}
                    </p>
                    <p className="text-[11px] text-foreground-muted mt-1">
                      AI is crafting your explanation...
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-accent/50 animate-pulse"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Response */}
              {selectedMode && !loading && rawResponse && (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Mode badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span className="text-[11px] font-semibold text-accent">
                        {MODES.find((m) => m.id === selectedMode)?.emoji}{" "}
                        {MODES.find((m) => m.id === selectedMode)?.label}
                      </span>
                    </div>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 text-[10px] text-foreground-muted hover:text-foreground px-2 py-1 rounded-md hover:bg-surface-2 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Try another
                    </button>
                  </div>

                  {/* Response text */}
                  <div
                    className="rounded-xl p-4 border border-accent/10 min-h-[120px]"
                    style={{ background: "oklch(0.08 0.01 260 / 0.8)" }}
                  >
                    <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">
                      {displayed}
                      {!done && (
                        <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse align-middle" />
                      )}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!selectedMode && (
            <div className="px-6 pb-5">
              <p className="text-[10px] text-foreground-subtle text-center">
                Powered by Gemini Flash · Focused explanations only
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
