"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Route, 
  Target, 
  FileText, 
  BarChart3, 
  Settings,
  HelpCircle,
  CalendarDays,
  Lock,
  MessageSquare
} from "lucide-react"
import { useRoadmap } from "@/hooks/use-roadmap"
import { useAvailableQuizzes } from "@/hooks/use-quiz"

const sidebarItems = [
  { name: "Dashboard",   href: "/dashboard",           icon: LayoutDashboard },
  { name: "My Roadmaps", href: "/dashboard/roadmap",   icon: Route },
  { name: "Timeline",    href: "/dashboard/timeline",  icon: CalendarDays },
  { name: "Quizzes",     href: "/dashboard/quiz",      icon: Target, showBadge: true },
  { name: "Smart Notes", href: "/dashboard/notes",     icon: FileText },
  { name: "Analytics",   href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Mentor AI",   href: "/dashboard/mentor",    icon: MessageSquare },
]

export function DashboardSidebar() {
  const pathname   = usePathname()
  const { roadmapExists } = useRoadmap()
  const { readyCount }    = useAvailableQuizzes()

  return (
    <aside className="hidden lg:flex fixed left-0 top-12 bottom-0 w-14 hover:w-48 bg-background border-r border-border flex-col transition-all duration-200 ease-in-out z-40 group/sidebar overflow-hidden">
      <div className="flex-1 py-4 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          const isLocked = !roadmapExists && item.href !== "/dashboard"
          const hasBadge = item.showBadge && readyCount > 0 && !isLocked
          
          return (
            <Link
              key={item.name}
              href={isLocked ? "#" : item.href}
              onClick={(e) => {
                if (isLocked) e.preventDefault()
              }}
              className={`flex items-center gap-3.5 h-9 px-4 transition-all relative ${
                isLocked
                  ? "text-foreground-subtle/30 cursor-not-allowed hover:bg-transparent"
                  : isActive
                    ? "text-foreground bg-gradient-to-r from-violet-500/10 to-orange-500/10 border-y border-r border-violet-500/30 font-semibold"
                    : "text-foreground-muted hover:text-foreground hover:bg-surface-1"
              }`}
            >
              {isActive && !isLocked && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 to-orange-500" />
              )}
              <div className="relative flex-shrink-0">
                <item.icon className="w-4 h-4" />
                {isLocked && (
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-[1px] border border-border/80">
                    <Lock className="w-[7px] h-[7px] text-foreground-subtle" />
                  </div>
                )}
                {/* Quiz availability badge — same style as Bell dot in dashboard-nav */}
                {hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-accent rounded-full" />
                )}
              </div>
              <span className="text-[12px] font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap flex items-center gap-1.5">
                {item.name}
                {isLocked && (
                  <Lock className="w-[8px] h-[8px] text-foreground-subtle/50" />
                )}
                {/* Pill count badge visible when sidebar is expanded */}
                {hasBadge && (
                  <span className="ml-auto text-mono text-[8px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full font-bold leading-none">
                    {readyCount}
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="py-4 border-t border-border space-y-1">
        <Link
          href="#"
          className="flex items-center gap-3.5 h-9 px-4 text-foreground-muted hover:text-foreground hover:bg-surface-1 transition-all"
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span className="text-[12px] font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Settings
          </span>
        </Link>
        <Link
          href="#"
          className="flex items-center gap-3.5 h-9 px-4 text-foreground-muted hover:text-foreground hover:bg-surface-1 transition-all"
        >
          <HelpCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-[12px] font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Help
          </span>
        </Link>
      </div>
    </aside>
  )
}
