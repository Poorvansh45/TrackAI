"use client"

import { useState, useEffect, useCallback } from "react"

/**
 * useActiveTopic — single source of truth for the current active topic.
 *
 * Reads the generatedRoadmap from localStorage, walks through every phase,
 * and returns the FIRST topic that is NOT yet fully completed.
 *
 * A topic is "completed" when its topic_progress_{slug} array has 5+ items
 * OR when the phase._nodeStatus[topicName] === "completed".
 *
 * Updates automatically via StorageEvent when a topic is finished.
 */

export interface ActiveTopic {
  title: string
  slug: string
  phaseNumber: number
  phaseTitle: string
  skill: string
  totalSections: number
  completedSections: number
  progress: number           // 0-100
  nextTitle?: string
  nextSlug?: string
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function isTopicCompleted(topicName: string, phase: any): boolean {
  const slug = toSlug(topicName)
  // Check _nodeStatus override first (set by updateRoadmapNodeStatus in topic page)
  if (phase._nodeStatus?.[topicName] === "completed") return true
  // Check localStorage progress (5 = default subtopic count)
  try {
    const raw = localStorage.getItem(`topic_progress_${slug}`)
    if (raw) {
      const arr: string[] = JSON.parse(raw)
      return arr.length >= 5
    }
  } catch {}
  return false
}

function computeActiveTopic(): ActiveTopic | null {
  try {
    const raw = localStorage.getItem("generatedRoadmap")
    if (!raw) return null
    const data = JSON.parse(raw)
    const phases: any[] = data?.roadmap_result?.phases || []
    const skill: string = data?.skill || "Your Track"

    // Flatten topics with phase context
    const allTopics: Array<{ name: string; phase: any; pIdx: number }> = []
    for (let pIdx = 0; pIdx < phases.length; pIdx++) {
      const phase = phases[pIdx]
      for (const topic of phase.topics || []) {
        allTopics.push({ name: topic, phase, pIdx })
      }
    }

    // Find first non-completed topic
    let activeIdx = allTopics.findIndex(({ name, phase }) => !isTopicCompleted(name, phase))
    if (activeIdx < 0) activeIdx = allTopics.length - 1 // all done — show last

    const active = allTopics[activeIdx]
    if (!active) return null

    const slug = toSlug(active.name)
    const totalSections = 5

    let completedSections = 0
    try {
      const raw = localStorage.getItem(`topic_progress_${slug}`)
      if (raw) completedSections = Math.min(totalSections, JSON.parse(raw).length)
    } catch {}

    const next = allTopics[activeIdx + 1]

    return {
      title: active.name,
      slug,
      phaseNumber: active.phase.phase_number || active.pIdx + 1,
      phaseTitle: active.phase.phase_title || `Phase ${active.pIdx + 1}`,
      skill,
      totalSections,
      completedSections,
      progress: Math.round((completedSections / totalSections) * 100),
      nextTitle: next?.name,
      nextSlug: next ? toSlug(next.name) : undefined,
    }
  } catch {
    return null
  }
}

export function useActiveTopic() {
  const [activeTopic, setActiveTopic] = useState<ActiveTopic | null>(null)

  const refresh = useCallback(() => {
    setActiveTopic(computeActiveTopic())
  }, [])

  useEffect(() => {
    refresh()

    // Re-compute whenever roadmap or any topic progress changes
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === "generatedRoadmap" ||
        e.key?.startsWith("topic_progress_")
      ) {
        refresh()
      }
    }

    window.addEventListener("storage", handleStorage)

    // Also poll every 2s to catch same-tab updates (localStorage doesn't fire
    // StorageEvent within the same tab)
    const interval = setInterval(refresh, 2000)

    return () => {
      window.removeEventListener("storage", handleStorage)
      clearInterval(interval)
    }
  }, [refresh])

  return { activeTopic, refresh }
}
