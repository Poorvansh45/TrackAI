"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { useRoadmap } from "@/hooks/use-roadmap"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const { roadmapExists, loading: roadmapLoading } = useRoadmap()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.replace("/login"); return }
    if (!roadmapLoading) {
      if (!roadmapExists && pathname !== "/dashboard") { router.replace("/dashboard"); return }
      setLoading(false)
    }
  }, [router, pathname, roadmapExists, roadmapLoading])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-5">
        <div className="text-center space-y-4 max-w-xs mx-auto">
          <div className="w-9 h-9 rounded-md bg-accent/15 flex items-center justify-center mx-auto text-accent">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <h3 className="text-foreground font-semibold text-sm">Verifying Session</h3>
        </div>
      </div>
    )
  }

  // Roadmap page gets full bleed — no container max-width applied
  const isRoadmapPage = pathname === "/dashboard/roadmap"

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div className="flex">
        <DashboardSidebar />
        <main className={`flex-1 pt-16 lg:pl-14 ${isRoadmapPage ? "pb-4 px-4 lg:pb-6 lg:px-6" : "pb-5 px-5 lg:pb-8 lg:px-8"}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
