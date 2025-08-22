import type {
  AnthropicContentItem,
  AnthropicErrorObject,
  AnthropicMessage,
  AnthropicMessageContentItem,
  AnthropicStreamState,
  AnthropicTool,
} from '@server/ai-providers/anthropic/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response';

import type {
  ChatCompletionFinishReason,
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import {
  type ChatCompletionContentType,
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
  ChatCompletionSystemMessageRoles,
} from '@shared/types/api/routes/shared/messages';
import type {
  ChatCompletionTool,
  ChatCompletionToolCall,
} from '@shared/types/api/routes/shared/tools';
import { AIProvider, fileExtensionMimeTypeMap } from '@shared/types/constants';

// TODO: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

const transformAssistantMessage = (
  msg: ChatCompletionMessage,
): AnthropicMessage => {
  const transformedContent: AnthropicContentItem[] = [];
  const inputContent: ChatCompletionContentType[] | string | undefined =
    msg.content_blocks ?? msg.content ?? undefined;
  const containsToolCalls = msg.tool_calls?.length;

  if (inputContent && typeof inputContent === 'string') {
    transformedContent.push({
      type: 'text',
      text: inputContent,
    });
  } else if (
    inputContent &&
    typeof inputContent === 'object' &&
    inputContent.length
  ) {
    inputContent.forEach((item) => {
      if (item.type !== 'tool_use') {
        transformedContent.push(item as AnthropicContentItem);
      }
    });
  }
  if (containsToolCalls) {
    msg.tool_calls.forEach((toolCall: ChatCompletionToolCall) => {
      transformedContent.push({
        type: 'tool_use',
        name: toolCall.function.name,
        id: toolCall.id,
        input: JSON.parse(toolCall.function.arguments),
      });
    });
  }
  return {
    role: msg.role,
    content: transformedContent as AnthropicMessageContentItem[],
  };
};

const transformToolMessage = (msg: ChatCompletionMessage): AnthropicMessage => {
  const tool_use_id = msg.tool_call_id ?? '';
  return {
    role: ChatCompletionMessageRole.USER,
    content: [
      {
        type: 'tool_result',
        tool_use_id,
        content: msg.content as string,
      },
    ],
  };
};

const transformAndAppendImageContentItem = (
  item: ChatCompletionContentType,
  transformedMessage: AnthropicMessage,
): void => {
  if (!item?.image_url?.url || typeof transformedMessage.content === 'string')
    return;
  const url = item.image_url.url;
  const isBase64EncodedImage = url.startsWith('data:');
  if (!isBase64EncodedImage) {
    transformedMessage.content.push({
      type: 'image',
      source: {
        type: 'url',
        url,
      },
    });
  } else {
    const parts = url.split(';');
    if (parts.length === 2) {
      const base64ImageParts = parts[1].split(',');
      const base64Image = base64ImageParts[1];
      const mediaTypeParts = parts[0].split(':');
      if (mediaTypeParts.length === 2 && base64Image) {
        const mediaType = mediaTypeParts[1];
        transformedMessage.content.push({
          type:
            mediaType === fileExtensionMimeTypeMap.pdf ? 'document' : 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Image,
          },
          ...(item.cache_control && {
            cache_control: { type: 'ephemeral' },
          }),
        });
      }
    }
  }
};

const transformAndAppendFileContentItem = (
  item: ChatCompletionContentType,
  transformedMessage: AnthropicMessage,
): void => {
  const mimeType =
    (item.file?.mime_type as keyof typeof fileExtensionMimeTypeMap) ||
    fileExtensionMimeTypeMap.pdf;
  if (item.file?.file_url) {
    transformedMessage.content.push({
      type: 'document',
      source: {
        type: 'url',
        url: item.file.file_url,
      },
    });
  } else if (item.file?.file_data) {
    const contentType =
      mimeType === fileExtensionMimeTypeMap.txt ? 'text' : 'base64';
    transformedMessage.content.push({
      type: 'document',
      source: {
        type: contentType,
        data: item.file.file_data,
        media_type: mimeType,
      },
    });
  }
};

export const anthropicChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    default: 'claude-2.1',
    required: true,
  },
  messages: [
    {
      param: 'messages',
      required: true,
      transform: (
        idkRequestBody: ChatCompletionRequestBody,
      ): Record<string, unknown> => {
        const messages: AnthropicMessage[] = [];
        // Transform the chat messages into a simple prompt
        if (idkRequestBody.messages) {
          idkRequestBody.messages.forEach((msg: ChatCompletionMessage) => {
            if (ChatCompletionSystemMessageRoles.includes(msg.role)) return;

            if (msg.role === 'assistant') {
              messages.push(transformAssistantMessage(msg));
            } else if (
              msg.content &&
              typeof msg.content === 'object' &&
              msg.content.length
            ) {
              const transformedMessage: AnthropicMessage = {
                role: msg.role,
                content: [],
              };
              msg.content.forEach((item) => {
                if (item.type === 'text') {
                  transformedMessage.content.push({
                    type: item.type,
                    text: item.text ?? '',
                    ...(item.cache_control && {
                      cache_control: { type: 'ephemeral' },
                    }),
                  });
                } else if (item.type === 'image_url') {
                  transformAndAppendImageContentItem(item, transformedMessage);
                } else if (item.type === 'file') {
                  transformAndAppendFileContentItem(item, transformedMessage);
                }
              });
              messages.push(transformedMessage as AnthropicMessage);
            } else if (msg.role === 'tool') {
              // even though anthropic supports images in tool results, openai doesn't support it yet
              messages.push(transformToolMessage(msg));
            } else {
              messages.push({
                role: msg.role,
                content: msg.content as AnthropicMessageContentItem[],
              });
            }
          });
        }

        return messages as unknown as Record<string, unknown>;
      },
    },
    {
      param: 'system',
      required: false,
      transform: (
        idkRequestBody: ChatCompletionRequestBody,
      ): Record<string, unknown>[] => {
        const systemMessages: AnthropicMessageContentItem[] = [];
        // Transform the chat messages into a simple prompt
        if (idkRequestBody.messages) {
          idkRequestBody.messages.forEach((msg: ChatCompletionMessage) => {
            if (
              ChatCompletionSystemMessageRoles.includes(msg.role) &&
              msg.content &&
              typeof msg.content === 'object' &&
              msg.content[0].text
            ) {
              msg.content.forEach((_msg) => {
                systemMessages.push({
                  text: _msg.text ?? '',
                  type: 'text',
                  ...(_msg.cache_control && {
                    cache_control: { type: 'ephemeral' },
                  }),
                });
              });
            } else if (
              ChatCompletionSystemMessageRoles.includes(msg.role) &&
              typeof msg.content === 'string'
            ) {
              systemMessages.push({
                text: msg.content,
                type: 'text',
              });
            }
          });
        }
        return systemMessages as unknown as Record<string, unknown>[];
      },
    },
  ],
  tools: {
    param: 'tools',
    required: false,
    transform: (
      idkRequestBody: ChatCompletionRequestBody,
    ): Record<string, unknown>[] => {
      const tools: AnthropicTool[] = [];
      if (idkRequestBody.tools) {
        idkRequestBody.tools.forEach((tool: ChatCompletionTool) => {
          if (tool.function) {
            const anthropicTool: AnthropicTool = {
              name: tool.function.name,
              description: tool.function?.description || '',
              input_schema: {
                type: (tool.function.parameters?.type as string) || 'object',
                properties:
                  (tool.function.parameters?.properties as Record<
                    string,
                    { type: string; description: string }
                  >) || {},
                required:
                  (tool.function.parameters?.required as string[]) || [],
              },
              ...(tool.cache_control && {
                cache_control: { type: 'ephemeral' },
              }),
            };
            tools.push(anthropicTool);
          }
        });
      }
      return tools as unknown as Record<string, unknown>[];
    },
  },
  // None is not supported by Anthropic, defaults to auto
  tool_choice: {
    param: 'tool_choice',
    required: false,
    transform: (
      idkRequestBody: ChatCompletionRequestBody,
    ): { type: 'tool' | 'any' | 'auto'; name?: string } | null => {
      if (idkRequestBody.tool_choice) {
        if (typeof idkRequestBody.tool_choice === 'string') {
          if (idkRequestBody.tool_choice === 'required') return { type: 'any' };
          else if (idkRequestBody.tool_choice === 'auto')
            return { type: 'auto' };
        } else if (typeof idkRequestBody.tool_choice === 'object') {
          return {
            type: 'tool',
            name: idkRequestBody.tool_choice.function.name,
          };
        }
      }
      return null;
    },
  },
  max_tokens: {
    param: 'max_tokens',
    required: true,
  },
  max_completion_tokens: {
    param: 'max_tokens',
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
  },
  stream: {
    param: 'stream',
    default: false,
  },
  user: {
    param: 'metadata.user_id',
  },
  thinking: {
    param: 'thinking',
    required: false,
  },
};

export interface AnthropicChatCompleteResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContentItem[];
  stop_reason: ChatCompletionFinishReason;
  model: string;
  stop_sequence: null | string;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export interface AnthropicChatCompleteStreamResponse {
  type: string;
  index: number;
  delta: {
    type?: string;
    text?: string;
    partial_json?: string;
    stop_reason?: string;
  };
  content_block?: {
    type: string;
    id?: string;
    text?: string;
    name?: string;
    input?: {};
  };
  usage?: {
    output_tokens?: number;
    input_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
  message?: {
    usage?: {
      output_tokens?: number;
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    model?: string;
  };
  error?: AnthropicErrorObject;
}

export const anthropicErrorResponseTransform = (
  aiProviderResponseBody: Record<string, unknown>,
): ErrorResponseBody => {
  if ('error' in aiProviderResponseBody) {
    const error = aiProviderResponseBody.error as AnthropicErrorObject;
    return generateErrorResponse(
      {
        message: error.message,
        type: error.type,
      },
      AIProvider.ANTHROPIC,
    );
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.ANTHROPIC,
  );
};

// TODO: The token calculation is wrong atm
export const anthropicChatCompleteResponseTransform: ResponseTransformFunction =
  (
    aiProviderResponseBody,
    aiProviderResponseStatus,
    _responseHeaders,
    strictOpenAiCompliance,
  ) => {
    if (aiProviderResponseStatus !== 200) {
      const errorResponse = anthropicErrorResponseTransform(
        aiProviderResponseBody,
      );
      if (errorResponse) return errorResponse;
    }

    if ('content' in aiProviderResponseBody) {
      const response =
        aiProviderResponseBody as unknown as AnthropicChatCompleteResponse;
      const {
        input_tokens = 0,
        output_tokens = 0,
        cache_creation_input_tokens,
        cache_read_input_tokens,
      } = response?.usage ?? {};

      const shouldSendCacheUsage =
        cache_creation_input_tokens || cache_read_input_tokens;

      let content = '';
      response.content.forEach((item) => {
        if (item.type === 'text') {
          content += item.text;
        }
      });

      const toolCalls: ChatCompletionToolCall[] = [];
      response.content.forEach((item) => {
        if (item.type === 'tool_use') {
          toolCalls.push({
            id: item.id,
            type: 'function',
            function: {
              name: item.name,
              arguments: JSON.stringify(item.input),
            },
          });
        }
      });

      const responseObject: ChatCompletionResponseBody = {
        id: response.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [
          {
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content,
              ...(!strictOpenAiCompliance && {
                content_blocks: response.content.filter(
                  (item) => item.type !== 'tool_use',
                ),
              }),
              tool_calls: toolCalls.length ? toolCalls : undefined,
            },
            index: 0,
            logprobs: null,
            finish_reason: response.stop_reason,
          },
        ],
        usage: {
          prompt_tokens: input_tokens,
          completion_tokens: output_tokens,
          total_tokens:
            input_tokens +
            output_tokens +
            (cache_creation_input_tokens ?? 0) +
            (cache_read_input_tokens ?? 0),
          ...(shouldSendCacheUsage && {
            cache_read_input_tokens: cache_read_input_tokens,
            cache_creation_input_tokens: cache_creation_input_tokens,
          }),
        },
      };

      return responseObject;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.ANTHROPIC,
    );
  };

export const anthropicChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk, fallbackId, streamState, strictOpenAiCompliance) => {
    let chunk = responseChunk.trim();
    if (
      chunk.startsWith('event: ping') ||
      chunk.startsWith('event: content_block_stop')
    ) {
      return '';
    }

    if (chunk.startsWith('event: message_stop')) {
      return 'data: [DONE]\n\n';
    }

    chunk = chunk.replace(/^event: content_block_delta[\r\n]*/, '');
    chunk = chunk.replace(/^event: content_block_start[\r\n]*/, '');
    chunk = chunk.replace(/^event: message_delta[\r\n]*/, '');
    chunk = chunk.replace(/^event: message_start[\r\n]*/, '');
    chunk = chunk.replace(/^event: error[\r\n]*/, '');
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();

    const parsedChunk: AnthropicChatCompleteStreamResponse = JSON.parse(chunk);

    if (parsedChunk.type === 'error' && parsedChunk.error) {
      return (
        `data: ${JSON.stringify({
          id: fallbackId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: '',
          provider: AIProvider.ANTHROPIC,
          choices: [
            {
              finish_reason: parsedChunk.error.type,
              delta: {
                content: '',
              },
            },
          ],
        })}` +
        '\n\n' +
        'data: [DONE]\n\n'
      );
    }

    const shouldSendCacheUsage =
      parsedChunk.message?.usage?.cache_read_input_tokens ||
      parsedChunk.message?.usage?.cache_creation_input_tokens;

    if (parsedChunk.type === 'message_start' && parsedChunk.message?.usage) {
      streamState.model = parsedChunk?.message?.model ?? '';
      streamState.usage = {
        prompt_tokens: parsedChunk.message?.usage?.input_tokens,
        ...(shouldSendCacheUsage && {
          cache_read_input_tokens:
            parsedChunk.message?.usage?.cache_read_input_tokens,
          cache_creation_input_tokens:
            parsedChunk.message?.usage?.cache_creation_input_tokens,
        }),
      };
      return `data: ${JSON.stringify({
        id: fallbackId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: streamState.model,
        provider: AIProvider.ANTHROPIC,
        choices: [
          {
            delta: {
              content: '',
            },
            index: 0,
            logprobs: null,
            finish_reason: null,
          },
        ],
      })}\n\n`;
    }

    if (parsedChunk.type === 'message_delta' && parsedChunk.usage) {
      const usage = streamState.usage as AnthropicStreamState['usage'];
      const totalTokens =
        (usage?.prompt_tokens ?? 0) +
        (usage?.cache_creation_input_tokens ?? 0) +
        (usage?.cache_read_input_tokens ?? 0) +
        (parsedChunk.usage.output_tokens ?? 0);
      return `data: ${JSON.stringify({
        id: fallbackId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: streamState.model,
        provider: AIProvider.ANTHROPIC,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: parsedChunk.delta?.stop_reason,
          },
        ],
        usage: {
          completion_tokens: parsedChunk.usage?.output_tokens,
          ...usage,
          total_tokens: totalTokens,
        },
      })}\n\n`;
    }

    const toolCalls = [];
    const isToolBlockStart: boolean =
      parsedChunk.type === 'content_block_start' &&
      parsedChunk.content_block?.type === 'tool_use';
    if (isToolBlockStart) {
      streamState.toolIndex = streamState.toolIndex
        ? (streamState.toolIndex as number) + 1
        : 0;
    }
    const isToolBlockDelta: boolean =
      parsedChunk.type === 'content_block_delta' &&
      parsedChunk.delta?.partial_json !== undefined;

    if (isToolBlockStart && parsedChunk.content_block) {
      toolCalls.push({
        index: streamState.toolIndex,
        id: parsedChunk.content_block.id,
        type: 'function',
        function: {
          name: parsedChunk.content_block.name,
          arguments: '',
        },
      });
    } else if (isToolBlockDelta) {
      toolCalls.push({
        index: streamState.toolIndex,
        function: {
          arguments: parsedChunk.delta.partial_json,
        },
      });
    }

    const content = parsedChunk.delta?.text;

    const contentBlockObject = {
      index: parsedChunk.index,
      delta: parsedChunk.delta ?? parsedChunk.content_block ?? {},
    };
    delete contentBlockObject.delta.type;

    return `data: ${JSON.stringify({
      id: fallbackId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: streamState.model,
      provider: AIProvider.ANTHROPIC,
      choices: [
        {
          delta: {
            content,
            tool_calls: toolCalls.length ? toolCalls : undefined,
            ...(!strictOpenAiCompliance &&
              !toolCalls.length && {
                content_blocks: [contentBlockObject],
              }),
          },
          index: 0,
          logprobs: null,
          finish_reason: parsedChunk.delta?.stop_reason ?? null,
        },
      ],
    })}\n\n`;
  };
