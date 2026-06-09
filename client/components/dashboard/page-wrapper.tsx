"use client"

import React from "react"

interface PageWrapperProps {
  children: React.ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
  className?: string
}

export function PageWrapper({
  children,
  maxWidth = "lg",
  className = "",
}: PageWrapperProps) {
  const maxWidthClass = {
    sm: "max-w-[700px]",
    md: "max-w-[800px]",
    lg: "max-w-[1000px]",
    xl: "max-w-[1200px]",
    full: "w-full max-w-none",
  }[maxWidth]

  return (
    <div className={`w-full mx-auto space-y-6 ${maxWidthClass} ${className}`}>
      {children}
    </div>
  )
}
