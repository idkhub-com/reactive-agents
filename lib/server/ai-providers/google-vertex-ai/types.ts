import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';

export interface VertexLLamaChatCompleteResponse
  extends Omit<ChatCompletionResponseBody, 'id' | 'created'> {}

export interface VertexLlamaChatCompleteStreamChunk {
  choices: {
    delta: {
      content: string;
      role: string;
    };
    finish_reason?: string;
    index: 0;
  }[];
  model: string;
  object: string;
  usage?: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
  id?: string;
  created?: number;
  provider?: string;
}
