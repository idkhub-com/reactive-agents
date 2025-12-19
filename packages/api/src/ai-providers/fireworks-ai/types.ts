import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import type { CreateEmbeddingsResponseBody } from '@shared/types/api/routes/embeddings-api';

export interface FireworksAIChatCompleteResponse
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

export interface FireworksAIValidationErrorResponse {
  fault: {
    faultstring: string;
    detail: {
      errorcode: string;
    };
  };
}

export interface FireworksAIErrorResponse extends ErrorResponseBody {}

export interface FireworksAICompleteResponse extends CompletionResponseBody {
  id: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface FireworksAIEmbedResponse
  extends CreateEmbeddingsResponseBody {}

export interface FireworksAIImageObject {
  base64: string; // The base64-encoded JSON of the generated image, if response_format is b64_json.
  finishReason: string;
  seed: number;
  Id: string;
  'X-Fireworks-Billing-Idempotency-Id': string;
}

export interface FireworksFile {
  createTime: string;
  displayName: string;
  exampleCount: number;
  format: 'UNSPECIFIED_FORMAT' | 'CHAT' | 'COMPLETION';
  name: string;
  state: 'UPLOADING' | 'READY' | 'UNSPECIFIED';
  status: {
    code:
      | 'OK'
      | 'CANCELLED'
      | 'UNKNOWN'
      | 'INVALID_ARGUMENT'
      | 'DEADLINE_EXCEEDED'
      | 'NOT_FOUND'
      | 'ALREADY_EXISTS'
      | 'PERMISSION_DENIED'
      | 'UNAUTHENTICATED'
      | 'RESOURCE_EXHAUSTED'
      | 'FAILED_PRECONDITION'
      | 'ABORTED'
      | 'OUT_OF_RANGE'
      | 'UNIMPLEMENTED'
      | 'INTERNAL'
      | 'UNAVAILABLE'
      | 'DATA_LOSS';
    message: string;
  };
  userUploaded: Record<string, unknown>;
}
