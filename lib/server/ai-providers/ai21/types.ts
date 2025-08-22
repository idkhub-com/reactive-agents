import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import type {
  CreateEmbeddingsRequestBody,
  CreateEmbeddingsResponseBody,
} from '@shared/types/api/routes/embeddings-api';

export interface AI21CompleteResponse extends CompletionResponseBody {
  id: string;
  prompt: {
    text: string;
    tokens: Record<string, unknown>[];
  };
  completions: [
    {
      data: {
        text: string;
        tokens: Record<string, unknown>[];
      };
      finishReason: {
        reason: string;
        length: number;
      };
    },
  ];
}

export interface AI21ChatCompleteResponse extends ChatCompletionResponseBody {
  id: string;
  outputs: {
    text: string;
    role: string;
    finishReason: {
      reason: string;
      length: number | null;
      sequence: string | null;
    };
  }[];
}

export interface AI21EmbedResponse extends CreateEmbeddingsResponseBody {
  id: string;
  results: {
    embedding: number[];
  }[];
}

export interface AI21ErrorResponse extends ErrorResponseBody {
  detail: string;
}

// -----------------------AI21 Parameter Transforms-----------------------

export type AI21InputParameterTransformFunction = (
  params: CreateEmbeddingsRequestBody,
) => string;

export type AI21TypeParameterTransformFunction = (
  params: CreateEmbeddingsRequestBody,
) => string;

export type AI21ParameterTransformFunctions =
  | AI21InputParameterTransformFunction
  | AI21TypeParameterTransformFunction;
