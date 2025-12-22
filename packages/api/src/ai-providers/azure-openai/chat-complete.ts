// Azure OpenAI REST API documentation
// https://learn.microsoft.com/en-us/azure/ai-foundry/reference/openai/latest
// https://platform.openai.com/docs/api-reference

import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import { AIProvider } from '@shared/types/constants';
import { openAIErrorResponseTransform } from '../openai/utils';

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const azureOpenAIChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
  },
  messages: {
    param: 'messages',
    default: '',
  },
  functions: {
    param: 'functions',
  },
  function_call: {
    param: 'function_call',
  },
  max_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
  },
  max_completion_tokens: {
    param: 'max_completion_tokens',
    default: 100,
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
  },
  logprobs: {
    param: 'logprobs',
    default: false,
  },
  top_logprobs: {
    param: 'top_logprobs',
  },
  stream: {
    param: 'stream',
    default: false,
  },
  stop: {
    param: 'stop',
  },
  presence_penalty: {
    param: 'presence_penalty',
    min: -2,
    max: 2,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    min: -2,
    max: 2,
  },
  logit_bias: {
    param: 'logit_bias',
  },
  user: {
    param: 'user',
  },
  tools: {
    param: 'tools',
  },
  tool_choice: {
    param: 'tool_choice',
  },
  response_format: {
    param: 'response_format',
  },
  store: {
    param: 'store',
  },
  metadata: {
    param: 'metadata',
  },
  modalities: {
    param: 'modalities',
  },
  audio: {
    param: 'audio',
  },
  seed: {
    param: 'seed',
  },
  prediction: {
    param: 'prediction',
  },
  reasoning_effort: {
    param: 'reasoning_effort',
  },
  stream_options: {
    param: 'stream_options',
  },
};

export const azureOpenAIChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200 && 'error' in aiProviderResponseBody) {
      return openAIErrorResponseTransform(
        aiProviderResponseBody,
        AIProvider.AZURE_OPENAI,
      );
    }

    return aiProviderResponseBody as unknown as ChatCompletionResponseBody;
  };
