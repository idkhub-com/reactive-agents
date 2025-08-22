import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';

interface PredibaseChatCompleteResponse extends ChatCompletionResponseBody {
  id: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface PredibaseChatChoice {
  message: {
    role: string;
    content: string;
  };
  delta: {
    role: string;
    content: string;
  };
  index: number;
  finish_reason: string | null;
}

export interface PredibaseChatCompletionStreamChunk {
  id: string;
  model: string;
  object: string;
  created: number;
  error: string;
  error_type: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: PredibaseChatChoice[];
}

export interface PredibaseErrorResponse extends ErrorResponseBody {}

// -----------------------Predibase Response Transforms-----------------------
export type PredibaseChatCompleteResponseTransformFunction = (
  response: PredibaseChatCompleteResponse | PredibaseErrorResponse,
  status: number,
) => ChatCompletionResponseBody | ErrorResponseBody;

export type PredibaseChatCompleteStreamChunkTransformFunction = (
  response: string,
) => string;

export type PredibaseResponseTransformFunctions =
  | PredibaseChatCompleteResponseTransformFunction
  | PredibaseChatCompleteStreamChunkTransformFunction;
