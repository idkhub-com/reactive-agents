import type { OpenrouterStreamChunk } from '@server/ai-providers/openrouter/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type {
  ChatCompletionFinishReason,
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import type { ChatCompletionToolCall } from '@shared/types/api/routes/shared/tools';

import { AIProvider } from '@shared/types/constants';

export const openrouterChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'openrouter/auto',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      return (
        idkRequestBody.messages?.map((message) => {
          if (message.role === ChatCompletionMessageRole.DEVELOPER)
            return { ...message, role: ChatCompletionMessageRole.SYSTEM };
          return message;
        }) ?? []
      );
    },
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
  temperature: {
    param: 'temperature',
    default: 1,
    min: 0,
    max: 2,
  },
  modalities: {
    param: 'modalities',
  },
  reasoning: {
    param: 'reasoning',
  },
  top_p: {
    param: 'top_p',
    default: 1,
    min: 0,
    max: 1,
  },
  tools: {
    param: 'tools',
  },
  tool_choice: {
    param: 'tool_choice',
  },
  transforms: {
    param: 'transforms',
  },
  provider: {
    param: 'provider',
  },
  models: {
    param: 'models',
  },
  usage: {
    param: 'usage',
  },
  stream: {
    param: 'stream',
    default: false,
  },
  response_format: {
    param: 'response_format',
  },
};

export const openrouterChatCompleteResponseTransform: ResponseTransformFunction =
  (response, responseStatus, _responseHeaders, strictOpenAiCompliance) => {
    if ('message' in response && responseStatus !== 200) {
      return generateErrorResponse(
        {
          message: response.message as string,
          type: response.type as string,
          param: response.param as string,
          code: response.code as string,
        },
        AIProvider.OPENROUTER,
      );
    }

    if ('choices' in response) {
      const choices = response.choices as {
        index: number;
        message: {
          role: ChatCompletionMessageRole;
          content: string;
          reasoning?: string;
          tool_calls?: ChatCompletionToolCall[];
        };
        finish_reason: ChatCompletionFinishReason;
      }[];

      const responseBody: ChatCompletionResponseBody = {
        id: response.id as string,
        object: response.object as 'chat.completion',
        created: response.created as number,
        model: response.model as string,
        choices: choices.map((choice) => {
          const content_blocks = [];

          if (!strictOpenAiCompliance) {
            if (choice.message.reasoning) {
              content_blocks.push({
                type: 'thinking',
                thinking: choice.message.reasoning,
              });
            }

            content_blocks.push({
              type: 'text',
              text: choice.message.content,
            });
          }

          return {
            index: choice.index,
            message: {
              role: choice.message.role,
              content: choice.message.content,
              ...(content_blocks.length && { content_blocks }),
              ...(choice.message.tool_calls && {
                tool_calls: choice.message.tool_calls,
              }),
            },
            finish_reason: choice.finish_reason,
          };
        }),
        usage: response.usage as {
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
        },
      };
      return responseBody;
    }

    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.OPENROUTER,
    );
  };

export const openrouterChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    _fallbackId,
    _streamState,
    strictOpenAiCompliance,
    idkRequestData,
  ) => {
    const chatCompleteRequestBody =
      idkRequestData.requestBody as ChatCompletionRequestBody;
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }
    if (chunk.includes('OPENROUTER PROCESSING')) {
      chunk = JSON.stringify({
        id: `${Date.now()}`,
        model: chatCompleteRequestBody.model || '',
        object: 'chat.completion.chunk',
        created: Date.now(),
        choices: [
          {
            index: 0,
            delta: { role: 'assistant', content: '' },
            finish_reason: null,
          },
        ],
      });
    }
    const parsedChunk: OpenrouterStreamChunk = JSON.parse(chunk);

    const content_blocks = [];
    if (!strictOpenAiCompliance) {
      // add the reasoning first
      if (parsedChunk.choices?.[0]?.delta?.reasoning) {
        content_blocks.push({
          index: parsedChunk.choices?.[0]?.index,
          delta: {
            thinking: parsedChunk.choices?.[0]?.delta?.reasoning,
          },
        });
      }
      // then add the content
      if (parsedChunk.choices?.[0]?.delta?.content) {
        content_blocks.push({
          index: parsedChunk.choices?.[0]?.index,
          delta: {
            text: parsedChunk.choices?.[0]?.delta?.content,
          },
        });
      }
    }

    return `data: ${JSON.stringify({
      id: parsedChunk.id,
      object: parsedChunk.object,
      created: parsedChunk.created,
      model: parsedChunk.model,
      provider: AIProvider.OPENROUTER,
      choices: [
        {
          index: parsedChunk.choices?.[0]?.index,
          delta: {
            ...parsedChunk.choices?.[0]?.delta,
            ...(content_blocks.length && { content_blocks }),
          },
          finish_reason: parsedChunk.choices?.[0]?.finish_reason,
        },
      ],
      ...(parsedChunk.usage && { usage: parsedChunk.usage }),
    })}\n\n`;
  };
