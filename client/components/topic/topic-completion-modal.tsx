"use client"

import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Zap, ChevronRight, Unlock } from "lucide-react"

interface TopicCompletionModalProps {
  isOpen: boolean
  topicTitle: string
  nextTopicTitle?: string
  nextTopicDuration?: string
  xpEarned?: number
  onContinue: () => void
  onClose: () => void
}

export function TopicCompletionModal({
  isOpen,
  topicTitle,
  nextTopicTitle,
  nextTopicDuration = "1.5 Hours",
  xpEarned = 100,
  onContinue,
  onClose,
}: TopicCompletionModalProps) {
  const audioFired = useRef(false)

  useEffect(() => {
    if (isOpen && !audioFired.current) {
      audioFired.current = true
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
        // Two-tone chime — subtle, premium
        const playTone = (freq: number, startAt: number, duration: number, volume: number) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.type = "sine"
          osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt)
          gain.gain.setValueAtTime(0, ctx.currentTime + startAt)
          gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startAt + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration)
          osc.start(ctx.currentTime + startAt)
          osc.stop(ctx.currentTime + startAt + duration)
        }
        playTone(660, 0, 0.4, 0.06)
        playTone(880, 0.12, 0.45, 0.05)
        playTone(1100, 0.28, 0.5, 0.04)
      } catch {}
    }
    if (!isOpen) audioFired.current = false
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.90, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none px-4"
          >
            <div
              className="pointer-events-auto relative w-full max-w-[360px] rounded-2xl border border-border overflow-hidden"
              style={{
                background: "oklch(0.09 0.015 265)",
                boxShadow:
                  "0 0 0 1px oklch(0.62 0.20 275 / 0.14), 0 40px 80px rgba(0,0,0,0.65), 0 0 80px oklch(0.62 0.20 275 / 0.07)",
              }}
            >
              {/* Top accent glow line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/80 to-transparent" />

              {/* Ambient glow behind trophy */}
              <div
                className="absolute -top-16 left-1/2 -translate-x-1/2 w-52 h-52 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.60 0.16 155 / 0.10), transparent 70%)",
                }}
              />

              <div className="relative z-10 p-7 space-y-5">

                {/* ── Mastered state ── */}
                <motion.div
                  className="flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08, duration: 0.32 }}
                >
                  {/* Icon with expanding ring */}
                  <div className="relative mb-4">
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.12, type: "spring", stiffness: 260, damping: 16 }}
                      className="w-[60px] h-[60px] rounded-2xl flex items-center justify-center border"
                      style={{
                        background: "oklch(0.60 0.16 155 / 0.13)",
                        borderColor: "oklch(0.60 0.16 155 / 0.45)",
                        boxShadow: "0 0 28px oklch(0.60 0.16 155 / 0.18)",
                      }}
                    >
                      <CheckCircle2 className="w-[26px] h-[26px] text-success" />
                    </motion.div>
                    {/* Expanding ring pulse */}
                    <motion.div
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.75, opacity: 0 }}
                      transition={{ delay: 0.28, duration: 0.9, ease: "easeOut" }}
                      className="absolute inset-0 rounded-2xl border"
                      style={{ borderColor: "oklch(0.60 0.16 155 / 0.35)" }}
                    />
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22, duration: 0.28 }}
                  >
                    <p className="text-mono text-[9px] text-success uppercase tracking-widest font-semibold mb-1.5">
                      ✓ Topic Mastered
                    </p>
                    <h2 className="text-display text-[21px] font-bold text-foreground tracking-tight leading-tight">
                      {topicTitle}
                    </h2>
                  </motion.div>
                </motion.div>

                {/* ── XP earned ── */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32, duration: 0.28 }}
                  className="flex justify-center"
                >
                  <div
                    className="flex items-center gap-2.5 px-4 py-2 rounded-full border"
                    style={{
                      background: "oklch(0.62 0.20 275 / 0.07)",
                      borderColor: "oklch(0.62 0.20 275 / 0.22)",
                    }}
                  >
                    <Zap className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    <XPCountUp target={xpEarned} startDelay={0.48} />
                    <span className="text-mono text-[11px] text-foreground-subtle">XP Earned</span>
                  </div>
                </motion.div>

                {/* ── Next topic unlock ── */}
                {nextTopicTitle && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    <div
                      className="relative overflow-hidden rounded-xl border p-4"
                      style={{
                        background: "oklch(0.62 0.20 275 / 0.055)",
                        borderColor: "oklch(0.62 0.20 275 / 0.22)",
                      }}
                    >
                      {/* Shimmer sweep */}
                      <motion.div
                        initial={{ x: "-110%" }}
                        animate={{ x: "210%" }}
                        transition={{ delay: 0.72, duration: 1.0, ease: "easeInOut" }}
                        className="absolute inset-y-0 w-1/3 pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, oklch(0.62 0.20 275 / 0.09), transparent)",
                        }}
                      />
                      <div className="relative z-10 flex items-start gap-3">
                        <motion.div
                          initial={{ rotate: -20, scale: 0.65 }}
                          animate={{ rotate: 0, scale: 1 }}
                          transition={{ delay: 0.62, type: "spring", stiffness: 340, damping: 18 }}
                          className="flex-shrink-0 mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center border"
                          style={{
                            background: "oklch(0.62 0.20 275 / 0.14)",
                            borderColor: "oklch(0.62 0.20 275 / 0.32)",
                          }}
                        >
                          <Unlock className="w-[15px] h-[15px] text-accent" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="text-mono text-[9px] text-accent uppercase tracking-widest font-semibold mb-0.5">
                            New Topic Unlocked
                          </p>
                          <p className="text-[14px] font-semibold text-foreground leading-snug">
                            {nextTopicTitle}
                          </p>
                          <p className="text-mono text-[10px] text-foreground-subtle mt-0.5">
                            Estimated Time: {nextTopicDuration}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── CTAs ── */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.62, duration: 0.28 }}
                  className="flex flex-col gap-2"
                >
                  <button
                    onClick={onContinue}
                    className="group w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border text-[13px] font-semibold transition-all duration-200 active:scale-[0.98]"
                    style={{
                      background:
                        "linear-gradient(135deg, oklch(0.62 0.20 275 / 0.22), oklch(0.62 0.20 275 / 0.10))",
                      borderColor: "oklch(0.62 0.20 275 / 0.42)",
                      color: "oklch(0.78 0.16 275)",
                      boxShadow: "0 0 18px oklch(0.62 0.20 275 / 0.09)",
                    }}
                  >
                    Continue Learning
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-2.5 text-[12px] font-medium text-foreground-subtle hover:text-foreground-muted transition-colors rounded-lg"
                  >
                    Review this topic
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── XP Count-Up ──────────────────────────────────────────────────────────

function XPCountUp({ target, startDelay }: { target: number; startDelay: number }) {
  const spanRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const timeout = setTimeout(() => {
      const startTime = performance.now()
      const dur = 900 // ms

      const tick = (now: number) => {
        const t = Math.min((now - startTime) / dur, 1)
        // Ease out expo
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        const val = Math.round(target * eased)
        if (spanRef.current) spanRef.current.textContent = `+${val}`
        if (t < 1) requestAnimationFrame(tick)
      }

      requestAnimationFrame(tick)
    }, startDelay * 1000)

    return () => clearTimeout(timeout)
  }, [target, startDelay])

  return (
    <span
      ref={spanRef}
      className="text-mono text-[15px] font-bold text-accent tabular-nums"
    >
      +0
    </span>
  )
}
