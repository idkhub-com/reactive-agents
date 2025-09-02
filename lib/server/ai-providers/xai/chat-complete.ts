import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api/response';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from '../openai/utils';

export const xaiChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'grok-4',
  },
  messages: {
    param: 'messages',
    default: '',
  },
  max_tokens: {
    param: 'max_tokens',
    min: 0,
  },
  max_completion_tokens: {
    param: 'max_completion_tokens',
    min: 0,
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
  n: {
    param: 'n',
    default: 1,
    min: 1,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  stream_options: {
    param: 'stream_options',
  },
  stop: {
    param: 'stop',
  },
  presence_penalty: {
    param: 'presence_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  logprobs: {
    param: 'logprobs',
    default: false,
  },
  top_logprobs: {
    param: 'top_logprobs',
    min: 0,
    max: 8,
  },
  user: {
    param: 'user',
  },
  seed: {
    param: 'seed',
  },
  tools: {
    param: 'tools',
  },
  tool_choice: {
    param: 'tool_choice',
  },
  parallel_tool_calls: {
    param: 'parallel_tool_calls',
    default: true,
  },
  response_format: {
    param: 'response_format',
  },
  reasoning_effort: {
    param: 'reasoning_effort',
    // "low" or "high" for reasoning models (not grok-4)
  },
  search_parameters: {
    param: 'search_parameters',
  },
  web_search_options: {
    param: 'web_search_options',
  },
  deferred: {
    param: 'deferred',
    default: false,
  },
};

export const xaiChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  responseStatus,
  _aiProviderResponseHeaders,
  _strictOpenAiCompliance,
  _idkRequestData,
) => {
  if (responseStatus !== 200 && 'error' in aiProviderResponseBody) {
    return openAIErrorResponseTransform(aiProviderResponseBody, AIProvider.XAI);
  }

  // Add provider information to successful responses
  const response = aiProviderResponseBody as ChatCompletionResponseBody;
  Object.defineProperty(response, 'provider', {
    value: AIProvider.XAI,
    enumerable: true,
  });

  return response;
};
