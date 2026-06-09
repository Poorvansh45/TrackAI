"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { 
  Sparkles, 
  Lock, 
  ArrowRight, 
  Eye, 
  Route, 
  BarChart3, 
  Target, 
  FileText,
  HelpCircle,
  Flame,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { WelcomeHeader } from "./welcome-header"

export function EmptyDashboard() {
  const router = useRouter()
  const previewsRef = useRef<HTMLDivElement>(null)

  const handleStartSetup = () => {
    router.push("/onboarding")
  }

  const handleScrollToPreviews = () => {
    previewsRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-10 pb-12">
      {/* 1. Header component (with streak hidden) */}
      <WelcomeHeader hideStreak={true} />

      {/* 2. Primary Hero Panel / Empty State Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-surface-2/40 to-surface-1/20 p-8 md:p-10 backdrop-blur-xl"
      >
        {/* Animated grid background effect */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        
        {/* Ambient violet glow */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/10 rounded-full blur-[100px] -z-10" />

        <div className="max-w-2xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-muted border border-accent/30 text-accent text-mono text-[9px] uppercase tracking-wider mx-auto"
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            Tracks AI Engine Active
          </motion.div>

          <div className="space-y-3">
            <h2 className="text-display text-3xl md:text-4xl text-foreground font-semibold">
              No learning roadmap created yet
            </h2>
            <p className="text-[13px] md:text-[14px] text-foreground-muted leading-relaxed font-sans">
              Tracks AI is a personalized companion for mastering hard concepts. By creating a roadmap, our artificial intelligence crafts custom structured paths, diagnostics, schedules, and active recall guides calibrated exactly to your pace and goals.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary CTA */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleStartSetup}
                size="lg"
                className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-accent-foreground font-semibold h-11 px-6 text-[13px] rounded-md transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/15 border border-accent/40"
              >
                Start Setup
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>

            {/* Secondary CTA */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleScrollToPreviews}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto bg-surface-2 hover:bg-surface-3 text-foreground font-medium h-11 px-6 text-[13px] rounded-md transition-all border border-border/80 flex items-center justify-center gap-2"
              >
                Explore Features
                <Eye className="w-4 h-4 text-foreground-muted" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* 3. Feature Previews Section */}
      <div ref={previewsRef} className="space-y-6 pt-4 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-2 border-b border-border/40 pb-3">
          <h3 className="text-[14px] font-semibold text-foreground tracking-wide uppercase">
            Platform Capabilities Preview
          </h3>
          <p className="text-mono text-[9.5px] text-foreground-subtle">
            Unlocked upon completing your setup profile
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: AI Learning Roadmap */}
          <div className="relative group rounded-xl border border-border/40 bg-surface-1/30 p-5 overflow-hidden">
            {/* Blur Mask & Lock Badge */}
            <div className="absolute inset-0 bg-background/5 backdrop-blur-[2.5px] z-10 flex flex-col items-center justify-center p-4">
              <div className="bg-surface-3/90 border border-border p-3 rounded-lg flex items-center gap-2 shadow-2xl">
                <Lock className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span className="text-mono text-[10px] font-bold tracking-wider text-foreground uppercase">
                  Locked Preview
                </span>
              </div>
            </div>

            {/* Blurred Mock Content */}
            <div className="space-y-4 select-none opacity-40">
              <div className="flex items-center justify-between pb-2 border-b border-border/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-accent-muted flex items-center justify-center text-accent">
                    <Route className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-foreground">Linear Algebra & Vectors</h4>
                    <p className="text-[9px] text-foreground-subtle">Demo Path · 8 Phases</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: "01", name: "Vector Spaces & Subspaces", active: true },
                  { id: "02", name: "Linear Transformations & Projections", active: false },
                  { id: "03", name: "Eigenvalues, Eigenvectors & Diagonalization", active: false }
                ].map((item) => (
                  <div key={item.id} className={`flex items-center gap-3 p-2 rounded border ${item.active ? "bg-surface-2 border-accent/20" : "bg-transparent border-transparent"}`}>
                    <div className="w-4 h-4 rounded-full border border-border flex items-center justify-center">
                      {item.active ? <div className="w-1.5 h-1.5 rounded-full bg-accent" /> : <Lock className="w-2 h-2 text-foreground-subtle" />}
                    </div>
                    <span className="text-mono text-[9px] text-foreground-subtle">RD-{item.id}</span>
                    <span className="text-[11px] text-foreground font-medium">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Progress Analytics */}
          <div className="relative group rounded-xl border border-border/40 bg-surface-1/30 p-5 overflow-hidden">
            {/* Blur Mask & Lock Badge */}
            <div className="absolute inset-0 bg-background/5 backdrop-blur-[2.5px] z-10 flex flex-col items-center justify-center p-4">
              <div className="bg-surface-3/90 border border-border p-3 rounded-lg flex items-center gap-2 shadow-2xl">
                <Lock className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span className="text-mono text-[10px] font-bold tracking-wider text-foreground uppercase">
                  Locked Preview
                </span>
              </div>
            </div>

            {/* Blurred Mock Content */}
            <div className="space-y-4 select-none opacity-40">
              <div className="flex items-center justify-between pb-2 border-b border-border/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-success-muted flex items-center justify-center text-success">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-foreground">Progress & Learning Analytics</h4>
                    <p className="text-[9px] text-foreground-subtle">Daily pace & Concept Mastery</p>
                  </div>
                </div>
              </div>

              <div className="h-24 flex items-end justify-between gap-1 pt-4">
                {[40, 65, 30, 85, 90, 45, 75].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full bg-accent/25 border border-accent/40 rounded-t" style={{ height: `${h}%` }} />
                    <span className="text-mono text-[8px] text-foreground-subtle">{"MTWTFSS"[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Adaptive Quizzes */}
          <div className="relative group rounded-xl border border-border/40 bg-surface-1/30 p-5 overflow-hidden">
            {/* Blur Mask & Lock Badge */}
            <div className="absolute inset-0 bg-background/5 backdrop-blur-[2.5px] z-10 flex flex-col items-center justify-center p-4">
              <div className="bg-surface-3/90 border border-border p-3 rounded-lg flex items-center gap-2 shadow-2xl">
                <Lock className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span className="text-mono text-[10px] font-bold tracking-wider text-foreground uppercase">
                  Locked Preview
                </span>
              </div>
            </div>

            {/* Blurred Mock Content */}
            <div className="space-y-4 select-none opacity-40">
              <div className="flex items-center justify-between pb-2 border-b border-border/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-warning-muted flex items-center justify-center text-warning">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-foreground">Interactive Diagnostics</h4>
                    <p className="text-[9px] text-foreground-subtle">Active recall & assessments</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-foreground">
                  Which algorithm constructs nested proximity graphs to perform vector searches?
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {["IVF index", "HNSW graph", "Flat L2 index", "KD-Tree"].map((ans, idx) => (
                    <div key={ans} className={`p-1.5 rounded border text-[10px] text-foreground-muted flex items-center gap-1.5 ${idx === 1 ? "bg-accent-muted border-accent text-accent" : "bg-surface-2 border-border/40"}`}>
                      <span className="text-mono text-[8px]">{idx + 1}.</span>
                      {ans}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: AI Smart Notes */}
          <div className="relative group rounded-xl border border-border/40 bg-surface-1/30 p-5 overflow-hidden">
            {/* Blur Mask & Lock Badge */}
            <div className="absolute inset-0 bg-background/5 backdrop-blur-[2.5px] z-10 flex flex-col items-center justify-center p-4">
              <div className="bg-surface-3/90 border border-border p-3 rounded-lg flex items-center gap-2 shadow-2xl">
                <Lock className="w-3.5 h-3.5 text-accent animate-pulse" />
                <span className="text-mono text-[10px] font-bold tracking-wider text-foreground uppercase">
                  Locked Preview
                </span>
              </div>
            </div>

            {/* Blurred Mock Content */}
            <div className="space-y-4 select-none opacity-40">
              <div className="flex items-center justify-between pb-2 border-b border-border/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-accent-muted flex items-center justify-center text-accent">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-foreground">Smart Study Notes</h4>
                    <p className="text-[9px] text-foreground-subtle">AI-generated concepts & summaries</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-3 bg-foreground-subtle rounded w-3/4" />
                <div className="h-2.5 bg-foreground-subtle/70 rounded w-full" />
                <div className="h-2.5 bg-foreground-subtle/70 rounded w-5/6" />
                <div className="h-2.5 bg-foreground-subtle/50 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
