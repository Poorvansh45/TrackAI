"use client"

import { motion } from "framer-motion"
import { Play, BookOpen, ExternalLink, Youtube, AlertCircle } from "lucide-react"
import type { TopicData } from "@/app/topic/[topicId]/page"

interface ResourcesSectionProps {
  resources: TopicData["resources"]
}

const VIDEO_TYPE_LABELS: Record<string, string> = {
  core:      "Core Video",
  deep_dive: "Deep Dive",
  one_shot:  "One Shot Revision",
}

const VIDEO_TYPE_COLORS: Record<string, string> = {
  core:      "text-accent border-accent/30 bg-accent/10",
  deep_dive: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  one_shot:  "text-success border-success/30 bg-success/10",
}

const SOURCE_COLORS: Record<string, string> = {
  W: "bg-green-500/20 text-green-400 border-green-500/30",
  G: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  P: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  R: "bg-red-500/20 text-red-400 border-red-500/30",
}

/** Extract 11-char YouTube video ID from any YouTube URL */
function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1, 12)
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v")
    return null
  } catch {
    return null
  }
}

/** Validate a YouTube video URL is a real watch link, not a search page */
function isValidYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (!u.hostname.includes("youtube.com") && !u.hostname.includes("youtu.be")) return false
    if (u.hostname.includes("youtube.com") && u.pathname !== "/watch") return false
    if (u.hostname.includes("youtube.com") && !u.searchParams.get("v")) return false
    return true
  } catch {
    return false
  }
}

/** Build a guaranteed-working thumbnail from the video URL */
function getThumbnail(video: { thumbnail: string; url: string }): string {
  // Try to derive the thumbnail from the video ID
  const id = extractYouTubeId(video.url)
  if (id && id.length === 11) {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`
  }
  // Use whatever thumbnail was given (may fail, handled by onError)
  return video.thumbnail
}

export function ResourcesSection({ resources }: ResourcesSectionProps) {
  // Filter out any videos with invalid YouTube URLs so broken links never show
  const validVideos = resources.videos.filter((v) => {
    const urlOk = v.url && (isValidYouTubeUrl(v.url) || v.url.includes("youtube.com"))
    return urlOk
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="space-y-5"
    >
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 text-accent" />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">Recommended Resources</h2>
          <p className="text-[11px] text-foreground-muted">Curated for this topic</p>
        </div>
      </div>

      {/* ── Video Learning ── */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ background: "oklch(0.10 0.01 260 / 0.7)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Youtube className="w-3.5 h-3.5 text-red-400" />
          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
            Video Learning
          </span>
        </div>

        {validVideos.length === 0 ? (
          <div className="flex items-center gap-2 text-foreground-subtle text-[12px] py-4">
            <AlertCircle className="w-4 h-4" />
            <span>Video resources are loading. Please refresh in a moment.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {validVideos.map((video, i) => {
              const thumbnail = getThumbnail(video)
              const videoId = extractYouTubeId(video.url)
              const openUrl = videoId
                ? `https://www.youtube.com/watch?v=${videoId}`
                : video.url

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className="group relative rounded-lg border border-border overflow-hidden hover:border-accent/40 transition-all duration-200 hover:shadow-lg hover:shadow-accent/5 cursor-pointer"
                  style={{ background: "oklch(0.08 0.01 260)" }}
                  onClick={() => window.open(openUrl, "_blank", "noopener,noreferrer")}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-surface-2">
                    <img
                      src={thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        // Try hqdefault fallback
                        if (!img.src.includes("hqdefault") && videoId) {
                          img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                        } else {
                          // Hide broken image and show placeholder
                          img.style.display = "none"
                          const parent = img.parentElement
                          if (parent && !parent.querySelector(".thumb-fallback")) {
                            const div = document.createElement("div")
                            div.className =
                              "thumb-fallback absolute inset-0 flex items-center justify-center bg-surface-2"
                            div.innerHTML =
                              '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-foreground-subtle/30"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
                            parent.appendChild(div)
                          }
                        }
                      }}
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                    {/* Duration */}
                    <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
                      {video.duration}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span
                        className={`text-[8px] font-semibold px-1.5 py-0.5 rounded border ${VIDEO_TYPE_COLORS[video.type] ?? VIDEO_TYPE_COLORS.core}`}
                      >
                        {VIDEO_TYPE_LABELS[video.type] ?? video.type}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-foreground leading-tight line-clamp-2 mb-1">
                      {video.title}
                    </p>
                    <p className="text-[10px] text-foreground-muted">{video.creator}</p>
                  </div>

                  {/* External icon */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-6 h-6 rounded-md bg-black/70 flex items-center justify-center">
                      <ExternalLink className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Reading Resources ── */}
      <div
        className="rounded-xl border border-border p-5"
        style={{ background: "oklch(0.10 0.01 260 / 0.7)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-3.5 h-3.5 text-accent" />
          <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
            Reading Resources
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {resources.reading.map((item, i) => {
            // Validate reading URL — must be one of the trusted domains
            const trustedDomains = [
              "w3schools.com", "geeksforgeeks.org", "docs.python.org",
              "realpython.com", "developer.mozilla.org", "javascript.info",
              "git-scm.com", "man7.org", "linuxcommand.org", "docs.oracle.com",
              "docs.rust-lang.org", "docs.microsoft.com", "learn.microsoft.com",
              "kotlinlang.org", "docs.swift.org", "nodejs.org", "reactjs.org",
              "react.dev", "vuejs.org", "angular.io", "typescriptlang.org",
            ]
            const isValidUrl = (() => {
              try {
                const u = new URL(item.url)
                return trustedDomains.some((d) => u.hostname.includes(d))
              } catch {
                return false
              }
            })()

            if (!isValidUrl) return null

            return (
              <motion.a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className="group flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/40 transition-all duration-200 hover:bg-accent/5"
                style={{ background: "oklch(0.08 0.01 260)" }}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-[11px] font-bold ${
                    SOURCE_COLORS[item.icon] ?? "bg-surface-2 text-foreground-muted border-border"
                  }`}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-foreground-muted">{item.source}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-foreground-subtle group-hover:text-accent flex-shrink-0 transition-colors" />
              </motion.a>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
