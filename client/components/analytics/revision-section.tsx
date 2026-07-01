"use client"

import { motion } from "framer-motion"
import { AlertCircle, ArrowRight, ShieldAlert } from "lucide-react"
import { QuizAnalyticsResponse } from "@/lib/quiz-analytics-engine"
import Link from "next/link"

interface RevisionSectionProps {
  quizData: QuizAnalyticsResponse
}

export function RevisionSection({ quizData }: RevisionSectionProps) {
  const hasRevision = quizData.revision_queue.length > 0
  const hasWeak = quizData.weak_topics.length > 0

  if (!hasRevision && !hasWeak && quizData.total_quizzes_taken > 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="surface-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
          <ShieldAlert className="w-4 h-4 text-success" />
          <span>Knowledge Health</span>
        </div>
        <div className="bg-success/5 border border-success/20 p-4 rounded-lg text-center">
          <p className="text-[12px] font-medium text-success mb-1">Excellent Retention</p>
          <p className="text-[11px] text-foreground-subtle">You have no topics currently flagged for revision.</p>
        </div>
      </motion.div>
    )
  }

  // If no quizzes at all, return null
  if (quizData.total_quizzes_taken === 0) return null

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="surface-card p-5 space-y-5"
    >
      <div className="flex items-center gap-2 text-foreground font-semibold text-[13px]">
        <AlertCircle className="w-4 h-4 text-warning" />
        <span>Revision Queue & Weak Topics</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Left: Revision Queue (Actionable) */}
        <div>
          <h4 className="text-mono text-[9px] text-foreground-subtle uppercase mb-3 flex items-center justify-between">
            <span>Action Required</span>
            <span className="bg-warning/10 text-warning px-1.5 py-0.5 rounded">{quizData.revision_queue.length}</span>
          </h4>
          
          <div className="space-y-2">
            {quizData.revision_queue.length === 0 ? (
              <p className="text-[11px] text-foreground-subtle">No pending revisions.</p>
            ) : (
              quizData.revision_queue.slice(0, 5).map((topic, idx) => (
                <div key={idx} className="bg-surface-2/40 border border-border/40 p-3 rounded-lg flex items-center justify-between group">
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-mono text-[8px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                        topic.priority === "High" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                        topic.priority === "Medium" ? "bg-warning/10 text-warning border border-warning/20" :
                        "bg-foreground-subtle/10 text-foreground-subtle border border-border"
                      }`}>
                        {topic.priority}
                      </span>
                      <span className="text-mono text-[9px] text-foreground-subtle">
                        {topic.latest_score}% Last Score
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-foreground truncate">{topic.topic_name}</p>
                  </div>
                  
                  {/* CTA Navigates to Topic Workspace */}
                  <Link href={`/topic/${topic.topic_id}`}>
                    <button className="flex-shrink-0 w-8 h-8 rounded bg-surface-3 border border-border flex items-center justify-center text-foreground-subtle group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-colors shadow-sm">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Weak Topics Summary (Informational) */}
        <div>
          <h4 className="text-mono text-[9px] text-foreground-subtle uppercase mb-3 flex items-center justify-between">
            <span>Historical Weaknesses</span>
            <span className="bg-surface-2 px-1.5 py-0.5 rounded text-foreground">{quizData.weak_topics.length}</span>
          </h4>
          
          <div className="space-y-2">
            {quizData.weak_topics.length === 0 ? (
              <p className="text-[11px] text-foreground-subtle">No structural weaknesses detected.</p>
            ) : (
              quizData.weak_topics.slice(0, 4).map((topic, idx) => (
                <div key={idx} className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[11.5px] text-foreground truncate">{topic.topic_name}</p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-mono text-[10px] text-destructive font-semibold">{topic.average_score.toFixed(0)}% Avg</span>
                    <span className="text-mono text-[8px] text-foreground-subtle">{topic.attempt_count} attempts</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
