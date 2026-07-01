export interface TrendPoint {
  date: string
  average_score: number
  attempts: number
}

export interface WeakTopic {
  topic_id: string
  topic_name: string
  latest_score: number
  average_score: number
  attempt_count: number
  quiz_status: string
}

export interface RevisionTopic {
  topic_id: string
  topic_name: string
  priority: "High" | "Medium" | "Low"
  latest_score: number
  attempt_count: number
}

export interface QuizAnalyticsResponse {
  total_quizzes_taken: number
  total_attempts: number
  overall_average_score: number
  overall_pass_rate: number
  verification_rate: number
  score_trend: TrendPoint[]
  weak_topics: WeakTopic[]
  revision_queue: RevisionTopic[]
}
