import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';

export interface GroqChatCompleteResponse extends ChatCompletionResponseBody {}

export interface GroqErrorResponse extends ErrorResponseBody {}

export interface GroqStreamChunkUsage {
  queue_time: number;
  prompt_tokens: number;
  prompt_time: number;
  completion_tokens: number;
  completion_time: number;
  total_tokens: number;
  total_time: number;
}

export interface GroqStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    delta: {
      content?: string;
      tool_calls?: object[];
    };
    index: number;
    finish_reason: string | null;
    logprobs: object | null;
  }[];
  x_groq: {
    usage: GroqStreamChunkUsage;
  };
  usage: GroqStreamChunkUsage;
}
