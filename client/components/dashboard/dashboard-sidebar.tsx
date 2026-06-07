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
  CalendarDays
} from "lucide-react"

const sidebarItems = [
  { name: "Dashboard",  href: "/dashboard",           icon: LayoutDashboard },
  { name: "Roadmap",    href: "/dashboard/roadmap",   icon: Route },
  { name: "Timeline",   href: "/dashboard/timeline",  icon: CalendarDays },
  { name: "Quizzes",    href: "/dashboard/quiz",      icon: Target },
  { name: "Smart Notes",href: "/dashboard/notes",     icon: FileText },
  { name: "Analytics",  href: "/dashboard/analytics", icon: BarChart3 },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex fixed left-0 top-12 bottom-0 w-14 hover:w-48 bg-background border-r border-border flex-col transition-all duration-200 ease-in-out z-40 group/sidebar overflow-hidden">
      <div className="flex-1 py-4 space-y-1">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3.5 h-9 px-4 transition-all relative ${
                isActive
                  ? "text-foreground bg-surface-2"
                  : "text-foreground-muted hover:text-foreground hover:bg-surface-1"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent" />
              )}
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-[12px] font-medium opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                {item.name}
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
