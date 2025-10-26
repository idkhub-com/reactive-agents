import { generateInvalidProviderResponseError } from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import type {
  MistralAIChatCompleteResponse,
  MistralAIStreamChunk,
} from './types';
import { mistralAIErrorResponseTransform } from './utils';

export const mistralAIChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'mistral-tiny',
    transform: (params: ChatCompletionRequestBody) => {
      return params.model?.replace('mistralai.', '');
    },
  },
  messages: {
    param: 'messages',
    default: [],
    transform: (params: ChatCompletionRequestBody) => {
      return params.messages?.map((message) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER) {
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        }
        return message;
      });
    },
  },
  temperature: {
    param: 'temperature',
    default: 0.7,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'top_p',
    default: 1,
    min: 0,
    max: 1,
  },
  max_tokens: {
    param: 'max_tokens',
    default: null,
    min: 1,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    default: null,
    min: 1,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  stop: {
    param: 'stop',
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
    param: 'random_seed',
    default: null,
  },
  safe_prompt: {
    param: 'safe_prompt',
    default: false,
  },
  // TODO: deprecate this and move to safe_prompt in next release
  safe_mode: {
    param: 'safe_prompt',
    default: false,
  },
  prompt: {
    param: 'prompt',
    required: false,
    default: '',
  },
  suffix: {
    param: 'suffix',
    required: false,
    default: '',
  },
  tools: {
    param: 'tools',
    default: null,
  },
  tool_choice: {
    param: 'tool_choice',
    default: null,
    transform: (params: ChatCompletionRequestBody) => {
      if (
        typeof params.tool_choice === 'string' &&
        params.tool_choice === 'required'
      ) {
        return 'any';
      }
      return params.tool_choice;
    },
  },
  parallel_tool_calls: {
    param: 'parallel_tool_calls',
    default: null,
  },
};

export const mistralAIChatCompleteResponseTransform: ResponseTransformFunction =
  (
    aiProviderResponseBody,
    aiProviderResponseStatus,
    _aiProviderResponseHeaders,
    _strictOpenAiCompliance,
    _idkRequestData,
  ) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      return mistralAIErrorResponseTransform(
        aiProviderResponseBody,
        aiProviderResponseStatus,
      );
    }

    const response =
      aiProviderResponseBody as unknown as MistralAIChatCompleteResponse;

    if ('choices' in response) {
      // Transform choices to handle null tool_calls
      const transformedChoices = response.choices.map((choice) => ({
        ...choice,
        message: {
          ...choice.message,
          tool_calls: choice.message.tool_calls || undefined,
        },
      }));

      return {
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        provider: AIProvider.MISTRAL_AI,
        choices: transformedChoices,
        usage: response.usage,
      };
    }

    return generateInvalidProviderResponseError(
      response,
      AIProvider.MISTRAL_AI,
    );
  };

export const mistralAIChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    _fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    _idkRequestData,
  ) => {
    const chunk = responseChunk
      .trim()
      .replace(/^data: /, '')
      .trim();

    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    const parsedChunk: MistralAIStreamChunk = JSON.parse(chunk);

    // Transform choices to handle null tool_calls in streaming
    const transformedChoices = parsedChunk.choices.map((choice) => ({
      ...choice,
      delta: {
        ...choice.delta,
        tool_calls: choice.delta.tool_calls || undefined,
      },
    }));

    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.MISTRAL_AI,
      choices: transformedChoices,
    })}\n\n`;
  };
