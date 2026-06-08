"use client"

import Link from "next/link"
import { Bell, Search } from "lucide-react"
import { ProfileDropdown } from "./profile-dropdown"

export function DashboardNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-12 flex items-center px-4 lg:px-6">
      <div className="w-full flex items-center justify-between">

        {/* Logo → always home for authenticated users */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-semibold text-[11px]">T</span>
            </div>
            <span className="text-[13px] text-emphasis text-foreground tracking-tight">
              Tracks AI
            </span>
          </Link>
        </div>

        {/* Cmd+K search */}
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

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button className="relative w-8 h-8 rounded-md hover:bg-surface-1 flex items-center justify-center border border-transparent hover:border-border/40 text-foreground-muted hover:text-foreground transition-all">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full" />
          </button>
          <ProfileDropdown />
        </div>
      </div>
    </nav>
  )
}
