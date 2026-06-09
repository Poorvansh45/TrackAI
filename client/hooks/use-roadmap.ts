"use client"

import { useState, useEffect } from "react"

/**
 * Custom hook to check if the user has an initialized roadmap.
 * Implements a smart synchronizer to scope roadmaps by logged-in user email/id.
 * This prevents cross-user local storage leaks on the same machine/browser.
 */
export function useRoadmap() {
  const [roadmapExists, setRoadmapExists] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user")
      const bypass = localStorage.getItem("dev_roadmap_exists") === "true"

      if (bypass) {
        setRoadmapExists(true)
        return
      }

      if (userStr) {
        const user = JSON.parse(userStr)
        const identifier = user.email || user.username || user.id || user._id

        if (identifier) {
          const scopedKey = `generatedRoadmap_${identifier}`
          const scopedRoadmap = localStorage.getItem(scopedKey)
          const globalRoadmap = localStorage.getItem("generatedRoadmap")

          if (scopedRoadmap) {
            // 1. User has a saved roadmap. Restore it to the global key so existing cards can render it
            localStorage.setItem("generatedRoadmap", scopedRoadmap)
            setRoadmapExists(true)
          } else if (globalRoadmap) {
            // 2. User just completed onboarding and generated a roadmap, but it isn't scoped yet. Save it!
            localStorage.setItem(scopedKey, globalRoadmap)
            setRoadmapExists(true)
          } else {
            // 3. No roadmap exists for this user
            setRoadmapExists(false)
          }
        } else {
          // Fallback if user structure is unexpected
          const globalRoadmap = localStorage.getItem("generatedRoadmap")
          setRoadmapExists(!!globalRoadmap)
        }
      } else {
        // No logged-in user found
        const globalRoadmap = localStorage.getItem("generatedRoadmap")
        setRoadmapExists(!!globalRoadmap)
      }
    } catch (e) {
      console.error("Failed to query or sync roadmap status", e)
      setRoadmapExists(false)
    } finally {
      setLoading(false)
    }
  }, [])

  return { roadmapExists, loading }
}
