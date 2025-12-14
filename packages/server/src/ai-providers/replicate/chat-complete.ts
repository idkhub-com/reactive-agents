import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import type {
  ReplicateChatCompleteResponse,
  ReplicateErrorResponse,
} from './types';

export const replicateChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'version',
    required: true,
    default:
      'meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3',
  },
  messages: {
    param: 'input.prompt',
    default: '',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      if (!raRequestBody.messages) return '';

      // Convert messages to prompt format for Replicate
      let prompt = '';
      for (const message of raRequestBody.messages) {
        if (message.role === ChatCompletionMessageRole.SYSTEM) {
          prompt += `System: ${message.content}\n\n`;
        } else if (message.role === ChatCompletionMessageRole.USER) {
          prompt += `Human: ${message.content}\n\n`;
        } else if (message.role === ChatCompletionMessageRole.ASSISTANT) {
          prompt += `Assistant: ${message.content}\n\n`;
        } else if (message.role === ChatCompletionMessageRole.DEVELOPER) {
          prompt += `System: ${message.content}\n\n`;
        }
      }
      prompt += 'Assistant: ';
      return prompt;
    },
  },
  max_tokens: {
    param: 'input.max_new_tokens',
    default: 100,
    min: 0,
  },
  max_completion_tokens: {
    param: 'input.max_new_tokens',
    default: 100,
    min: 0,
  },
  temperature: {
    param: 'input.temperature',
    default: 1,
    min: 0,
    max: 2,
  },
  top_p: {
    param: 'input.top_p',
    default: 1,
    min: 0,
    max: 1,
  },
  stream: {
    param: 'stream',
    default: false,
  },
  frequency_penalty: {
    param: 'input.frequency_penalty',
    default: 0,
    min: -2,
    max: 2,
  },
  presence_penalty: {
    param: 'input.repetition_penalty',
    default: 1.0,
    min: 0.1,
    max: 2.0,
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      // Convert presence penalty (-2 to 2) to repetition penalty (0.1 to 2.0)
      const value = raRequestBody.presence_penalty || 0;
      return Math.max(0.1, Math.min(2.0, 1.0 + value * 0.1));
    },
  },
  stop: {
    param: 'input.stop_sequences',
    default: null,
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      if (raRequestBody.stop && !Array.isArray(raRequestBody.stop)) {
        return [raRequestBody.stop];
      }
      return raRequestBody.stop;
    },
  },
};

interface ReplicateStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: {
    delta: {
      role?: string | null;
      content?: string;
    };
    index: number;
    finish_reason: string | null;
  }[];
}

export const replicateChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    if (aiProviderResponseStatus !== 200) {
      const response =
        aiProviderResponseBody as unknown as ReplicateErrorResponse;
      if ('detail' in response) {
        return generateErrorResponse(
          {
            message: response.detail,
            type: response.title || undefined,
            param: undefined,
            code: aiProviderResponseStatus?.toString() || undefined,
          },
          AIProvider.REPLICATE,
        );
      }
    }

    if ('output' in aiProviderResponseBody) {
      const response =
        aiProviderResponseBody as unknown as ReplicateChatCompleteResponse;

      // Extract content from different possible output formats
      let content = '';
      if (typeof response.output === 'string') {
        content = response.output;
      } else if (Array.isArray(response.output)) {
        content = response.output.join('');
      } else if (
        response.output &&
        typeof response.output === 'object' &&
        'text' in response.output
      ) {
        content = response.output.text || '';
      }

      return {
        id: response.id || crypto.randomUUID(),
        object: 'chat.completion',
        created: Math.floor(
          new Date(response.created_at || Date.now()).getTime() / 1000,
        ),
        model: response.version || 'replicate-model',
        provider: AIProvider.REPLICATE,
        choices: [
          {
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: content,
            },
            index: 0,
            logprobs: null,
            finish_reason: 'stop' as ChatCompletionFinishReason,
          },
        ],
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody as Record<string, unknown>,
      AIProvider.REPLICATE,
    );
  };

export const replicateChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();

    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    const parsedChunk: ReplicateStreamChunk = JSON.parse(chunk);
    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.REPLICATE,
      choices: [
        {
          index: parsedChunk.choices[0]?.index || 0,
          delta: parsedChunk.choices[0]?.delta || { content: '' },
          finish_reason: parsedChunk.choices[0]?.finish_reason || null,
        },
      ],
      usage: parsedChunk.usage,
    })}\n\n`;
  };
