export interface ReplicatePredictionResponse {
  id: string;
  version: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: Record<string, unknown>;
  output?: string | string[] | { text?: string };
  created_at: string;
  started_at?: string;
  completed_at?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ReplicateChatCompleteResponse
  extends ReplicatePredictionResponse {}

export interface ReplicateErrorResponse {
  detail: string;
  title?: string;
  type?: string;
  status?: number;
}
