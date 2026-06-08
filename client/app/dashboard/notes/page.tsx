"use client"

import { FileText, Download, BookOpen, ChevronRight, CheckSquare, Bookmark } from "lucide-react"
import { PageWrapper } from "@/components/dashboard/page-wrapper"

const noteSections = [
  {
    id: "summary",
    title: "1. Core Summary",
    content: "Retrieval-Augmented Generation (RAG) is a pattern that optimizes the output of a Large Language Model (LLM) by referencing an authoritative, external knowledge base before generating a response. This mitigates hallucination issues by grounding model inputs in factual data queries."
  },
  {
    id: "concepts",
    title: "2. Crucial Concepts",
    content: "• Chunking: The process of splitting source text documents into smaller semantically cohesive segments.\n• Vector Embeddings: Numerical representation of words, phrases, or segments reflecting semantic relationships.\n• Approximate Nearest Neighbor (ANN): Algorithmic graphs (like HNSW) enabling fast search recall on high-dimensional vectors."
  },
  {
    id: "architecture",
    title: "3. RAG Pipeline Flow",
    content: "1. User Query: User submits query string.\n2. Vector Query: Query is embedded and searched against Vector Database index.\n3. Augmentation: Retrieved documents are inserted into the prompt template alongside the query.\n4. Generation: Grounded prompt is passed to the LLM to output a verified reply."
  },
  {
    id: "questions",
    title: "4. Target Interview Prep",
    content: "Q: How do IVF indexes compare to HNSW indexes in vector storage?\nA: IVF indexes divide spaces into Voronoi zones and search centroid buckets (faster build times, lower accuracy). HNSW constructs nested proximity graphs yielding extremely fast query response times at the expense of higher memory usage."
  }
]

export default function NotesPage() {
  return (
    <PageWrapper maxWidth="lg">
            {/* Header */}
            <div className="border-b border-border/40 pb-5 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-display text-2xl sm:text-3xl text-foreground leading-normal">
                  Smart <span className="text-accent">Notes</span>
                </h1>
                <p className="text-mono text-[10px] text-foreground-subtle mt-1 tracking-wider">
                  TOPIC: RETRIEVAL-AUGMENTED GENERATION (RAG)
                </p>
              </div>
              <button className="flex items-center gap-1.5 border border-border hover:bg-surface-2 text-foreground-muted hover:text-foreground text-mono text-[10px] px-3 py-1.5 rounded transition-colors font-medium">
                <Download className="w-3.5 h-3.5" />
                EXPORT PDF
              </button>
            </div>

            {/* Layout Grid */}
            <div className="grid lg:grid-cols-4 gap-6 items-start">
              {/* Left Column — Notes Content (3/4 width) */}
              <div className="lg:col-span-3 space-y-4">
                {noteSections.map((sec) => (
                  <div key={sec.id} className="surface-card p-6 space-y-3" id={`notes-${sec.id}`}>
                    <span className="text-mono text-[9px] text-accent uppercase tracking-wider font-semibold">
                      SECTION: {sec.id.toUpperCase()}
                    </span>
                    <h2 className="text-[13px] font-semibold text-foreground border-b border-border/40 pb-2">
                      {sec.title}
                    </h2>
                    <p className="text-[12px] text-foreground-muted leading-relaxed whitespace-pre-line">
                      {sec.content}
                    </p>
                  </div>
                ))}
              </div>

              {/* Right Column — Table of Contents & Checklist (1/4 width) */}
              <div className="space-y-6 lg:sticky lg:top-20">
                {/* Table of Contents */}
                <div className="surface-card p-4">
                  <div className="flex gap-2 text-foreground font-semibold mb-3 text-[12px]">
                    <Bookmark className="w-4 h-4 text-accent" />
                    <span>Table of Contents</span>
                  </div>
                  <nav className="space-y-1.5 text-mono text-[10px]">
                    {noteSections.map((sec) => (
                      <a 
                        key={sec.id}
                        href={`#notes-${sec.id}`}
                        className="flex items-center justify-between text-foreground-subtle hover:text-foreground p-1.5 rounded hover:bg-surface-2/40 transition-all"
                      >
                        <span>{sec.title}</span>
                        <ChevronRight className="w-3 h-3 text-foreground-subtle/50" />
                      </a>
                    ))}
                  </nav>
                </div>

                {/* Revision Checklist */}
                <div className="surface-card p-4">
                  <div className="flex gap-2 text-foreground font-semibold mb-3 text-[12px]">
                    <CheckSquare className="w-4 h-4 text-accent" />
                    <span>Revision Checklist</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Understand RAG Pattern", done: true },
                      { label: "Analyze Chunking limits", done: true },
                      { label: "Compare HNSW and IVF-FLAT", done: false },
                      { label: "Setup prompt templates", done: false },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <input 
                          type="checkbox" 
                          defaultChecked={item.done} 
                          className="mt-0.5 w-3.5 h-3.5 rounded border border-border bg-surface-2 focus:ring-0 text-accent accent-accent cursor-pointer"
                        />
                        <span className={`text-[11px] leading-none ${item.done ? "text-foreground-subtle line-through" : "text-foreground-muted"}`}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
    </PageWrapper>
  )
}
