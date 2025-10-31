import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  CompletionRequestBody,
  CompletionResponseBody,
} from '@shared/types/api/routes/completions-api';
import { AIProvider } from '@shared/types/constants';
import { workersAIErrorResponseTransform } from './utils';

export const workersAICompleteConfig: AIProviderFunctionConfig = {
  prompt: {
    param: 'prompt',
    transform: (raRequestBody: CompletionRequestBody) =>
      `\n\nHuman: ${raRequestBody.prompt}\n\nAssistant:`,
    required: true,
  },
  model: {
    param: 'model',
    required: true,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  raw: {
    param: 'raw',
  },
  max_tokens: {
    param: 'max_tokens',
  },
  temperature: {
    param: 'temperature',
  },
  top_p: {
    param: 'top_p',
  },
  top_k: {
    param: 'top_k',
  },
  frequency_penalty: {
    param: 'frequency_penalty',
  },
  presence_penalty: {
    param: 'presence_penalty',
  },
};

interface WorkersAICompleteResponse {
  result: {
    response: string;
  };
  success: boolean;
  errors: string[];
  messages: string[];
  model: string;
}

export const workersAICompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  _strictOpenAiCompliance,
  _raRequestData,
) => {
  if (aiProviderResponseStatus !== 200) {
    return workersAIErrorResponseTransform(aiProviderResponseBody);
  }

  if ('result' in aiProviderResponseBody) {
    const response =
      aiProviderResponseBody as unknown as WorkersAICompleteResponse;
    return {
      id: Date.now().toString(),
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model,
      provider: AIProvider.WORKERS_AI,
      choices: [
        {
          text: response.result.response,
          index: 0,
          logprobs: null,
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: -1,
        completion_tokens: -1,
        total_tokens: -1,
      },
    } as CompletionResponseBody;
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as Record<string, unknown>,
    AIProvider.WORKERS_AI,
  );
};
