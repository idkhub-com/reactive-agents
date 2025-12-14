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
