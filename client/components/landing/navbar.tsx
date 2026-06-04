"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Link from "next/link"

const navItems = [
  { name: "Features", href: "#features" },
  { name: "Roadmap", href: "#roadmap" },
  { name: "Quizzes", href: "#quizzes" },
  { name: "Notes", href: "#notes" },
  { name: "Analytics", href: "#analytics" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-background/90 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group" id="nav-logo">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-semibold text-xs">T</span>
            </div>
            <span className="text-[15px] text-emphasis text-foreground tracking-tight">
              Tracks AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                id={`nav-${item.name.toLowerCase()}`}
                className="text-[13px] text-foreground-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-surface-1"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-[13px] text-foreground-muted hover:text-foreground h-8 px-3"
                id="nav-login"
              >
                Log in
              </Button>
            </Link>
            <Link href="/onboarding">
              <Button
                className="text-[13px] h-8 px-4 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md"
                id="nav-cta"
              >
                Start Setup
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-1.5 text-foreground-muted hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            id="nav-mobile-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden py-3 border-t border-border"
          >
            <div className="flex flex-col gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-[13px] text-foreground-muted hover:text-foreground transition-colors px-3 py-2 rounded-md hover:bg-surface-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-3 mt-2 border-t border-border">
                <Link href="/login">
                  <Button variant="ghost" className="w-full justify-start text-[13px] h-8">
                    Log in
                  </Button>
                </Link>
                <Link href="/onboarding">
                  <Button className="w-full text-[13px] h-8 bg-accent hover:bg-accent-hover text-accent-foreground">
                    Start Setup
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}
