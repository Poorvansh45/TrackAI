"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { TopicHero } from "@/components/topic/topic-hero"
import { ResourcesSection } from "@/components/topic/resources-section"
import { LearningChecklist } from "@/components/topic/learning-checklist"
import { QuickRecall } from "@/components/topic/quick-recall"
import { ReExplainModal } from "@/components/topic/re-explain-modal"
import { VerificationQuiz } from "@/components/topic/verification-quiz"
import { TopicNav } from "@/components/topic/topic-nav"
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

function humanize(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function buildTopicData(topicId: string, roadmapData: any): TopicData {
  let topicName = ""
  let skill = "Programming"

  if (roadmapData) {
    skill = roadmapData?.skill || "Programming"
    const phases = roadmapData?.roadmap_result?.phases || []
    for (const phase of phases) {
      for (const topic of phase.topics || []) {
        const slug = topic
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "")
        if (slug === topicId || topic.toLowerCase() === topicId.replace(/-/g, " ")) {
          topicName = topic
          break
        }
      }
      if (topicName) break
    }
  }

  if (!topicName) topicName = humanize(topicId)

  const isVariables =
    topicId === "variables" || topicName.toLowerCase().includes("variable")

  return {
    title: topicName,
    difficulty: "Beginner",
    estimated_time: "1.5 Hours",
    overview: isVariables
      ? "Variables are containers used to store data values. They allow programs to remember information and are one of the most fundamental concepts in any programming language. In Python, you create a variable the moment you first assign a value to it — no declaration needed."
      : `${topicName} is a core concept in ${skill}. Understanding it deeply will unlock your ability to build real projects and advance confidently through your learning roadmap. This workspace is designed to take you from zero to confident in a single focused session.`,
    why_it_matters: isVariables
      ? [
          "Used in every single Python program ever written",
          "Without variables you cannot store user input",
          "Required to perform any kind of calculation or logic",
          "Foundation for building real applications",
          "Essential for training machine learning models",
        ]
      : [
          `${topicName} appears in virtually every ${skill} project`,
          "Without this, you cannot progress to advanced topics",
          "Mastering this accelerates all future learning",
          "Used in real-world applications and technical interviews",
          "Foundation for building scalable systems",
        ],
    subtopics: isVariables
      ? [
          "What Is A Variable",
          "Variable Naming Rules",
          "Assigning Values",
          "Multiple Assignment",
          "Variable Types",
        ]
      : [
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
          title: isVariables
            ? "Python Variables — Complete Guide"
            : `${topicName} — Core Concepts`,
          creator: "CS Dojo",
          duration: "12 min",
          thumbnail: "https://img.youtube.com/vi/Z1Yd7upQsXY/mqdefault.jpg",
          url: isVariables
            ? "https://www.youtube.com/watch?v=Z1Yd7upQsXY"
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + " " + skill + " tutorial")}`,
        },
        {
          type: "deep_dive",
          title: isVariables
            ? "Python Variables — Deep Dive Playlist"
            : `${topicName} Full Course`,
          creator: "Corey Schafer",
          duration: "45 min",
          thumbnail: "https://img.youtube.com/vi/YYXdXT2l-Gg/mqdefault.jpg",
          url: isVariables
            ? "https://www.youtube.com/watch?v=YYXdXT2l-Gg"
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + " full course")}`,
        },
        {
          type: "one_shot",
          title: isVariables
            ? "Python Variables in 5 Minutes"
            : `${topicName} Quick Revision`,
          creator: "Programming with Mosh",
          duration: "5 min",
          thumbnail: "https://img.youtube.com/vi/_uQrJ0TkZlc/mqdefault.jpg",
          url: isVariables
            ? "https://www.youtube.com/watch?v=_uQrJ0TkZlc"
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(topicName + " one shot revision")}`,
        },
      ],
      reading: [
        {
          source: "W3Schools",
          label: isVariables ? "Python Variables" : `${topicName} Guide`,
          url: isVariables
            ? "https://www.w3schools.com/python/python_variables.asp"
            : `https://www.w3schools.com/search/search_result.asp?q=${encodeURIComponent(topicName)}`,
          icon: "W",
        },
        {
          source: "GeeksForGeeks",
          label: isVariables ? "Python Variables Article" : `${topicName} — GFG`,
          url: isVariables
            ? "https://www.geeksforgeeks.org/python-variables/"
            : `https://www.geeksforgeeks.org/search/?q=${encodeURIComponent(topicName)}`,
          icon: "G",
        },
        {
          source: "Python Docs",
          label: "Official Documentation",
          url: isVariables
            ? "https://docs.python.org/3/reference/simple_stmts.html#assignment-statements"
            : `https://docs.python.org/3/search.html?q=${encodeURIComponent(topicName)}`,
          icon: "P",
        },
        {
          source: "Real Python",
          label: isVariables ? "Variables in Python" : `${topicName} Tutorial`,
          url: isVariables
            ? "https://realpython.com/python-variables/"
            : `https://realpython.com/search?q=${encodeURIComponent(topicName)}`,
          icon: "R",
        },
      ],
    },
    summary: isVariables
      ? [
          "Variables store values and are created on assignment.",
          "Python variables require no explicit type declaration.",
          "Use meaningful, lowercase names with underscores.",
          "Values can change during program execution.",
          "Common types: int, float, str, bool, list, dict.",
        ]
      : [
          `${topicName} is a fundamental concept in ${skill}.`,
          "Practice consistently to build real intuition.",
          "Understand the why, not just the syntax.",
          "Apply concepts in small projects immediately.",
          "Review key concepts every day until mastered.",
        ],
    key_concepts: isVariables
      ? [
          { term: "Variable", definition: "stores data" },
          { term: "Assignment", definition: "sets a value" },
          { term: "Dynamic Typing", definition: "type inferred automatically" },
          { term: "Identifier", definition: "the variable name" },
          { term: "Scope", definition: "where the variable exists" },
        ]
      : [
          { term: topicName, definition: "core concept to master" },
          { term: "Syntax", definition: "rules for writing valid code" },
          { term: "Semantics", definition: "what the code actually means" },
          { term: "Pattern", definition: "reusable solution template" },
          { term: "Best Practice", definition: "proven approach used by pros" },
        ],
  }
}

export default function TopicPage() {
  const params = useParams()
  const topicId = (params?.topicId as string) || "variables"

  const [topicData, setTopicData] = useState<TopicData | null>(null)
  const [completedSubtopics, setCompletedSubtopics] = useState<Set<string>>(new Set())
  const [showReExplain, setShowReExplain] = useState(false)
  const [activeSection, setActiveSection] = useState("intro")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem("generatedRoadmap")
    let roadmapData = null
    try {
      if (saved) roadmapData = JSON.parse(saved)
    } catch {}

    const data = buildTopicData(topicId, roadmapData)
    setTopicData(data)

    const savedProgress = localStorage.getItem(`topic_progress_${topicId}`)
    if (savedProgress) {
      try {
        setCompletedSubtopics(new Set(JSON.parse(savedProgress)))
      } catch {}
    }

    setTimeout(() => setLoading(false), 400)
  }, [topicId])

  const toggleSubtopic = (subtopic: string) => {
    setCompletedSubtopics((prev) => {
      const next = new Set(prev)
      if (next.has(subtopic)) next.delete(subtopic)
      else next.add(subtopic)
      localStorage.setItem(`topic_progress_${topicId}`, JSON.stringify([...next]))
      return next
    })
  }

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
    completedSubtopics.size === topicData.subtopics.length &&
    topicData.subtopics.length > 0

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
            background:
              "radial-gradient(circle, oklch(0.62 0.20 275 / 0.07), transparent 70%)",
            top: "-250px",
            right: "-150px",
            animationDelay: "0s",
          }}
        />
        <div
          className="orb-glow absolute w-[500px] h-[500px]"
          style={{
            background:
              "radial-gradient(circle, oklch(0.55 0.15 200 / 0.05), transparent 70%)",
            bottom: "0",
            left: "-150px",
            animationDelay: "3.5s",
          }}
        />
      </div>

      {/* Top navigation bar */}
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
          <TopicHero
            topicData={topicData}
            onReExplain={() => setShowReExplain(true)}
          />
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
          <QuickRecall
            summary={topicData.summary}
            keyConcepts={topicData.key_concepts}
          />
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
                I Didn't Understand This
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
        <ReExplainModal
          topicTitle={topicData.title}
          onClose={() => setShowReExplain(false)}
        />
      )}
    </div>
  )
}
