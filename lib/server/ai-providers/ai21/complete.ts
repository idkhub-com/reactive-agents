import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import {
  type CompletionChoice,
  CompletionFinishReason,
  type CompletionRequestBody,
  type CompletionResponseBody,
} from '@shared/types/api/routes/completions-api';
import { AIProvider } from '@shared/types/constants';
import { aI21ErrorResponseTransform } from './chat-complete';

export const aI21CompleteConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    required: true,
  },
  n: {
    param: 'numResults',
    default: 1,
  },
  max_tokens: {
    param: 'maxTokens',
    default: 16,
  },
  minTokens: {
    param: 'minTokens',
    default: 0,
  },
  temperature: {
    param: 'temperature',
    default: 0.7,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'topP',
    default: 1,
  },
  top_k: {
    param: 'topKReturn',
    default: 0,
  },
  stop: {
    param: 'stopSequences',
  },
  presence_penalty: {
    param: 'presencePenalty',
    transform: (idkRequestBody: CompletionRequestBody) => {
      return {
        scale: idkRequestBody.presence_penalty,
      };
    },
  },
  frequency_penalty: {
    param: 'frequencyPenalty',
    transform: (idkRequestBody: CompletionRequestBody) => {
      return {
        scale: idkRequestBody.frequency_penalty,
      };
    },
  },
  countPenalty: {
    param: 'countPenalty',
  },
  frequencyPenalty: {
    param: 'frequencyPenalty',
  },
  presencePenalty: {
    param: 'presencePenalty',
  },
};

export const aI21CompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  idkRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = aI21ErrorResponseTransform(aiProviderResponseBody);
    if (errorResponse) return errorResponse;
  }

  if ('completions' in aiProviderResponseBody) {
    const prompt = aiProviderResponseBody.prompt as { tokens: string[] };
    const completions = aiProviderResponseBody.completions as {
      data: { tokens: string[]; text: string };
      finishReason: { reason: string };
    }[];
    const inputTokens = prompt.tokens?.length || 0;
    const outputTokens = completions
      .map((c: { data: { tokens: string[] } }) => c.data?.tokens?.length || 0)
      .reduce((partialSum, a) => partialSum + a, 0);

    const completionResponseBody: CompletionResponseBody = {
      id: aiProviderResponseBody.id as string,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: (idkRequestData.requestBody as CompletionRequestBody).model,
      choices: completions.map((completion, index) => {
        const completionChoice: CompletionChoice = {
          text: completion.data.text,
          index: index,
          logprobs: null,
          finish_reason: completion.finishReason?.reason
            ? (completion.finishReason.reason as CompletionFinishReason)
            : CompletionFinishReason.STOP,
        };
        return completionChoice;
      }),
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      },
    };
    return completionResponseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.AI21,
  );
};
