"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageSquare,
  Sparkles,
  Youtube,
  BookOpen,
  Target,
  GraduationCap,
  Paperclip,
  Send,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  Compass,
  FileText,
  AlertCircle,
  Check,
  ChevronDown
} from "lucide-react"
import { PageWrapper } from "@/components/dashboard/page-wrapper"
import { useRoadmapProgress } from "@/lib/roadmap-state"

// Types for Chat Simulator
interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface Message {
  id: string
  sender: "user" | "ai"
  text: string
  timestamp: string
  type?: "text" | "youtube_summary" | "quiz" | "roadmap_help"
  quizData?: {
    question: string
    options: string[]
    correctIndex: number
    explanation: string
    selectedIndex?: number
    currentQuestionNum?: number
    totalQuestions?: number
    score?: number
  }
  ytMetadata?: {
    title: string
    duration: string
    channel: string
    chapters: { time: string; title: string; desc: string }[]
    takeaways: string[]
  }
  roadmapHelpData?: {
    topicName: string
    subtopics: string[]
  }
}

// Pre-defined mockup quizzes based on roadmap topics
const MOCK_QUIZZES: Record<string, QuizQuestion[]> = {
  default: [
    {
      question: "Which of the following is true about Python lists and tuples?",
      options: [
        "Lists are mutable and defined with square brackets, while tuples are immutable and defined with parentheses.",
        "Lists are immutable and defined with parentheses, while tuples are mutable and defined with square brackets.",
        "Both lists and tuples are mutable, but tuples are faster to iterate.",
        "Both lists and tuples are immutable, but lists allow heterogeneous elements."
      ],
      correctIndex: 0,
      explanation: "Python lists are mutable (can be changed after creation), while tuples are immutable (cannot be changed). Lists use brackets `[ ]` and tuples use parentheses `( )`."
    },
    {
      question: "What is the computational complexity of appending an item to a list in Python?",
      options: [
        "O(N) - Linear time complexity",
        "O(log N) - Logarithmic time complexity",
        "O(1) - Amortized constant time complexity",
        "O(N log N)"
      ],
      correctIndex: 2,
      explanation: "Appending an element to a Python list takes O(1) amortized constant time because Python lists are implemented as dynamic arrays which over-allocate space."
    },
    {
      question: "Which hash-based collection requires elements to be hashable in Python?",
      options: [
        "List",
        "Set",
        "Tuple",
        "Both Set and Dictionary Keys"
      ],
      correctIndex: 3,
      explanation: "Both sets and keys in a dictionary utilize a hash table implementation to guarantee O(1) lookups, meaning any value added to a set or used as a key must be immutable and hashable."
    }
  ]
}

const MODELS = [
  { id: "Auto", name: "Auto", version: "Default" },
  { id: "GPT-4o", name: "GPT", version: "4.o" },
  { id: "Claude-3.5", name: "Sonnet", version: "3.5" },
  { id: "Gemini-1.5", name: "Gemini Pro", version: "1.5" },
]

export default function MentorAIPage() {
  const [userName, setUserName] = useState("Learner")
  const { data: roadmapData, loading: roadmapLoading } = useRoadmapProgress()

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [aiModel, setAiModel] = useState("Auto")
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)

  // Toggles
  const [isRoadmapContextActive, setIsRoadmapContextActive] = useState(true)
  const [isQuizAccessActive, setIsQuizAccessActive] = useState(true)

  // YouTube Summary dialog
  const [isYoutubeDialogOpen, setIsYoutubeDialogOpen] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState("")

  // Auto-scroll ref
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Retrieve user name
  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        const name = user.first_name || user.name || user.username || "Learner"
        setUserName(name)
      }
    } catch {}
  }, [])

  // Auto scroll to chat bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isTyping])

  // Get current active topic
  const activeTopic = roadmapData?.phases
    ?.flatMap((p) => p.topics)
    ?.find((t) => t.status === "active")

  // Send a user message and trigger simulated AI response
  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return

    const newMsg: Message = {
      id: Math.random().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }

    setMessages((prev) => [...prev, newMsg])
    setInputText("")
    setIsTyping(true)

    // Simulate AI response delay
    setTimeout(() => {
      generateAIResponse(textToSend.toLowerCase())
    }, 1500)
  }

  // AI Response generator
  const generateAIResponse = (query: string) => {
    setIsTyping(false)
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    // 1. YouTube Link Request
    if (query.includes("youtube.com") || query.includes("youtu.be") || query.includes("summarize this video")) {
      const mockSummary: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: "Here is a structured summary of the YouTube video you requested.",
        timestamp: time,
        type: "youtube_summary",
        ytMetadata: {
          title: "Complete Introduction to Vector Databases & Similarity Search",
          duration: "18:45 mins",
          channel: "Tracks AI Academy",
          chapters: [
            { time: "00:00 - Introduction", title: "What is vector embeddings?", desc: "Converting unstructured text, images, and audio into float arrays representing high-dimensional semantics." },
            { time: "03:15 - Distance Metrics", title: "Cosine vs L2 vs Dot Product", desc: "Understanding similarity scales: Cosine measures angle, L2 measures euclidean distance, Dot Product accounts for magnitude." },
            { time: "07:45 - Indexing Methods", title: "IVF-Flat and HNSW Overview", desc: "How index quantization speeds up search from linear scan O(N) to logarithmic lookup speeds." },
            { time: "13:30 - Practical Integration", title: "Connecting with LLM Context", desc: "Retrieval-Augmented Generation (RAG) loops: retrieving k-nearest neighbors to augment prompt context." }
          ],
          takeaways: [
            "Vector databases are optimized for similarity search (Approximate Nearest Neighbors), not precise tabular queries.",
            "Choosing the right distance metric must match the model's training space (e.g., Cosine for normalized embeddings).",
            "HNSW (Hierarchical Navigable Small World) provides outstanding search recall speed at the cost of higher RAM usage."
          ]
        }
      }
      setMessages((prev) => [...prev, mockSummary])
      return
    }

    // 2. Quiz Request
    if (query.includes("quiz") || query.includes("test my understanding")) {
      const topicName = activeTopic?.topic_name || "Python lists & tuples"
      const questions = MOCK_QUIZZES.default
      const firstQ = questions[0]

      const quizMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: `Alright! Let's start a short practice quiz on **${topicName}** to test your knowledge. Here is your first question:`,
        timestamp: time,
        type: "quiz",
        quizData: {
          question: firstQ.question,
          options: firstQ.options,
          correctIndex: firstQ.correctIndex,
          explanation: firstQ.explanation,
          currentQuestionNum: 1,
          totalQuestions: questions.length,
          score: 0
        }
      }
      setMessages((prev) => [...prev, quizMsg])
      return
    }

    // 3. Roadmap Help Request
    if (query.includes("roadmap") || query.includes("help from my roadmap") || query.includes("what should i learn next")) {
      const currentTopicName = activeTopic?.topic_name || "Python Syntax and Data Types"
      // Simulated subtopics
      const subtopics = ["Variables and Assignment", "Primitive Data Types (int, float, str, bool)", "Basic Math Operations", "Type Casting", "String Formatting"]

      const roadmapMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: `I've loaded your learning tracker context. You are currently studying **${currentTopicName}**. Here are key concepts inside this topic that you should review:`,
        timestamp: time,
        type: "roadmap_help",
        roadmapHelpData: {
          topicName: currentTopicName,
          subtopics: subtopics
        }
      }
      setMessages((prev) => [...prev, roadmapMsg])
      return
    }

    // 4. Explain lists vs tuples / concept explanation
    if (query.includes("lists vs tuples") || query.includes("list") || query.includes("tuple")) {
      const explainMsg: Message = {
        id: Math.random().toString(),
        sender: "ai",
        text: `### Python Lists vs. Tuples: Key Differences

In Python, both **lists** and **tuples** are sequence collections that can store arbitrary objects. However, they have fundamental architectural differences:

| Feature | Lists | Tuples |
| :--- | :--- | :--- |
| **Mutability** | **Mutable** (you can append, delete, or modify values) | **Immutable** (cannot be changed after creation) |
| **Syntax** | Enclosed in brackets: \`[1, 2, 3]\` | Enclosed in parentheses: \`(1, 2, 3)\` |
| **Size** | Over-allocates memory to support append operations | Allocates the exact memory space needed |
| **Use Case** | Dynamic lists, queues, or stacks of elements | Fixed schemas, key-value records, database rows |

#### 💻 Code Comparison:
\`\`\`python
# --- LISTS (Mutable) ---
my_list = [1, 2, 3]
my_list.append(4)  # Works perfectly: [1, 2, 3, 4]
my_list[0] = 99    # Modifiable in place: [99, 2, 3, 4]

# --- TUPLES (Immutable) ---
my_tuple = (1, 2, 3)
try:
    my_tuple.append(4)  # AttributeError: 'tuple' object has no attribute 'append'
    my_tuple[0] = 99    # TypeError: 'tuple' object does not support item assignment
except Exception as e:
    print(f"Error: {e}")
\`\`\`

#### 🚀 Performance Tip:
Since tuples are immutable, Python allocates a single contiguous block of memory with no extra capacity. This makes tuples **faster to instantiate** and **slightly more memory efficient** than lists. Use tuples whenever your data is read-only.`,
        timestamp: time
      }
      setMessages((prev) => [...prev, explainMsg])
      return
    }

    // 5. Default generic response
    const fallbackMsg: Message = {
      id: Math.random().toString(),
      sender: "ai",
      text: `That's a great question! Let's break this down.

To understand this concept clearly, we need to focus on two core aspects:

1. **The Structural Logic**: How it stores and maps data under the hood (e.g., memory overhead, hash keys, search speed).
2. **The Execution Flow**: How it behaves at runtime during computations, loops, or conditional statements.

Would you like to walk through a concrete Python code snippet demonstrating this, or should we run a quick interactive quiz to lock in the fundamentals?`,
      timestamp: time
    }
    setMessages((prev) => [...prev, fallbackMsg])
  }

  // Handle quiz options selection
  const handleQuizAnswer = (messageId: string, optionIndex: number) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.quizData) return msg

        const currentScore = msg.quizData.score || 0
        const isCorrect = optionIndex === msg.quizData.correctIndex
        const newScore = isCorrect ? currentScore + 1 : currentScore

        return {
          ...msg,
          quizData: {
            ...msg.quizData,
            selectedIndex: optionIndex,
            score: newScore
          }
        }
      })
    )
  }

  // Handle loading next quiz question
  const handleNextQuizQuestion = (currentQuestion: string) => {
    // Find the last quiz question and check its current status
    const lastMsg = [...messages].reverse().find((m) => m.type === "quiz" && m.quizData)
    if (!lastMsg || !lastMsg.quizData) return

    const currentNum = lastMsg.quizData.currentQuestionNum || 1
    const totalQ = lastMsg.quizData.totalQuestions || 3
    const accumulatedScore = lastMsg.quizData.score || 0
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    if (currentNum < totalQ) {
      // Load next question
      const nextIndex = currentNum // index fits next item since 0-based index matches currentNum
      const nextQ = MOCK_QUIZZES.default[nextIndex]

      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const nextMsg: Message = {
          id: Math.random().toString(),
          sender: "ai",
          text: `Great progress! Let's tackle the next question (Question ${currentNum + 1}/${totalQ}):`,
          timestamp: time,
          type: "quiz",
          quizData: {
            question: nextQ.question,
            options: nextQ.options,
            correctIndex: nextQ.correctIndex,
            explanation: nextQ.explanation,
            currentQuestionNum: currentNum + 1,
            totalQuestions: totalQ,
            score: accumulatedScore
          }
        }
        setMessages((prev) => [...prev, nextMsg])
      }, 1000)
    } else {
      // Quiz finished summary
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        const summaryMsg: Message = {
          id: Math.random().toString(),
          sender: "ai",
          text: `### 🏆 Practice Quiz Complete!
          
You've completed the mini quiz on **${activeTopic?.topic_name || "Python lists & tuples"}**.
          
* **Final Score:** \`${accumulatedScore} / ${totalQ}\` (${Math.round((accumulatedScore / totalQ) * 100)}%)
* **XP Earned:** \`+25 XP\` ⚡
          
Great effort! Consistent self-testing is the fastest way to master these skills. What would you like to cover next?`,
          timestamp: time
        }
        setMessages((prev) => [...prev, summaryMsg])
      }, 1000)
    }
  }

  // Youtube dialog submission
  const submitYoutubeSummary = () => {
    if (!youtubeUrl.trim()) return
    setIsYoutubeDialogOpen(false)
    const url = youtubeUrl
    setYoutubeUrl("")
    handleSendMessage(`Summarize this video: ${url}`)
  }

  // Quick Action card helpers
  const handleCardClick = (cardType: "explain" | "youtube" | "roadmap" | "quiz") => {
    switch (cardType) {
      case "explain":
        handleSendMessage("Explain Python lists vs tuples in detail")
        break
      case "youtube":
        setIsYoutubeDialogOpen(true)
        break
      case "roadmap":
        handleSendMessage("Help from my roadmap - active topic")
        break
      case "quiz":
        handleSendMessage("Quiz me on my active topic")
        break
    }
  }

  // Reset chat
  const handleResetSession = () => {
    setMessages([])
  }

  return (
    <PageWrapper maxWidth="xl">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-gradient-to-tr from-violet-600/30 to-orange-600/30 flex items-center justify-center text-accent border border-violet-500/20 shadow-md">
            <MessageSquare className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] font-bold text-foreground">Mentor AI</h1>
              <span className="text-mono text-[8px] bg-accent/10 border border-accent/25 text-accent px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                BETA
              </span>
            </div>
            <p className="text-[11px] text-foreground-subtle">Your AI learning companion</p>
          </div>
        </div>

        {/* Top-Right Toggles / Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsRoadmapContextActive(!isRoadmapContextActive)}
            className={`flex items-center gap-2 h-9 px-3.5 rounded border transition-all text-[11px] font-medium ${
              isRoadmapContextActive
                ? "bg-surface-1 border-violet-500/30 text-foreground"
                : "bg-surface-1/40 border-border text-foreground-subtle"
            }`}
          >
            <BookOpen className={`w-3.5 h-3.5 ${isRoadmapContextActive ? "text-violet-400" : "text-foreground-subtle"}`} />
            Roadmap Context
            <span className={`w-1.5 h-1.5 rounded-full ${isRoadmapContextActive ? "bg-violet-400 animate-pulse" : "bg-foreground-subtle/50"}`} />
          </button>

          <button
            onClick={() => setIsQuizAccessActive(!isQuizAccessActive)}
            className={`flex items-center gap-2 h-9 px-3.5 rounded border transition-all text-[11px] font-medium ${
              isQuizAccessActive
                ? "bg-surface-1 border-orange-500/30 text-foreground"
                : "bg-surface-1/40 border-border text-foreground-subtle"
            }`}
          >
            <Target className={`w-3.5 h-3.5 ${isQuizAccessActive ? "text-orange-400" : "text-foreground-subtle"}`} />
            Quiz Access
            <span className={`w-1.5 h-1.5 rounded-full ${isQuizAccessActive ? "bg-orange-400 animate-pulse" : "bg-foreground-subtle/50"}`} />
          </button>

          {messages.length > 0 && (
            <button
              onClick={handleResetSession}
              className="flex items-center justify-center w-9 h-9 rounded border border-border bg-surface-1 text-foreground-muted hover:text-foreground transition-all hover:bg-surface-2"
              title="Reset Chat Session"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col min-h-[calc(100vh-210px)] relative justify-between">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            /* Starting Deck (Cards and Welcome) */
            <motion.div
              key="start-screen"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col justify-center pt-2 pb-24 md:pb-28 px-4"
            >
              {/* Giant Greeting Header */}
              <div className="text-center space-y-2 mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl text-foreground font-light tracking-tight leading-relaxed">
                  Hi there, <span className="font-semibold text-foreground">{userName}</span>
                </h2>
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-none bg-gradient-to-r from-violet-400 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent pb-1">
                  What would you like to learn today?
                </h1>
                <p className="text-[13px] text-foreground-subtle max-w-lg mx-auto font-medium">
                  Ask anything. Get clear explanations. Learn faster.
                </p>
              </div>

              {/* 4 Feature Deck Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto w-full px-2">
                {/* Card 1: Explain a concept */}
                <div
                  onClick={() => handleCardClick("explain")}
                  className="relative group rounded-xl p-[1px] bg-gradient-to-b from-violet-600/30 to-violet-950/20 hover:from-violet-500 hover:to-orange-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-violet-950/20"
                >
                  <div className="absolute inset-0 bg-violet-600/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 pointer-events-none" />
                  <div className="relative bg-[#0b0c13] rounded-[11px] p-5 h-full flex flex-col justify-between min-h-[140px] hover:bg-[#0c0e18] transition-colors border border-white/5">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4 border border-violet-500/20 group-hover:bg-violet-500/20 transition-all">
                        <GraduationCap className="w-4.5 h-4.5" />
                      </div>
                      <h3 className="text-[13px] font-bold text-foreground">Explain a concept</h3>
                      <p className="text-[11px] text-foreground-subtle mt-1.5 leading-relaxed">
                        Get simple explanations of any complex topic with clean formatting and code.
                      </p>
                    </div>
                    <div className="flex justify-end mt-4">
                      <ArrowRight className="w-3.5 h-3.5 text-foreground-subtle group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Card 2: Summarize Youtube */}
                <div
                  onClick={() => handleCardClick("youtube")}
                  className="relative group rounded-xl p-[1px] bg-gradient-to-b from-blue-600/30 to-blue-950/20 hover:from-blue-500 hover:to-violet-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-blue-950/20"
                >
                  <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 pointer-events-none" />
                  <div className="relative bg-[#0b0c13] rounded-[11px] p-5 h-full flex flex-col justify-between min-h-[140px] hover:bg-[#0c0e18] transition-colors border border-white/5">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/20 group-hover:bg-blue-500/20 transition-all">
                        <Youtube className="w-4.5 h-4.5" />
                      </div>
                      <h3 className="text-[13px] font-bold text-foreground">Summarize a YouTube link</h3>
                      <p className="text-[11px] text-foreground-subtle mt-1.5 leading-relaxed">
                        Paste any YouTube link and get a smart timeline, chapters, and summary.
                      </p>
                    </div>
                    <div className="flex justify-end mt-4">
                      <ArrowRight className="w-3.5 h-3.5 text-foreground-subtle group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Card 3: Help from my roadmap */}
                <div
                  onClick={() => handleCardClick("roadmap")}
                  className="relative group rounded-xl p-[1px] bg-gradient-to-b from-fuchsia-600/30 to-fuchsia-950/20 hover:from-fuchsia-500 hover:to-orange-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-fuchsia-950/20"
                >
                  <div className="absolute inset-0 bg-fuchsia-600/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 pointer-events-none" />
                  <div className="relative bg-[#0b0c13] rounded-[11px] p-5 h-full flex flex-col justify-between min-h-[140px] hover:bg-[#0c0e18] transition-colors border border-white/5">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400 mb-4 border border-fuchsia-500/20 group-hover:bg-fuchsia-500/20 transition-all">
                        <BookOpen className="w-4.5 h-4.5" />
                      </div>
                      <h3 className="text-[13px] font-bold text-foreground">Help from my roadmap</h3>
                      <p className="text-[11px] text-foreground-subtle mt-1.5 leading-relaxed">
                        Get target assistance on your current active roadmap topics instantly.
                      </p>
                    </div>
                    <div className="flex justify-end mt-4">
                      <ArrowRight className="w-3.5 h-3.5 text-foreground-subtle group-hover:text-fuchsia-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>

                {/* Card 4: Quiz me on a topic */}
                <div
                  onClick={() => handleCardClick("quiz")}
                  className="relative group rounded-xl p-[1px] bg-gradient-to-b from-orange-600/30 to-orange-950/20 hover:from-orange-500 hover:to-violet-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-orange-950/20"
                >
                  <div className="absolute inset-0 bg-orange-600/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 pointer-events-none" />
                  <div className="relative bg-[#0b0c13] rounded-[11px] p-5 h-full flex flex-col justify-between min-h-[140px] hover:bg-[#0c0e18] transition-colors border border-white/5">
                    <div>
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 mb-4 border border-orange-500/20 group-hover:bg-orange-500/20 transition-all">
                        <Target className="w-4.5 h-4.5" />
                      </div>
                      <h3 className="text-[13px] font-bold text-foreground">Quiz me on a topic</h3>
                      <p className="text-[11px] text-foreground-subtle mt-1.5 leading-relaxed">
                        Take an interactive mini multiple choice quiz in chat to test your learning.
                      </p>
                    </div>
                    <div className="flex justify-end mt-4">
                      <ArrowRight className="w-3.5 h-3.5 text-foreground-subtle group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Suggestions Tag Chips (placed directly below cards inside the start-screen layout) */}
              <div className="flex flex-col items-center gap-3.5 mt-8 md:mt-10">
                <span className="text-mono text-[9px] text-foreground-subtle uppercase font-bold tracking-wider">
                  Try asking about:
                </span>
                <div className="flex items-center gap-2 flex-wrap justify-center max-w-2xl px-2">
                  <button
                    onClick={() => handleSendMessage("Explain Python lists vs tuples")}
                    className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-surface-1 border border-border/80 text-[11px] text-foreground-muted hover:text-foreground hover:border-violet-500/40 transition-all font-medium"
                  >
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    Explain Python lists vs tuples
                  </button>

                  <button
                    onClick={() => {
                      setYoutubeUrl("https://youtu.be/abc123")
                      setIsYoutubeDialogOpen(true)
                    }}
                    className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-surface-1 border border-border/80 text-[11px] text-foreground-muted hover:text-foreground hover:border-blue-500/40 transition-all font-medium"
                  >
                    <Youtube className="w-3 h-3 text-red-500" />
                    Summarize this video: https://youtu.be/abc123
                  </button>

                  <button
                    onClick={() => handleSendMessage("What should I learn next in my roadmap?")}
                    className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-surface-1 border border-border/80 text-[11px] text-foreground-muted hover:text-foreground hover:border-fuchsia-500/40 transition-all font-medium"
                  >
                    <BookOpen className="w-3 h-3 text-fuchsia-400" />
                    What should I learn next in my roadmap?
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Active Message Thread Screen */
            <motion.div
              key="chat-thread"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 space-y-6 max-w-4xl mx-auto w-full px-2 py-4 mb-20 overflow-y-auto"
            >
              {messages.map((message) => {
                const isAI = message.sender === "ai"

                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isAI ? "items-start" : "items-end"} space-y-1.5`}
                  >
                    {/* Username or AI Indicator */}
                    <div className="flex items-center gap-1.5 text-mono text-[9px] text-foreground-subtle px-1">
                      {isAI ? (
                        <>
                          <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                          <span>MENTOR AI</span>
                        </>
                      ) : (
                        <span>YOU</span>
                      )}
                      <span>·</span>
                      <span>{message.timestamp}</span>
                    </div>

                    {/* Chat Bubble Container */}
                    <div className="max-w-[85%] w-full flex flex-col">
                      {/* Standard text response */}
                      {(!message.type || message.type === "text") && (
                        <div
                          className={`rounded-lg p-4 border text-[13px] leading-relaxed whitespace-pre-line ${
                            isAI
                              ? "bg-surface-1 border-border/80 text-foreground-muted shadow-sm"
                              : "bg-[#0b0c13]/80 border-violet-500/20 text-foreground ml-auto max-w-fit"
                          }`}
                        >
                          {/* Parse simple inline code markdown styles */}
                          {message.text.split("\n").map((line, idx) => {
                            // Check table patterns
                            if (line.trim().startsWith("|")) {
                              return (
                                <div key={idx} className="font-mono text-[11px] bg-background/40 px-2 py-0.5 border-b border-border/20 text-foreground-subtle overflow-x-auto whitespace-pre">
                                  {line}
                                </div>
                              )
                            }
                            
                            // Check header patterns
                            if (line.startsWith("###")) {
                              return <h3 key={idx} className="text-[14px] font-bold text-foreground mt-3 mb-1.5">{line.replace("###", "").trim()}</h3>
                            }
                            if (line.startsWith("####")) {
                              return <h4 key={idx} className="text-[12.5px] font-bold text-foreground mt-3 mb-1.5">{line.replace("####", "").trim()}</h4>
                            }
                            if (line.startsWith("##")) {
                              return <h2 key={idx} className="text-[15px] font-bold text-foreground mt-4 mb-2">{line.replace("##", "").trim()}</h2>
                            }
                            
                            // Check lists
                            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                              return (
                                <div key={idx} className="pl-4 flex items-start gap-2 my-1">
                                  <div className="w-1 h-1 rounded-full bg-accent mt-2 flex-shrink-0" />
                                  <span>{line.substring(2)}</span>
                                </div>
                              )
                            }

                            // Check blockquotes or warnings
                            if (line.startsWith(">")) {
                              return (
                                <blockquote key={idx} className="border-l-2 border-accent/40 bg-accent/5 p-2 rounded text-foreground-subtle pl-4 my-2 text-[12px] italic">
                                  {line.replace(">", "").trim()}
                                </blockquote>
                              )
                            }

                            // Check code block wrappers
                            if (line.startsWith("```")) {
                              return null // hide raw ticks
                            }

                            // Render general line
                            return <p key={idx} className="mb-2 leading-relaxed">{line}</p>
                          })}
                        </div>
                      )}

                      {/* YouTube summary custom UI */}
                      {message.type === "youtube_summary" && message.ytMetadata && (
                        <div className="surface-card border border-blue-500/20 rounded-lg p-5 w-full space-y-4 shadow-lg shadow-blue-950/5">
                          {/* Banner Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                                <Youtube className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <h3 className="text-[13px] font-bold text-foreground">{message.ytMetadata.title}</h3>
                                <p className="text-mono text-[9px] text-foreground-subtle mt-0.5">
                                  {message.ytMetadata.channel} · {message.ytMetadata.duration}
                                </p>
                              </div>
                            </div>
                            <span className="text-mono text-[8px] bg-blue-500/15 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider h-fit sm:self-center">
                              VIDEO SUMMARY
                            </span>
                          </div>

                          {/* Chapters Timeline */}
                          <div>
                            <h4 className="text-[11.5px] font-bold text-foreground mb-3 uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                              <Compass className="w-3.5 h-3.5" />
                              Video Chapters
                            </h4>
                            <div className="space-y-3 relative pl-3 border-l border-border/80">
                              {message.ytMetadata.chapters.map((chap, idx) => (
                                <div key={idx} className="relative">
                                  {/* Bullet indicator */}
                                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-blue-500/60 border border-[#0b0c13]" />
                                  <div className="text-[12px]">
                                    <span className="font-bold text-blue-400 text-mono mr-1.5">{chap.time}</span>
                                    <span className="font-semibold text-foreground">{chap.title}</span>
                                    <p className="text-[11px] text-foreground-subtle mt-0.5 leading-relaxed">{chap.desc}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Takeaways */}
                          <div className="pt-2 border-t border-border/40">
                            <h4 className="text-[11.5px] font-bold text-foreground mb-2.5 uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                              <Sparkles className="w-3.5 h-3.5" />
                              Key Concepts Learned
                            </h4>
                            <ul className="space-y-1.5">
                              {message.ytMetadata.takeaways.map((take, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-[12px] text-foreground-muted leading-relaxed">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60 mt-1.5 flex-shrink-0" />
                                  <span>{take}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Quiz custom UI */}
                      {message.type === "quiz" && message.quizData && (
                        <div className="surface-card border border-orange-500/20 rounded-lg p-5 w-full space-y-4 shadow-lg shadow-orange-950/5">
                          {/* Heading */}
                          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                                <Target className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <h3 className="text-[13px] font-bold text-foreground">Interactive Practice Quiz</h3>
                                <p className="text-mono text-[9px] text-foreground-subtle">
                                  Question {message.quizData.currentQuestionNum} of {message.quizData.totalQuestions}
                                </p>
                              </div>
                            </div>
                            <span className="text-mono text-[8px] bg-orange-500/15 border border-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              QUIZ ACCESS
                            </span>
                          </div>

                          {/* Question text */}
                          <p className="text-[13px] font-semibold text-foreground leading-relaxed">
                            {message.quizData.question}
                          </p>

                          {/* Options buttons */}
                          <div className="space-y-2.5">
                            {message.quizData.options.map((opt, optIdx) => {
                              const isSelected = message.quizData?.selectedIndex === optIdx
                              const isCorrect = optIdx === message.quizData?.correctIndex
                              const hasSelected = message.quizData?.selectedIndex !== undefined

                              let btnClass = "w-full text-left p-3 rounded-lg text-[12px] border transition-all duration-200 flex justify-between items-center "

                              if (!hasSelected) {
                                btnClass += "bg-[#0b0c13]/60 border-border/60 hover:bg-[#0c0e18] hover:border-orange-500/50 text-foreground-muted hover:text-foreground hover:translate-x-0.5"
                              } else {
                                if (isCorrect) {
                                  btnClass += "bg-success/10 border-success/40 text-success font-medium"
                                } else if (isSelected) {
                                  btnClass += "bg-[#0b0c13]/30 border-border/20 text-foreground-subtle cursor-not-allowed"
                                } else {
                                  btnClass += "bg-[#0b0c13]/30 border-border/20 text-foreground-subtle cursor-not-allowed"
                                }
                              }

                              return (
                                <button
                                  key={optIdx}
                                  disabled={hasSelected}
                                  onClick={() => handleQuizAnswer(message.id, optIdx)}
                                  className={btnClass}
                                >
                                  <span>{opt}</span>
                                  {hasSelected && isCorrect && (
                                    <span className="text-mono text-[9px] bg-success/20 text-success px-1.5 py-0.5 rounded font-bold">
                                      CORRECT
                                    </span>
                                  )}
                                  {hasSelected && isSelected && !isCorrect && (
                                    <span className="text-mono text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded font-bold">
                                      INCORRECT
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>

                          {/* Explanation block */}
                          {message.quizData.selectedIndex !== undefined && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-4 p-4 rounded-lg bg-surface-2/40 border border-border/50 text-[12px] text-foreground-muted space-y-3 leading-relaxed"
                            >
                              <div>
                                <span className="font-bold text-foreground block mb-1">
                                  {message.quizData.selectedIndex === message.quizData.correctIndex
                                    ? "🎉 Well done! That is correct."
                                    : "❌ Let's review the concept:"}
                                </span>
                                {message.quizData.explanation}
                              </div>
                              <button
                                onClick={() => handleNextQuizQuestion(message.quizData?.question || "")}
                                className="w-full bg-gradient-to-r from-violet-600 to-orange-600 hover:from-violet-500 hover:to-orange-500 text-white font-bold text-[11px] py-2 rounded-md transition-all shadow-md flex items-center justify-center gap-1.5 uppercase"
                              >
                                {message.quizData.currentQuestionNum === message.quizData.totalQuestions
                                  ? "Finish Quiz"
                                  : "Next Question"}
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* Roadmap help custom UI */}
                      {message.type === "roadmap_help" && message.roadmapHelpData && (
                        <div className="surface-card border border-fuchsia-500/20 rounded-lg p-5 w-full space-y-4 shadow-lg shadow-fuchsia-950/5">
                          {/* Heading */}
                          <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                                <BookOpen className="w-4.5 h-4.5" />
                              </div>
                              <div>
                                <h3 className="text-[13px] font-bold text-foreground">Roadmap Active Context</h3>
                                <p className="text-mono text-[9px] text-foreground-subtle">
                                  Topic: {message.roadmapHelpData.topicName}
                                </p>
                              </div>
                            </div>
                            <span className="text-mono text-[8px] bg-fuchsia-500/15 border border-fuchsia-500/20 text-fuchsia-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                              ROADMAP TRACKER
                            </span>
                          </div>

                          <p className="text-[12.5px] text-foreground-muted leading-relaxed">
                            Here is the syllabus breakdown for your current topic. Click on any section below to generate a deep-dive walkthrough:
                          </p>

                          {/* Subtopic list */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {message.roadmapHelpData.subtopics.map((sub, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSendMessage(`Explain this subtopic: ${sub}`)}
                                className="text-left p-3 rounded-lg border border-border/60 bg-[#0b0c13]/60 hover:bg-[#0c0e18] hover:border-fuchsia-500/40 text-[12px] text-foreground-muted hover:text-foreground transition-all duration-200 flex justify-between items-center group/sub"
                              >
                                <span className="font-medium truncate mr-2">{sub}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-foreground-subtle group-hover/sub:text-fuchsia-400 group-hover/sub:translate-x-0.5 transition-all" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* simulated typing loader */}
              {isTyping && (
                <div className="flex flex-col items-start space-y-1.5">
                  <div className="flex items-center gap-1.5 text-mono text-[9px] text-foreground-subtle px-1">
                    <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                    <span>MENTOR AI IS WRITING...</span>
                  </div>
                  <div className="bg-surface-1 border border-border/80 text-foreground-muted rounded-lg p-4 max-w-[200px] flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Panel (Fixed at the bottom of the viewport) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent z-10 lg:pl-20">
          <div className="max-w-4xl mx-auto space-y-3.5">
            {/* Input Wrapper with glowing gradient border */}
            <div className="relative group rounded-xl p-[1.5px] bg-gradient-to-r from-violet-500 via-purple-500 to-orange-500 shadow-xl shadow-violet-950/5">
              {/* Backglow element */}
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 via-purple-500 to-orange-500 opacity-20 blur-md pointer-events-none" />

              <div className="relative bg-[#090a10] rounded-[11.5px] p-3 space-y-2 border border-white/5">
                {/* Textarea */}
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(inputText)
                    }
                  }}
                  placeholder="Ask me anything..."
                  rows={2}
                  className="w-full bg-transparent text-[13px] text-foreground placeholder:text-foreground-subtle focus:outline-none resize-none px-1 py-1"
                />

                {/* Toolbar controls */}
                <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    {/* Attach File Button */}
                    <button className="flex items-center gap-1.5 h-7 px-3.5 rounded-full bg-[#111322] hover:bg-[#161a32] text-foreground-muted hover:text-foreground text-[10.5px] font-semibold border border-white/5 transition-all">
                      <Paperclip className="w-3 h-3 text-foreground-subtle" />
                      Attach File
                    </button>

                    {/* Add Youtube Link Button */}
                    <button
                      onClick={() => setIsYoutubeDialogOpen(true)}
                      className="flex items-center gap-1.5 h-7 px-3.5 rounded-full bg-[#111322] hover:bg-[#161a32] text-foreground-muted hover:text-foreground text-[10.5px] font-semibold border border-white/5 transition-all"
                    >
                      <Youtube className="w-3 h-3 text-red-500" />
                      Add YouTube Link
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Custom Model Picker Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="flex items-center gap-1.5 bg-[#111322] hover:bg-[#161a32] border border-white/5 rounded-full h-7 px-3 text-[10.5px] text-foreground-muted hover:text-foreground font-semibold transition-all select-none"
                      >
                        <span className="text-foreground-subtle font-normal">AI Model</span>
                        <span className="text-foreground font-bold">
                          {MODELS.find(m => m.id === aiModel)?.name || "Auto"} {MODELS.find(m => m.id === aiModel)?.version || ""}
                        </span>
                        <ChevronDown className={`w-3 h-3 text-foreground-subtle transition-transform duration-200 ${isModelDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isModelDropdownOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setIsModelDropdownOpen(false)}
                          />
                          <div className="absolute bottom-full right-0 mb-2 z-50 w-44 bg-[#141416] border border-white/10 rounded-lg p-1 shadow-lg backdrop-blur-md">
                            {MODELS.map((model) => {
                              const isSelected = aiModel === model.id
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    setAiModel(model.id)
                                    setIsModelDropdownOpen(false)
                                  }}
                                  className={`w-full flex items-center justify-between text-left px-2.5 py-1.5 rounded-md transition-all text-[11px] ${
                                    isSelected
                                      ? "bg-white/10 text-white font-medium"
                                      : "hover:bg-white/5 text-foreground-subtle hover:text-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-white">{model.name}</span>
                                    <span className="text-[10px] text-foreground-subtle">{model.version}</span>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-white" />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Send Button */}
                    <button
                      onClick={() => handleSendMessage(inputText)}
                      disabled={!inputText.trim()}
                      className="w-7 h-7 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 hover:from-violet-500 hover:to-orange-400 text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:from-violet-600 disabled:hover:to-orange-500 shadow-md"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning Text */}
            <p className="text-center text-[9.5px] text-foreground-subtle/80">
              Mentor AI can make mistakes. Verify important information.
            </p>

          </div>
        </div>
      </div>

      {/* Floating Dialog: Add YouTube Link */}
      <AnimatePresence>
        {isYoutubeDialogOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md p-[1.5px] rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-orange-500 overflow-hidden shadow-2xl"
            >
              <div className="relative bg-[#090a10] rounded-[11px] p-6 space-y-4 border border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                    <Youtube className="w-4 h-4" />
                  </div>
                  <h3 className="text-[14px] font-bold text-foreground">Add YouTube Video Link</h3>
                </div>
                <p className="text-[11.5px] text-foreground-muted leading-relaxed">
                  Paste a YouTube link below. Mentor AI will parse the transcript and generate structured chapters, key concepts, and code exercises directly inside the chat.
                </p>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#111322] border border-border/80 rounded-lg h-10 px-3 text-[12.5px] text-foreground focus:outline-none focus:border-violet-500/50 placeholder:text-foreground-subtle"
                  autoFocus
                />
                <div className="flex gap-2.5 justify-end pt-2">
                  <button
                    onClick={() => setIsYoutubeDialogOpen(false)}
                    className="h-8.5 px-4 rounded-md border border-border/80 text-[11px] text-foreground-muted hover:text-foreground hover:bg-surface-2 transition-all font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitYoutubeSummary}
                    className="h-8.5 px-4 rounded-md bg-gradient-to-r from-violet-600 to-orange-500 hover:from-violet-500 hover:to-orange-400 text-white font-bold text-[11px] transition-all shadow-md"
                  >
                    Summarize Video
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageWrapper>
  )
}
