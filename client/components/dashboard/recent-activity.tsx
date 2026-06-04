"use client"

import { motion } from "framer-motion"
import { CheckCircle2, FileText, Target, Clock } from "lucide-react"

const activities = [
  { id: 1, type: "quiz", label: "Passed Quiz: Vector Embeddings", meta: "Accuracy: 92% · +100 XP", time: "2h ago", icon: Target, iconColor: "text-accent bg-accent/15" },
  { id: 2, type: "notes", label: "Generated notes for RAG Systems", meta: "8 key concepts mapped", time: "4h ago", icon: FileText, iconColor: "text-success bg-success-muted" },
  { id: 3, type: "lesson", label: "Completed: Chunking Strategies", meta: "Verified 2 concepts · +75 XP", time: "1d ago", icon: CheckCircle2, iconColor: "text-warning bg-warning-muted" },
]

export function RecentActivity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="surface-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center border border-border/80">
            <Clock className="w-4 h-4 text-foreground-subtle" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-foreground">Recent Activity</h3>
            <p className="text-mono text-[9px] text-foreground-subtle">Curriculum audit trail</p>
          </div>
        </div>
      </div>

      <div className="relative pl-1">
        {/* Timeline line */}
        <div className="absolute left-[17px] top-3 bottom-3 w-[1px] bg-border/60" />

        <div className="space-y-4">
          {activities.map((act) => (
            <div key={act.id} className="relative flex items-start gap-4 pl-8">
              {/* Timeline marker node icon */}
              <div className={`absolute left-1 z-10 w-6 h-6 rounded flex items-center justify-center ${act.iconColor}`}>
                <act.icon className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-[12px] font-semibold text-foreground truncate">
                    {act.label}
                  </h4>
                  <span className="text-mono text-[9px] text-foreground-subtle flex-shrink-0">
                    {act.time}
                  </span>
                </div>
                <p className="text-[11px] text-foreground-subtle mt-0.5">
                  {act.meta}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
