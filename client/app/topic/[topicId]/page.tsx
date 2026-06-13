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
import { updateChecklistOnServer, completeTopicOnServer, fetchRoadmapState, toSlug } from "@/lib/roadmap-state"

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
    const currentIdx = allTopics.findIndex((t) => toSlug(t) === currentTopicId)

    if (currentIdx < 0 || currentIdx >= allTopics.length - 1) return null

    const next = allTopics[currentIdx + 1]

    return { id: toSlug(next), title: next, duration: "1.5 Hours" }
  } catch {
    return null
  }
}

// (toSlug now imported from @/lib/roadmap-state)

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
        const slug = toSlug(topic)
        if (slug === topicId) {
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

      // Restore saved progress — localStorage first for instant paint,
      // then reconcile with backend roadmap_progress (single source of truth).
      //
      // ROOT-CAUSE FIX for "11/5 = 220%":
      // The LLM may generate different subtopic names between runs. Both
      // localStorage and backend completed_subtopics must be filtered against
      // data.subtopics (the canonical list for THIS render) before being
      // loaded into state — stale names from a prior run are silently dropped.
      const validSubtopicSet = new Set(data.subtopics)

      let localCompleted: string[] = []
      try {
        const savedProgress = localStorage.getItem(`topic_progress_${topicId}`)
        if (savedProgress) {
          const raw: string[] = JSON.parse(savedProgress)
          // Filter: only keep names that exist in the current subtopic list
          localCompleted = raw.filter((name) => validSubtopicSet.has(name))
          if (localCompleted.length !== raw.length) {
            // Stale names were dropped — rewrite cache with clean list
            localStorage.setItem(`topic_progress_${topicId}`, JSON.stringify(localCompleted))
            console.debug(
              `[CHECKLIST_UPDATE] topic_id=${topicId} dropped ${raw.length - localCompleted.length} stale names from localStorage`
            )
          }
          setCompletedSubtopics(new Set(localCompleted))
          if (localCompleted.length >= data.subtopics.length) {
            completionFiredRef.current = true
            console.debug(
              `[TOPIC_COMPLETED] topic_id=${topicId} completedItems=${localCompleted.length} totalItems=${data.subtopics.length} progress=100% status=completed (restored from localStorage)`
            )
          }
        }
      } catch {}

      // Reconcile with backend — if this topic is already marked completed
      // server-side (e.g. completed on another device), reflect that here.
      try {
        const roadmapState = await fetchRoadmapState()
        if (roadmapState) {
          const backendTopic = roadmapState.phases
            .flatMap((p) => p.topics)
            .find((t) => t.topic_id === topicId)

          if (backendTopic) {
            console.debug(
              `[CHECKLIST_UPDATE] topic_id=${topicId} backend status=${backendTopic.status} progress=${backendTopic.progress_pct}% completedItems=${backendTopic.completed_subtopics.length} totalItems=${data.subtopics.length}`
            )

            if (backendTopic.status === "completed") {
              // Topic fully done server-side: mark all current subtopics complete
              completionFiredRef.current = true
              const all = new Set(data.subtopics)
              setCompletedSubtopics(all)
              localStorage.setItem(`topic_progress_${topicId}`, JSON.stringify([...all]))
              console.debug(`[TOPIC_COMPLETED] topic_id=${topicId} progress=100% status=completed (synced from backend)`)
            } else {
              // Partial progress: backend completed_subtopics are display-name strings
              // stored by the checklist — filter against current list and take the
              // larger of local vs backend to avoid regressing progress.
              const backendFiltered = backendTopic.completed_subtopics.filter(
                (name) => validSubtopicSet.has(name)
              )
              if (backendFiltered.length > localCompleted.length) {
                setCompletedSubtopics(new Set(backendFiltered))
                localStorage.setItem(`topic_progress_${topicId}`, JSON.stringify(backendFiltered))
                const pct = Math.round((backendFiltered.length / data.subtopics.length) * 100)
                console.debug(
                  `[CHECKLIST_UPDATE] topic_id=${topicId} completedItems=${backendFiltered.length} totalItems=${data.subtopics.length} progress=${pct}% status=${backendTopic.status} (synced from backend)`
                )
              }
            }
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

        // Only persist names that belong to the CURRENT subtopic list.
        // This prevents stale names from an old LLM run accumulating in
        // localStorage and inflating the counter beyond the real total.
        const currentSubtopicSet = new Set(topicData?.subtopics || [])
        const validArr = [...next].filter((name) => currentSubtopicSet.has(name))
        localStorage.setItem(`topic_progress_${topicId}`, JSON.stringify(validArr))

        const totalSubtopics = topicData?.subtopics.length || 5
        // Count only valid (current-list) items for the completion check
        const validCompletedCount = validArr.length

        console.debug(
          `[CHECKLIST_UPDATE] topic_id=${topicId} completedItems=${validCompletedCount} totalItems=${totalSubtopics} progress=${Math.round((validCompletedCount / totalSubtopics) * 100)}% status=${validCompletedCount >= totalSubtopics ? 'completed' : 'active'}`
        )

        // Check if newly completed — guard with ref to prevent duplicate events
        if (topicData && validCompletedCount === totalSubtopics && !completionFiredRef.current) {
          completionFiredRef.current = true
          console.debug(`[TOPIC_COMPLETED] topic_id=${topicId} progress=100% status=completed`)

          // Trigger completion flow after short delay (let the last check-animation finish)
          setTimeout(() => {
            setShowCompletionModal(true)

            // Backend: sync checklist, then mark complete + unlock next topic.
            // This is the ONLY place topic unlocking happens — the result is
            // read back by the Dashboard and Learning Graph via the
            // "roadmap-update" event, so all views stay in sync.
            updateChecklistOnServer(topicId, validArr, totalSubtopics).then(() => {
              completeTopicOnServer(topicId).then((updatedRoadmap) => {
                if (updatedRoadmap?.active_topic_id) {
                  console.debug(`[TOPIC_UNLOCKED] next_topic_id=${updatedRoadmap.active_topic_id}`)
                }
              })
            })
          }, 600)
        } else {
          // Save partial progress to backend — deduped & capped 0-100 server-side
          updateChecklistOnServer(topicId, validArr, totalSubtopics)
        }

        return next
      })
    },
    [topicId, topicData]
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
