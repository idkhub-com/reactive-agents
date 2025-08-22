export interface ConversationCompletenessEvaluationParameters {
  threshold?: number;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  timeout?: number;
  include_reason?: boolean;
  strict_mode?: boolean;
  async_mode?: boolean;
  verbose_mode?: boolean;
  batch_size?: number;
  limit?: number;
  offset?: number;
  agent_id?: string;
  dataset_id?: string;
}

export interface ConversationCompletenessResult {
  score: number;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationCompletenessAverageResult {
  average_score: number;
  total_data_points: number;
  passed_count: number;
  failed_count: number;
  threshold_used: number;
  evaluation_run_id: string;
}
