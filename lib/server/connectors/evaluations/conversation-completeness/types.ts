export interface ConversationCompletenessResult {
  score: number;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationCompletenessAverageResult {
  average_score: number;
  total_logs: number;
  passed_count: number;
  failed_count: number;
  threshold_used: number;
  evaluation_run_id: string;
}
