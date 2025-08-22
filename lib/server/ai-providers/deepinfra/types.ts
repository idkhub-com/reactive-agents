import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';

export interface DeepInfraChatCompleteResponse
  extends ChatCompletionResponseBody {
  id: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepInfraErrorResponse {
  detail: {
    loc: string[];
    msg: string;
    type: string;
  }[];
}
