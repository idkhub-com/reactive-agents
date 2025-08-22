import type {
  GoogleErrorResponse,
  PalmEmbedResponse,
} from '@server/ai-providers/google/types';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type {
  CompletionRequestBody,
  CompletionResponseBody,
} from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';

export interface PalmMessage {
  content?: string;
  author?: string;
  citation_metadata?: unknown;
}

export interface PalmChatCompleteResponse {
  candidates: PalmMessage[];
  messages: PalmMessage[];
  filters: unknown[];
  error?: PalmError;
}

export interface PalmTextOutput {
  output: string;
  safetyRatings: unknown[];
}

export interface PalmFilter {
  reason: 'OTHER';
}

export interface PalmError {
  code: number;
  message: string;
  status: string;
}

export interface PalmCompleteResponse {
  candidates: PalmTextOutput[];
  filters: PalmFilter[];
  error?: PalmError;
}

// -----------------------Vertex Response Transforms-----------------------

export type PalmCompleteResponseTransformFunction = (
  response: PalmCompleteResponse | GoogleErrorResponse,
  status: number,
) => CompletionResponseBody | ErrorResponseBody;

export type PalmChatCompleteResponseTransformFunction = (
  response: PalmChatCompleteResponse | GoogleErrorResponse,
  status: number,
) => ChatCompletionResponseBody | ErrorResponseBody;

export type PalmEmbedResponseTransformFunction = (
  response: PalmEmbedResponse | GoogleErrorResponse,
  status: number,
  responseHeaders: Headers,
  strictOpenAiCompliance: boolean,
  gatewayRequestUrl: string,
  gatewayRequest: CompletionRequestBody,
) => CreateEmbeddingsResponseBody | ErrorResponseBody;

export type PalmResponseTransformFunctions =
  | PalmCompleteResponseTransformFunction
  | PalmChatCompleteResponseTransformFunction
  | PalmEmbedResponseTransformFunction;
