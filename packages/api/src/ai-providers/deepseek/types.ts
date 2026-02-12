import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';

export interface DeepSeekChatCompleteResponse
  extends ChatCompletionResponseBody {
  id: string;
  created: number;
  model: 'deepseek-chat' | 'deepseek-coder';
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepSeekErrorResponse {
  object: string;
  message: string;
  type: string;
  param: string | null;
  code: string;
}

export interface DeepSeekStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    delta: {
      role?: string | null;
      content?: string;
      tool_calls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    index: number;
    finish_reason: string | null;
  }[];
}
