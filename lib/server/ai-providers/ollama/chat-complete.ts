import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';
import { AIProvider } from '@shared/types/constants';
import type { OllamaChatCompleteResponse, OllamaStreamChunk } from './types';
import { ollamaErrorResponseTransform } from './utils';

export const OllamaChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'llama2',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (params: ChatCompletionRequestBody) => {
      return params.messages?.map((message) => {
        if (message.role === 'developer') return { ...message, role: 'system' };
        return message;
      });
    },
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    min: -2,
    max: 2,
  },
  presence_penalty: {
    param: 'presence_penalty',
    min: -2,
    max: 2,
  },
  response_format: {
    param: 'response_format',
  },
  seed: {
    param: 'seed',
  },
  stop: {
    param: 'stop',
  },
  stream: {
    param: 'stream',
    default: false,
  },
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 2,
  },
  top_p: {
    param: 'top_p',
    default: 1,
    min: 0,
    max: 1,
  },
  max_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
  },
  tools: {
    param: 'tools',
  },
};

export const OllamaChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  _idkRequestData,
) => {
  if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return ollamaErrorResponseTransform(
      aiProviderResponseBody,
      aiProviderResponseStatus,
    );
  }

  const response =
    aiProviderResponseBody as unknown as OllamaChatCompleteResponse;

  if ('choices' in response) {
    return {
      id: response.id,
      object: response.object,
      created: response.created,
      model: response.model,
      provider: AIProvider.OLLAMA,
      choices: response.choices,
      usage: response.usage,
    };
  }

  return generateInvalidProviderResponseError(response, AIProvider.OLLAMA);
};

export const OllamaChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    _fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    _idkRequestData,
  ) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();

    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    try {
      const parsedChunk: OllamaStreamChunk = JSON.parse(chunk);
      return `data: ${JSON.stringify({
        id: parsedChunk.id,
        object: parsedChunk.object,
        created: parsedChunk.created,
        model: parsedChunk.model,
        provider: AIProvider.OLLAMA,
        choices: parsedChunk.choices,
      })}\n\n`;
    } catch {
      return `data: ${chunk}\n\n`;
    }
  };
