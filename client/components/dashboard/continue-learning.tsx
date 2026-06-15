"use client"

import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Play, Clock, CheckCircle2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useActiveTopic } from "@/hooks/use-active-topic"

export function ContinueLearning() {
  const router = useRouter()
  const { activeTopic } = useActiveTopic()

  const topic = activeTopic ?? {
    title: "Loading...",
    slug: "",
    phaseNumber: 1,
    phaseTitle: "Loading Track...",
    skill: "",
    totalSections: 5,
    completedSections: 0,
    progress: 0,
  }

  const moduleLabel = topic.skill
    ? `${topic.skill} · Phase ${topic.phaseNumber}`
    : `Phase ${topic.phaseNumber}`

  const timeLabel =
    topic.completedSections === 0
      ? "Start now"
      : `${topic.completedSections}/${topic.totalSections} done`

  const handleContinue = () => {
    if (topic.slug) router.push(`/topic/${topic.slug}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="surface-card p-5 relative overflow-hidden"
    >
      {/* Subtle glow behind active topic */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          background:
            "radial-gradient(ellipse at 0% 50%, oklch(0.62 0.20 275 / 0.06), transparent 65%)",
        }}
      />

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-mono text-[9px] text-accent uppercase tracking-wider font-semibold">
              {moduleLabel}
            </span>
            <h3 className="text-[14px] font-semibold text-foreground mt-1">
              {topic.title}
            </h3>
          </div>
          <div className="flex items-center gap-1.5 self-start md:self-auto text-mono text-[10px] text-foreground-subtle px-2 py-0.5 rounded bg-surface-2 border border-border">
            <Clock className="w-3 h-3" />
            <span>{timeLabel}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-mono text-[10px] mb-1.5">
            <span className="text-foreground-subtle">
              {topic.completedSections}/{topic.totalSections} concepts verified
            </span>
            <span className="text-accent font-semibold">{topic.progress}%</span>
          </div>
          <div className="h-0.5 w-full bg-surface-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${topic.progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1.5">
          <Button
            onClick={handleContinue}
            className="bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Continue Session
          </Button>

          <div className="flex items-center gap-3 text-mono text-[10px] text-foreground-subtle">
            {topic.nextTitle && (
              <span className="hidden sm:flex items-center gap-1">
                <Zap className="w-3 h-3 text-accent" />
                Up next: <span className="text-foreground ml-1">{topic.nextTitle}</span>
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
              <span>Session Sync: Active</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
