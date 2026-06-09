"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  LayoutDashboard, 
  Route, 
  Settings, 
  LogOut,
  ChevronDown,
  User
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface UserProfile {
  name: string
  email: string
}

export function ProfileDropdown() {
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        console.error("Failed to parse user data", e)
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    localStorage.removeItem("generatedRoadmap")
    window.location.replace("/login")
  }

  // Get initials from user's name
  const getInitials = (name: string) => {
    if (!name) return "U"
    const parts = name.trim().split(" ").filter(Boolean)
    if (parts.length === 0) return "U"
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const initials = user ? getInitials(user.name) : "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 focus:outline-none group select-none">
          <div className="w-8 h-8 rounded-md bg-accent/20 hover:bg-accent/30 flex items-center justify-center border border-accent/30 text-accent font-semibold text-mono text-[11px] cursor-pointer transition-all">
            {initials}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-foreground-subtle group-hover:text-foreground transition-colors" />
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-md border border-border/80 p-1.5 shadow-xl rounded-lg">
        {user && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-[12px] font-semibold text-foreground leading-none">{user.name}</p>
              <p className="text-[10px] text-foreground-subtle leading-none mt-1 truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator className="bg-border/60 my-1" />
          </>
        )}
        
        <DropdownMenuItem asChild className="focus:bg-surface-2 focus:text-foreground rounded transition-colors py-1.5 px-2 cursor-pointer">
          <Link href="/dashboard" className="flex items-center gap-2 text-[12px] w-full">
            <LayoutDashboard className="w-3.5 h-3.5 text-foreground-subtle" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild className="focus:bg-surface-2 focus:text-foreground rounded transition-colors py-1.5 px-2 cursor-pointer">
          <Link href="/dashboard/roadmap" className="flex items-center gap-2 text-[12px] w-full">
            <Route className="w-3.5 h-3.5 text-foreground-subtle" />
            <span>Roadmaps</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild className="focus:bg-surface-2 focus:text-foreground rounded transition-colors py-1.5 px-2 cursor-pointer">
          <Link href="/dashboard#settings" className="flex items-center gap-2 text-[12px] w-full">
            <Settings className="w-3.5 h-3.5 text-foreground-subtle" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-border/60 my-1" />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="focus:bg-destructive-muted focus:text-destructive rounded transition-colors py-1.5 px-2 cursor-pointer text-destructive flex items-center gap-2 text-[12px]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
