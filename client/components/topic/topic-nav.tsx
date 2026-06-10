"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

interface TopicNavProps {
  topicTitle: string
  completedCount: number
  totalCount: number
  activeSection: string
  onSectionChange: (s: string) => void
}

const NAV_SECTIONS = [
  { id: "intro",     label: "Overview",  href: "#section-intro" },
  { id: "resources", label: "Resources", href: "#section-resources" },
  { id: "checklist", label: "Checklist", href: "#section-checklist" },
  { id: "recall",    label: "Recall",    href: "#section-recall" },
  { id: "quiz",      label: "Quiz",      href: "#section-quiz" },
]

export function TopicNav({
  topicTitle,
  completedCount,
  totalCount,
  activeSection,
  onSectionChange,
}: TopicNavProps) {
  const router = useRouter()
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="fixed top-12 left-0 right-0 z-40 lg:left-14">
      <div
        className="border-b border-border/60 px-5 lg:px-8"
        style={{ background: "oklch(0.07 0.01 260 / 0.92)", backdropFilter: "blur(20px)" }}
      >
        <div className="max-w-[860px] mx-auto flex items-center justify-between h-11 gap-4">
          {/* Back + title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="flex-shrink-0 w-7 h-7 rounded-md hover:bg-surface-2 flex items-center justify-center text-foreground-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-mono text-[9px] text-foreground-subtle uppercase tracking-widest hidden sm:block">
                Learning /
              </span>
              <span className="text-[12px] font-semibold text-foreground truncate">
                {topicTitle}
              </span>
            </div>
          </div>

          {/* Section pills — desktop */}
          <div className="hidden md:flex items-center gap-0.5">
            {NAV_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                onClick={() => onSectionChange(s.id)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  activeSection === s.id
                    ? "bg-accent/15 text-accent"
                    : "text-foreground-muted hover:text-foreground hover:bg-surface-2"
                }`}
              >
                {s.label}
              </a>
            ))}
          </div>

          {/* Progress pill */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-surface-2 border border-border rounded-md px-2.5 py-1">
              <CheckCircle2 className="w-3 h-3 text-success" />
              <span className="text-mono text-[10px] font-semibold text-foreground">
                {completedCount}/{totalCount}
              </span>
            </div>
            {/* Mini progress arc */}
            <div className="relative w-7 h-7">
              <svg viewBox="0 0 28 28" className="w-7 h-7 -rotate-90">
                <circle cx="14" cy="14" r="11" fill="none" stroke="oklch(0.18 0.01 260)" strokeWidth="2.5" />
                <circle
                  cx="14" cy="14" r="11"
                  fill="none"
                  stroke="oklch(0.60 0.16 155)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 11}`}
                  strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)" }}
                />
              </svg>
              <span
                className="absolute inset-0 flex items-center justify-center text-[7px] font-bold"
                style={{ color: pct === 100 ? "oklch(0.60 0.16 155)" : "oklch(0.55 0.01 260)" }}
              >
                {pct}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
