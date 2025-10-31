import { googleErrorResponseTransform } from '@server/ai-providers/google/chat-complete';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  CompletionFinishReason,
  CompletionRequestBody,
  CompletionResponseBody,
} from '@shared/types/api/routes/completions-api';
import { AIProvider } from '@shared/types/constants';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const palmCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'model/text-bison-001',
  },
  prompt: {
    param: 'prompt',
    default: '',
    transform: (raRequestBody: CompletionRequestBody) => {
      const { prompt: text } = raRequestBody;
      const prompt = {
        text,
      };
      return prompt;
    },
  },
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'topP',
    default: 1,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'topK',
    default: 1,
    min: 0,
    max: 1,
  },
  n: {
    param: 'candidateCount',
    default: 1,
    min: 1,
    max: 8,
  },
  max_tokens: {
    param: 'maxOutputTokens',
    default: 100,
    min: 1,
  },
  stop: {
    param: 'stopSequences',
  },
};

export const palmCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = googleErrorResponseTransform(
      aiProviderResponseBody,
      AIProvider.PALM,
    );
    if (errorResponse) return errorResponse;
  }

  if ('candidates' in aiProviderResponseBody) {
    const candidates = aiProviderResponseBody.candidates as {
      output: string;
    }[];

    const responseBody: CompletionResponseBody = {
      id: Date.now().toString(),
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: 'Unknown',
      choices:
        candidates.map((generation: { output: string }, index: number) => ({
          text: generation.output,
          index: index,
          logprobs: {
            top_logprobs: [],
            tokens: [],
            token_logprobs: [],
            text_offset: [],
          },
          finish_reason: 'length' as CompletionFinishReason,
        })) ?? [],
    };
    return responseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.PALM,
  );
};
