/**
 * Quiz API — Tracks AI
 * =====================
 * All quiz-related fetch calls live here. Every call that hits a protected
 * endpoint sends the stored JWT Bearer token. The backend derives the real
 * user identity from that token — we never send a userId in the body.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type QuizStatus =
  | "NOT_AVAILABLE"
  | "GENERATING"
  | "READY"
  | "IN_PROGRESS"
  | "VERIFIED"
  | "NEEDS_REVISION"
  | "CHALLENGE_AVAILABLE"
  | "FAILED"

export interface AvailableQuiz {
  topic_id: string
  topic_name: string
  quiz_status: QuizStatus
  xp_reward: number
  user_score: number | null
  attempt_count: number
}

export interface QuizOption {
  key: string
  text: string
}

export interface QuizQuestion {
  id: string
  question: string
  options: QuizOption[]
}

export interface StartResponse {
  attempt_id: string
  topic_id: string
  topic_name: string
  questions: QuizQuestion[]
  total_questions: number
  is_challenge: boolean
}

export interface AnswerItem {
  question_id: string
  selected_key: string
}

export interface QuizResult {
  question_id: string
  question: string
  selected_key: string
  correct_key: string
  is_correct: boolean
  explanation: string
}

export interface SubmitResponse {
  success: boolean
  score: number
  correct_count: number
  total_questions: number
  passed: boolean
  quiz_status: QuizStatus
  challenge_unlocked: boolean
  xp_earned: number
  results: QuizResult[]
}

export interface QuizStatusResponse {
  topic_id: string
  topic_name: string
  quiz_status: QuizStatus
  questions_count: number
  is_ready: boolean
}

// ─── API calls ───────────────────────────────────────────────────────────────

/**
 * Trigger background quiz generation for a just-completed topic.
 * Fire-and-forget — backend is idempotent; safe to call multiple times.
 */
export async function triggerQuizGeneration(
  topicId: string,
  topicName: string,
  skill: string = "General"
): Promise<void> {
  await fetch(`${API_BASE}/quiz/trigger`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ topic_id: topicId, topic_name: topicName, skill }),
  })
}

/** Poll quiz readiness for a single topic. */
export async function getQuizStatus(
  topicId: string
): Promise<QuizStatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/quiz/status/${encodeURIComponent(topicId)}`, {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/** List all quizzes available to the authenticated user. */
export async function getAvailableQuizzes(): Promise<AvailableQuiz[]> {
  try {
    const res = await fetch(`${API_BASE}/quiz/available`, {
      headers: authHeaders(),
      cache: "no-store",
    })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

/** Start a new quiz attempt — returns 10 unseen questions. */
export async function startQuiz(topicId: string): Promise<StartResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/quiz/start`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ topic_id: topicId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.detail ?? "Failed to start quiz")
    }
    return await res.json()
  } catch (e) {
    console.error("[quiz-api] startQuiz:", e)
    return null
  }
}

/** Submit answers and receive scored results. */
export async function submitQuiz(
  attemptId: string,
  topicId: string,
  answers: AnswerItem[],
  isChallenge = false
): Promise<SubmitResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/quiz/submit`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        attempt_id: attemptId,
        topic_id: topicId,
        answers,
        is_challenge: isChallenge,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.detail ?? "Failed to submit quiz")
    }
    return await res.json()
  } catch (e) {
    console.error("[quiz-api] submitQuiz:", e)
    return null
  }
}

/** Start a Challenge Mode attempt (requires ≥ 90 % score). */
export async function startChallenge(topicId: string): Promise<StartResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/quiz/challenge/start`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ topic_id: topicId }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.detail ?? "Challenge mode unavailable")
    }
    return await res.json()
  } catch (e) {
    console.error("[quiz-api] startChallenge:", e)
    return null
  }
}

/** Fetch attempt history for a topic. */
export async function getQuizHistory(topicId: string): Promise<{
  attempt_count: number
  quiz_status: QuizStatus
  latest_score: number | null
  xp_earned: number
  history: unknown[]
} | null> {
  try {
    const res = await fetch(
      `${API_BASE}/quiz/history/${encodeURIComponent(topicId)}`,
      { headers: authHeaders(), cache: "no-store" }
    )
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
