"use client"

import { motion } from "framer-motion"
import { Send, Brain, AlertTriangle, Lightbulb } from "lucide-react"

const chatMessages = [
  {
    type: "ai" as const,
    label: "Weakness Detected",
    icon: AlertTriangle,
    iconColor: "text-warning",
    content: "I noticed you scored 45% on Prompt Chaining in your last quiz. Want me to break it down step by step?",
  },
  {
    type: "user" as const,
    content: "Yes! I'm confused about chaining multiple prompts together.",
  },
  {
    type: "ai" as const,
    label: "Insight",
    icon: Lightbulb,
    iconColor: "text-accent",
    content: "Prompt chaining passes the output of one LLM call as input to another. Think of it like piping commands in a terminal — each step refines the result.",
  },
]

export function AIMentorSection() {
  return (
    <section className="py-20 relative" id="features">
      <div className="max-w-[1200px] mx-auto px-5">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Content */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-mono text-[11px] text-foreground-subtle uppercase tracking-wider">
                Section 01
              </span>
            </div>

            <h2 className="text-display text-3xl sm:text-4xl mb-4 leading-[1.15]">
              An AI Mentor That{" "}
              <span className="text-accent">Understands Your Journey</span>
            </h2>

            <p className="text-foreground-muted text-[15px] leading-relaxed mb-8 max-w-md">
              Not a generic chatbot — a context-aware mentor that knows your roadmap progress, 
              quiz weaknesses, and exactly what you should study next.
            </p>

            <div className="space-y-3">
              {[
                "Detects weak concepts from quiz results",
                "Suggests next steps based on roadmap progress",
                "Explains topics with personalized examples",
                "Available 24/7, always aware of your context",
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                  <span className="text-[14px] text-foreground">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right — Chat Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="surface-card overflow-hidden">
              {/* Chat header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center">
                  <Brain className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <div className="text-[13px] text-emphasis text-foreground">AI Mentor</div>
                  <div className="text-mono text-[10px] text-foreground-subtle">Context: RAG Systems · Week 4</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="text-mono text-[10px] text-foreground-subtle">Online</span>
                </div>
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3 min-h-[280px]">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 rounded-lg text-[13px] leading-snug ${
                        msg.type === "user"
                          ? "bg-accent text-accent-foreground rounded-br-sm"
                          : "bg-surface-2 border border-border text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.type === "ai" && msg.icon && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <msg.icon className={`w-3 h-3 ${msg.iconColor}`} />
                          <span className="text-mono text-[10px] text-foreground-subtle uppercase">{msg.label}</span>
                        </div>
                      )}
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9 }}
                  className="flex justify-start"
                >
                  <div className="bg-surface-2 border border-border rounded-lg rounded-bl-sm px-3.5 py-2.5">
                    <div className="flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.3, 0.8, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
                          className="w-1.5 h-1.5 bg-foreground-subtle rounded-full"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ask your AI mentor..."
                    className="flex-1 bg-surface-2 border border-border rounded-md px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-subtle focus:outline-none focus:border-accent/50 transition-colors"
                  />
                  <button className="w-8 h-8 rounded-md bg-accent hover:bg-accent-hover flex items-center justify-center transition-colors">
                    <Send className="w-3.5 h-3.5 text-accent-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
