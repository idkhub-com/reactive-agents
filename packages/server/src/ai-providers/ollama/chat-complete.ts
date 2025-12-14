import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import type { OllamaChatCompleteResponse, OllamaStreamChunk } from './types';
import { ollamaErrorResponseTransform } from './utils';

export const ollamaChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'llama3.2:latest',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (params: ChatCompletionRequestBody) => {
      return params.messages?.map((message) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER)
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
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

export const ollamaChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  _raRequestData,
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
    // Construct usage object from Ollama's token counts if usage is not provided
    const usage = response.usage ?? {
      prompt_tokens: response.prompt_eval_count ?? 0,
      completion_tokens: response.eval_count ?? 0,
      total_tokens:
        (response.prompt_eval_count ?? 0) + (response.eval_count ?? 0),
    };

    return {
      id: response.id,
      object: response.object,
      created: response.created,
      model: response.model,
      provider: AIProvider.OLLAMA,
      choices: response.choices,
      usage,
    };
  }

  return generateInvalidProviderResponseError(response, AIProvider.OLLAMA);
};

export const ollamaChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    _fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    _raRequestData,
  ) => {
    const chunk = responseChunk
      .trim()
      .replace(/^data: /, '')
      .trim();

    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    const parsedChunk: OllamaStreamChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.OLLAMA,
      choices: parsedChunk.choices,
    })}\n\n`;
  };
