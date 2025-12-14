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
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
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

// Map Anthropic stop_reason values to OpenAI finish_reason values
const mapStopReasonToFinishReason = (
  stopReason: string,
): ChatCompletionFinishReason => {
  switch (stopReason) {
    case 'end_turn':
    case 'stop_sequence':
      return ChatCompletionFinishReason.STOP;
    case 'max_tokens':
      return ChatCompletionFinishReason.LENGTH;
    case 'tool_use':
      return ChatCompletionFinishReason.TOOL_CALLS;
    default:
      return ChatCompletionFinishReason.STOP;
  }
};

// TODO: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

const transformAssistantMessage = (
  msg: ChatCompletionMessage,
): AnthropicMessage => {
  const transformedContent: AnthropicContentItem[] = [];
  const inputContent: ChatCompletionContentType[] | string | undefined =
    msg.content_blocks ?? msg.content ?? undefined;
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
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    msg.tool_calls.forEach((toolCall: ChatCompletionToolCall) => {
      try {
        transformedContent.push({
          type: 'tool_use',
          name: toolCall.function.name,
          id: toolCall.id,
          input: JSON.parse(toolCall.function.arguments),
        });
      } catch (error) {
        // If JSON parsing fails, use the arguments as a string wrapped in an object
        console.warn(
          `Failed to parse tool call arguments for ${toolCall.function.name}: ${error}`,
        );
        transformedContent.push({
          type: 'tool_use',
          name: toolCall.function.name,
          id: toolCall.id,
          input: { raw_arguments: toolCall.function.arguments },
        });
      }
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

/**
 * Recursively converts a JSON schema to Anthropic's tool input schema format.
 * Handles nested objects, arrays, enums, patterns, and other JSON schema features.
 */
const convertJsonSchemaToAnthropicSchema = (
  schema: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  // Copy over basic type information
  if (schema.type) {
    result.type = schema.type;
  }

  // Handle description
  if (schema.description) {
    result.description = schema.description;
  }

  // Handle enum values
  if (schema.enum && Array.isArray(schema.enum)) {
    result.enum = schema.enum;
  }

  // Handle const values
  if ('const' in schema) {
    result.const = schema.const;
  }

  // Handle pattern for strings
  if (schema.pattern && typeof schema.pattern === 'string') {
    result.pattern = schema.pattern;
  }

  // Handle format
  if (schema.format && typeof schema.format === 'string') {
    result.format = schema.format;
  }

  // Handle numeric constraints
  if (typeof schema.minimum === 'number') {
    result.minimum = schema.minimum;
  }
  if (typeof schema.maximum === 'number') {
    result.maximum = schema.maximum;
  }
  if (typeof schema.exclusiveMinimum === 'number') {
    result.exclusiveMinimum = schema.exclusiveMinimum;
  }
  if (typeof schema.exclusiveMaximum === 'number') {
    result.exclusiveMaximum = schema.exclusiveMaximum;
  }

  // Handle string constraints
  if (typeof schema.minLength === 'number') {
    result.minLength = schema.minLength;
  }
  if (typeof schema.maxLength === 'number') {
    result.maxLength = schema.maxLength;
  }

  // Handle array constraints
  if (typeof schema.minItems === 'number') {
    result.minItems = schema.minItems;
  }
  if (typeof schema.maxItems === 'number') {
    result.maxItems = schema.maxItems;
  }
  if (typeof schema.uniqueItems === 'boolean') {
    result.uniqueItems = schema.uniqueItems;
  }

  // Handle nested properties (for objects)
  if (schema.properties && typeof schema.properties === 'object') {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      if (typeof value === 'object' && value !== null) {
        properties[key] = convertJsonSchemaToAnthropicSchema(
          value as Record<string, unknown>,
        );
      }
    }
    if (Object.keys(properties).length > 0) {
      result.properties = properties;
    }
  }

  // Handle required fields
  if (schema.required && Array.isArray(schema.required)) {
    result.required = schema.required;
  }

  // Handle additionalProperties
  if ('additionalProperties' in schema) {
    if (typeof schema.additionalProperties === 'boolean') {
      result.additionalProperties = schema.additionalProperties;
    } else if (
      typeof schema.additionalProperties === 'object' &&
      schema.additionalProperties !== null
    ) {
      result.additionalProperties = convertJsonSchemaToAnthropicSchema(
        schema.additionalProperties as Record<string, unknown>,
      );
    }
  }

  // Handle array items
  if (schema.items) {
    if (typeof schema.items === 'object' && schema.items !== null) {
      if (Array.isArray(schema.items)) {
        // Tuple validation (array of schemas)
        result.items = schema.items.map((item) => {
          if (typeof item === 'object' && item !== null) {
            return convertJsonSchemaToAnthropicSchema(
              item as Record<string, unknown>,
            );
          }
          return item;
        });
      } else {
        // Single schema for all items
        result.items = convertJsonSchemaToAnthropicSchema(
          schema.items as Record<string, unknown>,
        );
      }
    }
  }

  // Handle anyOf, oneOf, allOf
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    result.anyOf = schema.anyOf.map((subSchema) => {
      if (typeof subSchema === 'object' && subSchema !== null) {
        return convertJsonSchemaToAnthropicSchema(
          subSchema as Record<string, unknown>,
        );
      }
      return subSchema;
    });
  }

  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    result.oneOf = schema.oneOf.map((subSchema) => {
      if (typeof subSchema === 'object' && subSchema !== null) {
        return convertJsonSchemaToAnthropicSchema(
          subSchema as Record<string, unknown>,
        );
      }
      return subSchema;
    });
  }

  if (schema.allOf && Array.isArray(schema.allOf)) {
    result.allOf = schema.allOf.map((subSchema) => {
      if (typeof subSchema === 'object' && subSchema !== null) {
        return convertJsonSchemaToAnthropicSchema(
          subSchema as Record<string, unknown>,
        );
      }
      return subSchema;
    });
  }

  // Handle not
  if (schema.not && typeof schema.not === 'object') {
    result.not = convertJsonSchemaToAnthropicSchema(
      schema.not as Record<string, unknown>,
    );
  }

  // Handle default values
  if ('default' in schema) {
    result.default = schema.default;
  }

  return result;
};

// Helper to create a JSON output tool for response_format
const createJsonOutputTool = (
  responseFormat: ChatCompletionRequestBody['response_format'],
): AnthropicTool | null => {
  if (!responseFormat) return null;

  if (responseFormat.type === 'json_object') {
    // Simple JSON object - any valid JSON object
    // Use additionalProperties to allow any JSON structure
    return {
      name: '__json_output',
      description:
        'Output the response as a JSON object. This tool must be called with a valid JSON object. The entire input should be the JSON object you want to output.',
      input_schema: {
        type: 'object',
        additionalProperties: true,
      },
    };
  } else if (responseFormat.type === 'json_schema') {
    // Use the provided JSON schema
    const schema =
      responseFormat.json_schema?.schema ?? responseFormat.json_schema;
    if (!schema || typeof schema !== 'object') return null;

    // Convert the schema using comprehensive transformation
    const convertedSchema = convertJsonSchemaToAnthropicSchema(
      schema as Record<string, unknown>,
    );

    // Ensure we have at least a type field for the input schema
    const inputSchema = {
      type: (convertedSchema.type as string) || 'object',
      ...convertedSchema,
    };

    return {
      name: '__json_output',
      description:
        'Output the response as a JSON object matching the specified schema. This tool must be called with a valid JSON object that conforms to the schema.',
      input_schema: inputSchema,
    };
  }

  return null;
};

// Helper to get JSON mode system prompt instruction
const getJsonModeSystemPrompt = (
  responseFormat: ChatCompletionRequestBody['response_format'],
): string => {
  if (!responseFormat) return '';

  if (responseFormat.type === 'json_object') {
    return '\n\nIMPORTANT: You must respond by calling the __json_output tool with a valid JSON object. Do not include any text outside of the tool call.';
  } else if (responseFormat.type === 'json_schema') {
    return '\n\nIMPORTANT: You must respond by calling the __json_output tool with a JSON object that matches the specified schema. Do not include any text outside of the tool call.';
  }

  return '';
};

// Map model names with -latest suffix to valid versioned model names
// Anthropic API requires specific version dates, not -latest aliases
// Note: Model availability depends on API key permissions and account access
const mapModelNameToVersioned = (modelName: string): string => {
  // Map common -latest aliases to their most recent valid versions
  // Users may need to check their API key permissions if models are not found
  const modelMappings: Record<string, string> = {
    'claude-3-5-sonnet-latest': 'claude-3-5-sonnet-20241022', // October 2024 version
    'claude-3-opus-latest': 'claude-3-opus-20240229',
    'claude-3-haiku-latest': 'claude-3-haiku-20240307',
    'claude-3-sonnet-latest': 'claude-3-sonnet-20240229',
  };

  return modelMappings[modelName] || modelName;
};

export const anthropicChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    default: 'claude-2.1',
    required: true,
    transform: (raRequestBody: ChatCompletionRequestBody): string => {
      const modelName = raRequestBody.model || 'claude-2.1';
      return mapModelNameToVersioned(modelName);
    },
  },
  messages: [
    {
      param: 'messages',
      required: true,
      transform: (
        raRequestBody: ChatCompletionRequestBody,
      ): Record<string, unknown> => {
        const messages: AnthropicMessage[] = [];
        // Transform the chat messages into a simple prompt
        if (raRequestBody.messages) {
          raRequestBody.messages.forEach((msg: ChatCompletionMessage) => {
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
        raRequestBody: ChatCompletionRequestBody,
      ): Record<string, unknown>[] => {
        const systemMessages: AnthropicMessageContentItem[] = [];
        // Transform the chat messages into a simple prompt
        if (raRequestBody.messages) {
          raRequestBody.messages.forEach((msg: ChatCompletionMessage) => {
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

        // Append JSON mode instruction if response_format is specified
        const jsonModeInstruction = getJsonModeSystemPrompt(
          raRequestBody.response_format,
        );
        if (jsonModeInstruction) {
          // If there are existing system messages, append to the last one
          // Otherwise, create a new system message
          if (systemMessages.length > 0) {
            const lastMessage = systemMessages[systemMessages.length - 1];
            if (lastMessage.type === 'text' && 'text' in lastMessage) {
              lastMessage.text += jsonModeInstruction;
            } else {
              // If last message is not text, add a new text message
              systemMessages.push({
                text: jsonModeInstruction.trim(),
                type: 'text',
              });
            }
          } else {
            systemMessages.push({
              text: jsonModeInstruction.trim(),
              type: 'text',
            });
          }
        }

        return systemMessages as unknown as Record<string, unknown>[];
      },
    },
  ],
  tools: {
    param: 'tools',
    required: false,
    transform: (
      raRequestBody: ChatCompletionRequestBody,
    ): Record<string, unknown>[] => {
      const tools: AnthropicTool[] = [];
      if (raRequestBody.tools) {
        raRequestBody.tools.forEach((tool: ChatCompletionTool) => {
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

      // Add JSON output tool if response_format is specified
      const jsonOutputTool = createJsonOutputTool(
        raRequestBody.response_format,
      );
      if (jsonOutputTool) {
        tools.push(jsonOutputTool);
      }

      return tools as unknown as Record<string, unknown>[];
    },
  },
  // None is not supported by Anthropic, defaults to auto
  tool_choice: {
    param: 'tool_choice',
    required: false,
    transform: (
      raRequestBody: ChatCompletionRequestBody,
    ): { type: 'tool' | 'any' | 'auto'; name?: string } | null => {
      // If response_format is specified, require the JSON output tool
      // unless the user has explicitly set a different tool_choice
      if (raRequestBody.response_format && !raRequestBody.tool_choice) {
        return {
          type: 'tool',
          name: '__json_output',
        };
      }

      if (raRequestBody.tool_choice) {
        if (typeof raRequestBody.tool_choice === 'string') {
          if (raRequestBody.tool_choice === 'required') return { type: 'any' };
          else if (raRequestBody.tool_choice === 'auto')
            return { type: 'auto' };
        } else if (typeof raRequestBody.tool_choice === 'object') {
          return {
            type: 'tool',
            name: raRequestBody.tool_choice.function.name,
          };
        }
      }
      return null;
    },
  },
  max_tokens: {
    param: 'max_tokens',
    required: true,
    default: 4096,
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
      let jsonOutputExtracted = false;

      // Check for __json_output tool call first (for JSON mode)
      response.content.forEach((item) => {
        if (item.type === 'tool_use' && item.name === '__json_output') {
          // Extract JSON from the tool input
          // The tool input is the JSON object itself (for both json_object and json_schema)
          content = JSON.stringify(item.input);
          jsonOutputExtracted = true;
        }
      });

      // If no JSON output tool was found, collect text content as usual
      if (!jsonOutputExtracted) {
        response.content.forEach((item) => {
          if (item.type === 'text') {
            content += item.text;
          }
        });
      }

      const toolCalls: ChatCompletionToolCall[] = [];
      let jsonOutputToolInput: unknown;
      response.content.forEach((item) => {
        if (item.type === 'tool_use') {
          // Exclude __json_output tool call from tool_calls array
          // since it's used internally for JSON mode
          if (item.name !== '__json_output') {
            toolCalls.push({
              id: item.id,
              type: 'function',
              function: {
                name: item.name,
                arguments: JSON.stringify(item.input),
              },
            });
          } else {
            // Store the __json_output tool input for the parsed field
            jsonOutputToolInput = item.input;
          }
        }
      });

      // Build message object with optional fields
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic message construction requires flexibility
      const message: any = {
        role: ChatCompletionMessageRole.ASSISTANT,
        content,
      };

      if (!strictOpenAiCompliance) {
        message.content_blocks = response.content.filter(
          (item) => item.type !== 'tool_use',
        );
      }

      if (toolCalls.length) {
        message.tool_calls = toolCalls;
      }

      // Add parsed field when JSON output was extracted via tool
      // This is required for OpenAI SDK's .parse() method to work
      if (jsonOutputExtracted && jsonOutputToolInput !== undefined) {
        message.parsed = jsonOutputToolInput;
      }

      const responseObject: ChatCompletionResponseBody = {
        id: response.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.model,
        choices: [
          {
            message,
            index: 0,
            logprobs: null,
            finish_reason: mapStopReasonToFinishReason(response.stop_reason),
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
            finish_reason: parsedChunk.delta?.stop_reason
              ? mapStopReasonToFinishReason(parsedChunk.delta.stop_reason)
              : null,
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
    let isJsonOutputTool = false;
    const isToolBlockStart: boolean =
      parsedChunk.type === 'content_block_start' &&
      parsedChunk.content_block?.type === 'tool_use';
    if (isToolBlockStart) {
      streamState.toolIndex = streamState.toolIndex
        ? (streamState.toolIndex as number) + 1
        : 0;
      // Check if this is the __json_output tool
      if (parsedChunk.content_block?.name === '__json_output') {
        isJsonOutputTool = true;
        // Store in stream state to track JSON mode
        streamState.jsonOutputToolId = parsedChunk.content_block.id;
        streamState.jsonOutputToolIndex = streamState.toolIndex;
      }
    }
    const isToolBlockDelta: boolean =
      parsedChunk.type === 'content_block_delta' &&
      parsedChunk.delta?.partial_json !== undefined;

    // Check if we're streaming JSON output tool
    // Try to match by content_block id first, then by index
    if (isToolBlockDelta) {
      if (
        streamState.jsonOutputToolId &&
        parsedChunk.content_block?.id === streamState.jsonOutputToolId
      ) {
        isJsonOutputTool = true;
      } else if (
        streamState.jsonOutputToolIndex !== undefined &&
        parsedChunk.index === streamState.jsonOutputToolIndex
      ) {
        isJsonOutputTool = true;
      }
    }

    if (isToolBlockStart && parsedChunk.content_block) {
      // Only add to toolCalls if it's not __json_output
      if (parsedChunk.content_block.name !== '__json_output') {
        toolCalls.push({
          index: streamState.toolIndex,
          id: parsedChunk.content_block.id,
          type: 'function',
          function: {
            name: parsedChunk.content_block.name,
            arguments: '',
          },
        });
      }
    } else if (isToolBlockDelta && !isJsonOutputTool) {
      // Only add to toolCalls if it's not JSON output
      toolCalls.push({
        index: streamState.toolIndex,
        function: {
          arguments: parsedChunk.delta.partial_json,
        },
      });
    }

    // For JSON output tool, extract the partial JSON as content
    let content = parsedChunk.delta?.text;
    if (
      isJsonOutputTool &&
      isToolBlockDelta &&
      parsedChunk.delta?.partial_json
    ) {
      // Stream the partial JSON as content
      // The partial_json is already a string, so we can use it directly
      content = parsedChunk.delta.partial_json;
    }

    const contentBlockObject = {
      index: parsedChunk.index,
      delta: parsedChunk.delta ?? parsedChunk.content_block ?? {},
    };
    delete contentBlockObject.delta.type;

    const outputChunk = `data: ${JSON.stringify({
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
          finish_reason: parsedChunk.delta?.stop_reason
            ? mapStopReasonToFinishReason(parsedChunk.delta.stop_reason)
            : null,
        },
      ],
    })}\n\n`;

    return outputChunk;
  };
