"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, X, ArrowRight, RefreshCw, AlertTriangle, Lightbulb } from "lucide-react"
import Link from "next/link"

const quizQuestions = [
  {
    id: 1,
    question: "Which of the following index types in vector databases is based on Hierarchical Navigable Small World graphs?",
    options: [
      { key: "A", text: "IVF-FLAT" },
      { key: "B", text: "HNSW" },
      { key: "C", text: "LSH" },
      { key: "D", text: "Flat" }
    ],
    answer: "B",
    explanation: "HNSW (Hierarchical Navigable Small World) builds a multi-layer graph index that allows fast approximate nearest neighbor search with logarithmic complexity."
  },
  {
    id: 2,
    question: "What is the primary role of 'Chunking' in a RAG pipeline?",
    options: [
      { key: "A", text: "Converting non-English texts to English templates" },
      { key: "B", text: "Splitting long documents into smaller segments to fit LLM context windows" },
      { key: "C", text: "Applying compression to embedding vectors" },
      { key: "D", text: "Encrypting credentials sent to external databases" }
    ],
    answer: "B",
    explanation: "Chunking splits large input documents into smaller passages, which ensures that retrieved context is highly relevant and fits within the model's token limits."
  },
  {
    id: 3,
    question: "How does IVF-FLAT reduce query search time?",
    options: [
      { key: "A", text: "By using quantization algorithms to reduce vector dimensionality" },
      { key: "B", text: "By partitioning the vector space into Voronoi cells and searching only the nearest centroid lists" },
      { key: "C", text: "By performing exact nearest neighbor searches across all vector entries" },
      { key: "D", text: "By caching previous query responses in memory arrays" }
    ],
    answer: "B",
    explanation: "IVF-FLAT cluster-groups vectors around centroids, narrowing down searches to a few lists matching the query's nearest centroids instead of searching the entire database."
  }
]

export default function QuizPage() {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [score, setScore] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const currentQ = quizQuestions[currentIdx]

  const handleSelectOption = (key: string) => {
    if (isSubmitted) return
    setSelectedKey(key)
  }

  const handleSubmit = () => {
    if (!selectedKey || isSubmitted) return
    setIsSubmitted(true)
    if (selectedKey === currentQ.answer) {
      setScore((prev) => prev + 1)
    }
  }

  const handleNext = () => {
    setSelectedKey(null)
    setIsSubmitted(false)
    if (currentIdx < quizQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1)
    } else {
      setIsFinished(true)
    }
  }

  const handleRestart = () => {
    setCurrentIdx(0)
    setSelectedKey(null)
    setIsSubmitted(false)
    setScore(0)
    setIsFinished(false)
  }

  const progress = ((currentIdx) / quizQuestions.length) * 100

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
            {/* Header */}
            <div className="border-b border-border/40 pb-5 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
                  Skill <span className="text-accent">Verification</span>
                </h1>
                <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider">
                  TOPIC: VECTOR EMBEDDINGS & INDEXING · ASSESSMENT DECK
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-mono text-[9px] bg-accent-subtle text-accent border border-accent/25 px-2.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                ADAPTIVE: ACTIVE
              </div>
            </div>

            {/* Quiz Container */}
            <AnimatePresence mode="wait">
              {!isFinished ? (
                <motion.div
                  key={currentIdx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Progress Indicators */}
                  <div>
                    <div className="flex justify-between text-mono text-[9px] text-foreground-subtle mb-1.5">
                      <span>QUESTION {currentIdx + 1} OF {quizQuestions.length}</span>
                      <span>ACCURACY RATING: {Math.round((score / quizQuestions.length) * 100)}%</span>
                    </div>
                    <div className="h-1 bg-surface-2 rounded-full overflow-hidden border border-border/20">
                      <div 
                        className="h-full bg-accent transition-all duration-300"
                        style={{ width: `${((currentIdx + 1) / quizQuestions.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Question */}
                  <div className="surface-card p-6">
                    <span className="text-mono text-[9px] text-accent uppercase tracking-wider font-semibold">
                      VERIFICATION CHECKPOINT
                    </span>
                    <h2 className="text-[14px] font-semibold text-foreground mt-2 leading-relaxed">
                      {currentQ.question}
                    </h2>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentQ.options.map((opt) => {
                      const isSelected = selectedKey === opt.key
                      const isCorrect = opt.key === currentQ.answer
                      const isWrong = isSelected && !isCorrect
                      
                      let cardStyle = "bg-surface-1/40 border-border/60 hover:bg-surface-1 hover:border-border"
                      if (isSelected && !isSubmitted) {
                        cardStyle = "bg-surface-2 border-accent"
                      } else if (isSubmitted) {
                        if (isCorrect) {
                          cardStyle = "bg-success-muted border-success text-success"
                        } else if (isWrong) {
                          cardStyle = "bg-destructive-muted border-destructive text-destructive"
                        } else {
                          cardStyle = "bg-surface-1/20 border-border/40 opacity-50 cursor-not-allowed"
                        }
                      }

                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelectOption(opt.key)}
                          disabled={isSubmitted}
                          className={`w-full flex items-center gap-3.5 p-4 rounded-lg border text-left transition-all ${cardStyle}`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center text-mono text-[10px] font-semibold border ${
                            isSelected && !isSubmitted
                              ? "bg-accent text-accent-foreground border-accent"
                              : isSubmitted && isCorrect
                                ? "bg-success text-success-foreground border-success"
                                : isSubmitted && isWrong
                                  ? "bg-destructive text-destructive-foreground border-destructive"
                                  : "bg-surface-2 border-border text-foreground-subtle"
                          }`}>
                            {isSubmitted && isCorrect ? (
                              <Check className="w-3 h-3" />
                            ) : isSubmitted && isWrong ? (
                              <X className="w-3 h-3" />
                            ) : (
                              opt.key
                            )}
                          </div>
                          <span className="text-[12px] font-medium leading-relaxed">{opt.text}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Submission and Explanations */}
                  <div className="flex flex-col gap-4">
                    {!isSubmitted ? (
                      <button
                        onClick={handleSubmit}
                        disabled={!selectedKey}
                        className="w-full bg-accent hover:bg-accent-hover text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-md h-10 px-4 text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        Submit Response
                      </button>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* Explanation Card */}
                        <div className="surface-card p-4 border border-border/60 bg-surface-2/20">
                          <div className="flex gap-2 text-accent mb-2">
                            <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span className="text-[12px] font-semibold">Explanatory Analysis</span>
                          </div>
                          <p className="text-[11px] text-foreground-muted leading-relaxed">
                            {currentQ.explanation}
                          </p>
                        </div>

                        <button
                          onClick={handleNext}
                          className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-10 px-4 text-[12px] font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          {currentIdx < quizQuestions.length - 1 ? "Next Question" : "Finish Checkpoint"}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="surface-card p-6 text-center space-y-6"
                >
                  <div className="w-12 h-12 rounded-md bg-success-muted flex items-center justify-center mx-auto text-success">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-display text-2xl text-foreground">Checkpoint Verification Complete</h2>
                    <p className="text-foreground-muted text-[13px] mt-1.5 max-w-sm mx-auto leading-relaxed">
                      You correctly answered {score} of {quizQuestions.length} questions. Your baseline accuracy score has been updated.
                    </p>
                  </div>

                  {/* Weak topics recap */}
                  {score < quizQuestions.length && (
                    <div className="border border-border/60 bg-surface-2/30 rounded-lg p-4 text-left space-y-2 max-w-md mx-auto">
                      <div className="flex gap-2 text-warning mb-1">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-mono">Recommended Reviews</span>
                      </div>
                      <p className="text-[11px] text-foreground-muted leading-relaxed">
                        Based on incorrect responses, we have flagged <span className="text-foreground font-semibold">Vector Indexing (HNSW)</span> for revision.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto pt-2">
                    <button
                      onClick={handleRestart}
                      className="w-full bg-surface-2 hover:bg-surface-3 border border-border text-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retake Quiz
                    </button>
                    <Link href="/dashboard" className="w-full">
                      <button className="w-full bg-accent hover:bg-accent-hover text-accent-foreground rounded-md h-9 px-4 text-[12px] font-medium transition-colors flex items-center justify-center gap-1.5">
                        Back to Deck
                      </button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
    </div>
  )
}
