import type { AnthropicCompleteResponse } from '@server/ai-providers/anthropic/types';
import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { CompletionRequestBody } from '@shared/types/api/routes/completions-api/request';
import type {
  CompletionFinishReason,
  CompletionResponseBody,
} from '@shared/types/api/routes/completions-api/response';
import { AIProvider } from '@shared/types/constants';
import { anthropicErrorResponseTransform } from './chat-complete';

// TODO: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const anthropicCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    default: 'claude-instant-1',
    required: true,
  },
  prompt: {
    param: 'prompt',
    transform: (raRequestBody: CompletionRequestBody) =>
      `\n\nHuman: ${raRequestBody.prompt}\n\nAssistant:`,
    required: true,
  },
  max_tokens: {
    param: 'max_tokens_to_sample',
    required: true,
  },
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'top_p',
    default: -1,
    min: -1,
  },
  top_k: {
    param: 'top_k',
    default: -1,
  },
  stop: {
    param: 'stop_sequences',
    transform: (raRequestBody: CompletionRequestBody) => {
      if (raRequestBody.stop === null) {
        return [];
      }
      return raRequestBody.stop;
    },
  },
  stream: {
    param: 'stream',
    default: false,
  },
  user: {
    param: 'metadata.user_id',
  },
};

// TODO: The token calculation is wrong atm
export const anthropicCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = anthropicErrorResponseTransform(
      aiProviderResponseBody as Record<string, unknown>,
    );
    if (errorResponse) return errorResponse;
  }

  const response =
    aiProviderResponseBody as unknown as AnthropicCompleteResponse;
  if ('completion' in response) {
    const responseObject: CompletionResponseBody = {
      id: response.log_id,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model,
      choices: [
        {
          text: response.completion,
          index: 0,
          logprobs: null,
          finish_reason: response.stop_reason as CompletionFinishReason,
        },
      ],
    };
    return responseObject;
  }

  return generateInvalidProviderResponseError(
    response as unknown as Record<string, unknown>,
    AIProvider.ANTHROPIC,
  );
};

export const anthropicCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    if (chunk.startsWith('event: ping')) {
      return '';
    }

    chunk = chunk.replace(/^event: completion[\r\n]*/, '');
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return chunk;
    }
    const parsedChunk: AnthropicCompleteResponse = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      id: parsedChunk.log_id,
      object: 'text_completion',
      created: Math.floor(Date.now() / 1000),
      model: parsedChunk.model,
      provider: 'anthropic',
      choices: [
        {
          text: parsedChunk.completion,
          index: 0,
          logprobs: null,
          finish_reason: parsedChunk.stop_reason,
        },
      ],
    })}\n\n`;
  };
