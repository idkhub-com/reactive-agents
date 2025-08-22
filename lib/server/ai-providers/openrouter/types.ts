import type {
  ChatCompletionChoice,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';

interface OpenrouterUsageDetails {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_tokens_details?: {
    cached_tokens: number;
    audio_tokens: number;
  };
  completion_tokens_details?: {
    reasoning_tokens: number;
    audio_tokens: number;
    accepted_prediction_tokens: number;
    rejected_prediction_tokens: number;
  };
  cost?: number;
}

export interface OpenrouterChatCompleteResponse
  extends ChatCompletionResponseBody {
  id: string;
  created: number;
  model: string;
  choices: (ChatCompletionChoice & {
    message: Message & { reasoning: string };
  })[];
  usage: OpenrouterUsageDetails;
}

export interface OpenrouterErrorResponse {
  object: string;
  message: string;
  type: string;
  param: string | null;
  code: string;
}

export interface OpenrouterStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  usage?: OpenrouterUsageDetails;
  choices: {
    delta: {
      role?: string | null;
      content?: string;
      reasoning?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
}
