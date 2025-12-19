import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';

/**
 * Mistral AI finish reason enum
 */
export enum MISTRAL_AI_FINISH_REASON {
  STOP = 'stop',
  LENGTH = 'length',
  MODEL_LENGTH = 'model_length',
  TOOL_CALLS = 'tool_calls',
  ERROR = 'error',
}

/**
 * Mistral AI chat completion response interface
 */
export interface MistralAIChatCompleteResponse
  extends ChatCompletionResponseBody {
  system_fingerprint?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Mistral AI error response interface
 */
export interface MistralAIErrorResponse extends ErrorResponseBody {
  error: {
    message: string;
    type?: string;
    code?: string;
  };
}

/**
 * Mistral AI stream chunk interface for streaming responses
 */
export interface MistralAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint?: string;
  choices: {
    delta: {
      role?: string;
      content?: string;
      tool_calls?: object[];
    };
    index: number;
    finish_reason: string | null;
  }[];
}

/**
 * Mistral AI embedding response interface
 */
export interface MistralAIEmbedResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
