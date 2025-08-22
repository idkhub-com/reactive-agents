import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';

export interface AnyscaleChatCompleteResponse
  extends ChatCompletionResponseBody {}

export interface AnyscaleEmbedResponse extends CreateEmbeddingsResponseBody {}

export interface AnyscaleErrorResponse extends ErrorResponseBody {}

export interface AnyscaleValidationErrorResponse {
  detail: {
    loc: unknown[];
    msg: string;
    type: string;
  }[];
}

export interface AnyscaleStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    delta: {
      content?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
}

export interface AnyscaleCompleteResponse extends CompletionResponseBody {}
export interface AnyscaleCompleteStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    text: string;
    index: number;
    logprobs: Record<string, unknown>;
    finish_reason: string | null;
  }[];
}
