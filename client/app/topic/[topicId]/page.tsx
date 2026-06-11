"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { TopicHero } from "@/components/topic/topic-hero"
import { ResourcesSection } from "@/components/topic/resources-section"
import { LearningChecklist } from "@/components/topic/learning-checklist"
import { QuickRecall } from "@/components/topic/quick-recall"
import { ReExplainModal } from "@/components/topic/re-explain-modal"
import { VerificationQuiz } from "@/components/topic/verification-quiz"
import { TopicNav } from "@/components/topic/topic-nav"
import { TopicCompletionModal } from "@/components/topic/topic-completion-modal"
import { Loader2, Cpu } from "lucide-react"

export interface TopicData {
  title: string
  difficulty: string
  estimated_time: string
  overview: string
  why_it_matters: string[]
  subtopics: string[]
  resources: {
    videos: Array<{
      type: "core" | "deep_dive" | "one_shot"
      title: string
      creator: string
      duration: string
      thumbnail: string
      url: string
    }>
    reading: Array<{
      source: string
      label: string
      url: string
      icon: string
    }>
  }
  summary: string[]
  key_concepts: Array<{
    term: string
    definition: string
  }>
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function humanize(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/** Derive the next topic slug from localStorage roadmap data */
function getNextTopic(currentTopicId: string): { id: string; title: string; duration: string } | null {
  try {
    const saved = localStorage.getItem("generatedRoadmap")
    if (!saved) return null
    const data = JSON.parse(saved)
    const phases = data?.roadmap_result?.phases || []

    // Flatten all topics into a sequence
    const allTopics: string[] = []
    for (const phase of phases) {
      for (const topic of phase.topics || []) {
        allTopics.push(topic)
      }
    }

    // Find current index
    const currentIdx = allTopics.findIndex((t) => {
      const slug = t.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
      return slug === currentTopicId || t.toLowerCase() === currentTopicId.replace(/-/g, " ")
    })

    if (currentIdx < 0 || currentIdx >= allTopics.length - 1) return null

    const next = allTopics[currentIdx + 1]
    const nextSlug = next.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

    return { id: nextSlug, title: next, duration: "1.5 Hours" }
  } catch {
    return null
  }
}

/** Persist progress to the backend */
async function persistProgress(
  topicId: string,
  completedSubtopics: string[],
  isCompleted: boolean,
  nextTopicId?: string
) {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"
    await fetch(`${apiBase}/topic/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_id: topicId,
        completed_subtopics: completedSubtopics,
        is_completed: isCompleted,
        next_topic_id: nextTopicId || null,
      }),
    })
  } catch {
    // Silent fail — localStorage is the source of truth on the client
  }
}

/** Fetch topic data from backend (with real resources) */
async function fetchTopicData(topicId: string): Promise<TopicData | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1"
    const res = await fetch(`${apiBase}/topic/${topicId}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** Fallback topic builder (when backend is unreachable) */
function buildFallbackTopicData(topicId: string, roadmapData: any): TopicData {
  let topicName = ""
  const skill = roadmapData?.skill || "Programming"

  if (roadmapData) {
    const phases = roadmapData?.roadmap_result?.phases || []
    for (const phase of phases) {
      for (const topic of phase.topics || []) {
        const slug = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        if (slug === topicId || topic.toLowerCase() === topicId.replace(/-/g, " ")) {
          topicName = topic
          break
        }
      }
      if (topicName) break
    }
  }

  if (!topicName) topicName = humanize(topicId)

  return {
    title: topicName,
    difficulty: "Beginner",
    estimated_time: "1.5 Hours",
    overview: `${topicName} is a core concept in ${skill}. This workspace will guide you through it with curated resources, a progress checklist, and on-demand AI explanations.`,
    why_it_matters: [
      `${topicName} appears in virtually every ${skill} project`,
      "Without this, you cannot progress to advanced topics",
      "Mastering this accelerates all future learning",
      "Used in real-world applications and technical interviews",
      "Foundation for building scalable systems",
    ],
    subtopics: [
      `Introduction to ${topicName}`,
      "Core Concepts",
      "Practical Applications",
      "Common Patterns",
      "Advanced Usage",
    ],
    resources: {
      videos: [
        {
          type: "core",
          title: `${topicName} — Core Tutorial`,
          creator: "freeCodeCamp",
          duration: "~20 min",
          thumbnail: "https://img.youtube.com/vi/rfscVS0vtbw/mqdefault.jpg",
          url: "https://www.youtube.com/watch?v=rfscVS0vtbw",
        },
        {
          type: "deep_dive",
          title: `${topicName} — Deep Dive`,
          creator: "Corey Schafer",
          duration: "~35 min",
          thumbnail: "https://img.youtube.com/vi/YYXdXT2l-Gg/mqdefault.jpg",
          url: "https://www.youtube.com/watch?v=YYXdXT2l-Gg",
        },
        {
          type: "one_shot",
          title: `${topicName} in 100 Seconds`,
          creator: "Fireship",
          duration: "~2 min",
          thumbnail: "https://img.youtube.com/vi/Mus_vwhTCq0/mqdefault.jpg",
          url: "https://www.youtube.com/watch?v=Mus_vwhTCq0",
        },
      ],
      reading: [
        {
          source: "W3Schools",
          label: `${topicName} Guide`,
          url: `https://www.w3schools.com/python/python_${topicId.replace(/-/g, "_")}.asp`,
          icon: "W",
        },
        {
          source: "GeeksForGeeks",
          label: `${topicName} — GFG`,
          url: `https://www.geeksforgeeks.org/${topicId}/`,
          icon: "G",
        },
        {
          source: "Python Docs",
          label: "Official Documentation",
          url: "https://docs.python.org/3/",
          icon: "P",
        },
        {
          source: "Real Python",
          label: `${topicName} Tutorial`,
          url: `https://realpython.com/search?q=${encodeURIComponent(topicName)}`,
          icon: "R",
        },
      ],
    },
    summary: [
      `${topicName} is a fundamental concept in programming.`,
      "Practice consistently to build real intuition.",
      "Understand the why, not just the syntax.",
      "Apply concepts in small projects immediately.",
      "Review key concepts every day until mastered.",
    ],
    key_concepts: [
      { term: topicName, definition: "core concept to master" },
      { term: "Syntax", definition: "rules for writing valid code" },
      { term: "Semantics", definition: "what the code actually means" },
      { term: "Pattern", definition: "reusable solution template" },
      { term: "Best Practice", definition: "proven approach used by pros" },
    ],
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TopicPage() {
  const params = useParams()
  const router = useRouter()
  const topicId = (params?.topicId as string) || "variables"

  const [topicData, setTopicData] = useState<TopicData | null>(null)
  const [completedSubtopics, setCompletedSubtopics] = useState<Set<string>>(new Set())
  const [showReExplain, setShowReExplain] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [nextTopic, setNextTopic] = useState<{ id: string; title: string; duration: string } | null>(null)
  const [activeSection, setActiveSection] = useState("intro")
  const [loading, setLoading] = useState(true)

  // Track if completion modal has been shown this session (avoid re-showing on toggle)
  const completionFiredRef = useRef(false)

  // ── Load topic data ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      completionFiredRef.current = false

      // 1. Try backend with real resources
      const backendData = await fetchTopicData(topicId)

      // 2. Fall back to local build if backend unreachable
      let savedRoadmap = null
      try {
        const raw = localStorage.getItem("generatedRoadmap")
        if (raw) savedRoadmap = JSON.parse(raw)
      } catch {}

      const data = backendData ?? buildFallbackTopicData(topicId, savedRoadmap)
      setTopicData(data)

      // Restore saved progress
      try {
        const savedProgress = localStorage.getItem(`topic_progress_${topicId}`)
        if (savedProgress) {
          const parsed: string[] = JSON.parse(savedProgress)
          setCompletedSubtopics(new Set(parsed))

          // If already completed in a prior session, don't re-fire the modal
          if (parsed.length === data.subtopics.length) {
            completionFiredRef.current = true
          }
        }
      } catch {}

      // Determine next topic from roadmap
      setNextTopic(getNextTopic(topicId))

      setTimeout(() => setLoading(false), 380)
    }

    load()
  }, [topicId])

  // ── Checklist toggle ──────────────────────────────────────────────────────
  const toggleSubtopic = useCallback(
    (subtopic: string) => {
      setCompletedSubtopics((prev) => {
        const next = new Set(prev)
        if (next.has(subtopic)) {
          next.delete(subtopic)
          completionFiredRef.current = false // allow modal to fire again if un-checked
        } else {
          next.add(subtopic)
        }

        const arr = [...next]
        localStorage.setItem(`topic_progress_${topicId}`, JSON.stringify(arr))

        // Check if newly completed
        if (topicData && next.size === topicData.subtopics.length && !completionFiredRef.current) {
          completionFiredRef.current = true

          // Trigger completion flow after short delay (let the last check-animation finish)
          setTimeout(() => {
            setShowCompletionModal(true)

            // Persist to backend
            persistProgress(topicId, arr, true, nextTopic?.id)

            // Update roadmap node status in localStorage
            updateRoadmapNodeStatus(topicId, nextTopic?.id)
          }, 600)
        } else {
          // Save partial progress to backend
          persistProgress(topicId, arr, false)
        }

        return next
      })
    },
    [topicId, topicData, nextTopic]
  )

  // ── Handle "Continue Learning" ─────────────────────────────────────────────
  const handleContinue = useCallback(() => {
    setShowCompletionModal(false)
    if (nextTopic) {
      router.push(`/topic/${nextTopic.id}`)
    } else {
      router.push("/dashboard/roadmap")
    }
  }, [nextTopic, router])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading || !topicData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-accent/15 border border-accent/20 flex items-center justify-center mx-auto">
            <Loader2 className="w-5 h-5 text-accent animate-spin" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Loading Workspace</p>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Preparing your learning environment...
            </p>
          </div>
        </div>
      </div>
    )
  }

  const allMastered =
    completedSubtopics.size === topicData.subtopics.length && topicData.subtopics.length > 0

  return (
    <div className="min-h-screen bg-background relative">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(oklch(0.20 0.02 275 / 0.06) 1px, transparent 1px),
            linear-gradient(90deg, oklch(0.20 0.02 275 / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="orb-glow absolute w-[700px] h-[700px]"
          style={{
            background: "radial-gradient(circle, oklch(0.62 0.20 275 / 0.07), transparent 70%)",
            top: "-250px",
            right: "-150px",
            animationDelay: "0s",
          }}
        />
        <div
          className="orb-glow absolute w-[500px] h-[500px]"
          style={{
            background: "radial-gradient(circle, oklch(0.55 0.15 200 / 0.05), transparent 70%)",
            bottom: "0",
            left: "-150px",
            animationDelay: "3.5s",
          }}
        />
      </div>

      {/* Navigation bar */}
      <TopicNav
        topicTitle={topicData.title}
        completedCount={completedSubtopics.size}
        totalCount={topicData.subtopics.length}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main content */}
      <div className="relative z-10 max-w-[860px] mx-auto px-5 lg:px-8 pt-24 pb-24 space-y-8">

        {/* S1 — Hero */}
        <section id="section-intro">
          <TopicHero topicData={topicData} onReExplain={() => setShowReExplain(true)} />
        </section>

        {/* S2 — Resources */}
        <section id="section-resources">
          <ResourcesSection resources={topicData.resources} />
        </section>

        {/* S3 — Checklist */}
        <section id="section-checklist">
          <LearningChecklist
            subtopics={topicData.subtopics}
            completedSubtopics={completedSubtopics}
            onToggle={toggleSubtopic}
            allMastered={allMastered}
          />
        </section>

        {/* S4 — Quick Recall */}
        <section id="section-recall">
          <QuickRecall summary={topicData.summary} keyConcepts={topicData.key_concepts} />
        </section>

        {/* S5 — AI Re-Explain CTA */}
        <section id="section-ai">
          <div className="flex justify-center py-2">
            <button
              onClick={() => setShowReExplain(true)}
              className="group flex items-center gap-3 px-6 py-3 rounded-xl border border-border hover:border-accent/50 bg-surface-1 hover:bg-accent/5 text-[12px] font-medium text-foreground-muted hover:text-foreground transition-all duration-200 hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition-colors">
                <Cpu className="w-3.5 h-3.5 text-accent" />
              </div>
              <span>
                I Didn&apos;t Understand This
                <span className="text-foreground-subtle ml-1.5">— Ask AI to Re-Explain</span>
              </span>
            </button>
          </div>
        </section>

        {/* S6 — Quiz */}
        <section id="section-quiz">
          <VerificationQuiz topicTitle={topicData.title} />
        </section>
      </div>

      {/* Re-Explain Modal */}
      {showReExplain && (
        <ReExplainModal topicTitle={topicData.title} onClose={() => setShowReExplain(false)} />
      )}

      {/* Topic Completion Modal */}
      <TopicCompletionModal
        isOpen={showCompletionModal}
        topicTitle={topicData.title}
        nextTopicTitle={nextTopic?.title}
        nextTopicDuration={nextTopic?.duration}
        xpEarned={100}
        onContinue={handleContinue}
        onClose={() => setShowCompletionModal(false)}
      />
    </div>
  )
}

// ─── Roadmap node updater ─────────────────────────────────────────────────
/**
 * After completing a topic, update localStorage roadmap state so the
 * roadmap graph re-renders with the correct node statuses:
 *   completed topic → status: "completed", progress: 100
 *   next topic      → status: "active"
 */
function updateRoadmapNodeStatus(completedTopicId: string, nextTopicId?: string) {
  try {
    const raw = localStorage.getItem("generatedRoadmap")
    if (!raw) return
    const data = JSON.parse(raw)
    const phases = data?.roadmap_result?.phases || []

    let foundCompleted = false
    let foundNext = false

    for (const phase of phases) {
      for (const topic of phase.topics || []) {
        const slug = topic.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")

        if (slug === completedTopicId) {
          // Mark completed
          if (!phase._nodeStatus) phase._nodeStatus = {}
          phase._nodeStatus[topic] = "completed"
          foundCompleted = true
        } else if (nextTopicId && slug === nextTopicId && foundCompleted && !foundNext) {
          // Unlock next
          if (!phase._nodeStatus) phase._nodeStatus = {}
          phase._nodeStatus[topic] = "active"
          foundNext = true
        }
      }
    }

    // Persist updated roadmap
    localStorage.setItem("generatedRoadmap", JSON.stringify(data))

    // Emit a storage event so the roadmap page can react if open in another tab
    window.dispatchEvent(new StorageEvent("storage", { key: "generatedRoadmap" }))
  } catch {}
}
