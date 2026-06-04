"use client"

import Link from "next/link"
import { Bell, Search, Settings ,LogOut } from "lucide-react"

export function DashboardNav() {
    const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
  };
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-12 flex items-center px-4 lg:px-6">
      <div className="w-full flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group" id="dashboard-nav-logo">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-semibold text-[11px]">T</span>
            </div>
            <span className="text-[13px] text-emphasis text-foreground tracking-tight">
              Tracks AI
            </span>
          </Link>
        </div>

        {/* Center: Search Trigger (Cmd+K style) */}
        <div className="hidden md:flex flex-1 max-w-[280px] mx-8">
          <button className="w-full flex items-center justify-between bg-surface-1/40 hover:bg-surface-1 border border-border/80 px-2.5 py-1 rounded-md text-[11px] text-foreground-muted hover:text-foreground transition-colors group">
            <div className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-foreground-subtle" />
              <span>Search platform...</span>
            </div>
            <kbd className="text-mono text-[9px] text-foreground-subtle bg-surface-2 border border-border px-1.5 py-0.5 rounded leading-none">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button className="relative w-8 h-8 rounded-md hover:bg-surface-1 flex items-center justify-center border border-transparent hover:border-border/40 text-foreground-muted hover:text-foreground transition-all">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
          </button>
          
          <button className="w-8 h-8 rounded-md hover:bg-surface-1 flex items-center justify-center border border-transparent hover:border-border/40 text-foreground-muted hover:text-foreground transition-all">
            <Settings className="w-4 h-4" />
          </button>
            {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-md hover:bg-surface-1 flex items-center justify-center border border-transparent hover:border-border/40 text-foreground-muted hover:text-red-500 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
          {/* Profile Avatar */}
          <div className="w-7 h-7 rounded-md bg-accent/20 flex items-center justify-center border border-accent/30 text-accent font-semibold text-mono text-[10px] cursor-pointer">
            JD
          </div>
        </div>
      </div>
    </nav>
  )
}
