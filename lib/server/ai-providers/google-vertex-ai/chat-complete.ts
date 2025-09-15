// Docs for REST API
// https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/send-multimodal-prompts#gemini-send-multimodal-samples-drest

import {
  type AnthropicChatCompleteResponse,
  type AnthropicChatCompleteStreamResponse,
  anthropicChatCompleteConfig,
} from '@server/ai-providers/anthropic/chat-complete';
import type { AnthropicErrorResponse } from '@server/ai-providers/anthropic/types';
import {
  type GoogleErrorResponse,
  type GoogleGenerateContentResponse,
  type GoogleMessage,
  type GoogleMessagePart,
  GoogleMessageRole,
  type GoogleResponseCandidate,
  type GoogleSearchRetrievalTool,
  type GoogleTool,
  type GoogleToolConfig,
} from '@server/ai-providers/google/types';
import type { VertexLlamaChatCompleteStreamChunk } from '@server/ai-providers/google-vertex-ai/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseChunkStreamTransformFunction,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type {
  ChatCompletionChoice,
  ChatCompletionChoiceLogprobs,
  ChatCompletionFinishReason,
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
  ChatCompletionTokenLogprob,
  ChatCompletionUsage,
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
  ChatCompletionToolFunction,
} from '@shared/types/api/routes/shared/tools';
import { AIProvider } from '@shared/types/constants';
import { SYSTEM_INSTRUCTION_DISABLED_MODELS } from '../google/chat-complete';
import {
  RoleIdkToGemini,
  transformToolChoiceIdkToGemini,
} from '../google/utils';
import { vertexTransformGenerationConfig } from './transform-generation-config';
import {
  getMimeType,
  recursivelyDeleteUnsupportedParameters,
  transformVertexLogprobs,
} from './utils';

export function buildGoogleSearchRetrievalTool(
  tool: ChatCompletionTool,
): GoogleSearchRetrievalTool {
  const googleSearchRetrievalTool: GoogleSearchRetrievalTool = {
    googleSearchRetrieval: {},
  };
  if (tool.function.parameters?.dynamicRetrievalConfig) {
    googleSearchRetrievalTool.googleSearchRetrieval.dynamicRetrievalConfig =
      tool.function.parameters
        .dynamicRetrievalConfig as GoogleSearchRetrievalTool['googleSearchRetrieval']['dynamicRetrievalConfig'];
  }
  return googleSearchRetrievalTool;
}

export const vertexGoogleChatCompleteConfig: AIProviderFunctionConfig = {
  // https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versioning#gemini-model-versions
  model: {
    param: 'model',
    required: true,
    default: 'gemini-1.0-pro',
  },
  messages: [
    {
      param: 'contents',
      default: '',
      transform: (
        idkRequestBody: ChatCompletionRequestBody,
      ): Record<string, unknown> => {
        let lastRole: GoogleMessageRole | undefined;
        const messages: GoogleMessage[] = [];

        idkRequestBody.messages?.forEach((message: ChatCompletionMessage) => {
          // From gemini-1.5 onwards, systemInstruction is supported
          // Skipping system message and sending it in systemInstruction for gemini 1.5 models
          if (
            ChatCompletionSystemMessageRoles.includes(message.role) &&
            !SYSTEM_INSTRUCTION_DISABLED_MODELS.includes(
              idkRequestBody.model as string,
            )
          )
            return;

          const role = RoleIdkToGemini[message.role];
          const parts: GoogleMessagePart[] = [];

          if (message.role === 'assistant' && message.tool_calls) {
            message.tool_calls.forEach((tool_call: ChatCompletionToolCall) => {
              parts.push({
                functionCall: {
                  name: tool_call.function.name,
                  args: JSON.parse(tool_call.function.arguments),
                },
              });
            });
          } else if (
            message.role === 'tool' &&
            typeof message.content === 'string'
          ) {
            parts.push({
              functionResponse: {
                name: message.name ?? 'gateway-tool-filler-name',
                response: {
                  content: message.content,
                },
              },
            });
          } else if (message.content && typeof message.content === 'object') {
            message.content.forEach((c: ChatCompletionContentType) => {
              if (c.type === 'text') {
                parts.push({
                  text: c.text || '',
                });
              }
              if (c.type === 'image_url') {
                const { url, mime_type: passedMimeType } = c.image_url || {};

                if (!url) {
                  // Shouldn't throw error?
                  return;
                }

                // Example: data:image/png;base64,abcdefg...
                if (url.startsWith('data:')) {
                  const [mimeTypeWithPrefix, base64Image] =
                    url.split(';base64,');
                  const mimeType = mimeTypeWithPrefix.split(':')[1];

                  parts.push({
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Image,
                    },
                  });

                  return;
                } else if (
                  url.startsWith('gs://') ||
                  url.startsWith('https://') ||
                  url.startsWith('http://')
                ) {
                  parts.push({
                    fileData: {
                      mimeType:
                        passedMimeType || getMimeType(url) || 'image/jpeg',
                      fileUri: url,
                    },
                  });
                } else {
                  // NOTE: This block is kept to maintain backward compatibility
                  // Earlier we were assuming that all images will be base64 with image/jpeg mimeType
                  parts.push({
                    inlineData: {
                      mimeType: 'image/jpeg',
                      data: c.image_url?.url || '',
                    },
                  });
                }
              }
            });
          } else if (typeof message.content === 'string') {
            parts.push({
              text: message.content,
            });
          }

          // @NOTE: This takes care of the "Please ensure that multiturn requests alternate between user and model."
          // error that occurs when we have multiple user messages in a row.
          const shouldCombineMessages =
            lastRole === role && !idkRequestBody.model?.includes('vision');

          if (shouldCombineMessages) {
            messages[messages.length - 1].parts.push(...parts);
          } else {
            messages.push({ role, parts });
          }

          lastRole = role;
        });

        return messages as unknown as Record<string, unknown>;
      },
    },
    {
      param: 'systemInstruction',
      default: '',
      transform: (
        idkRequestBody: ChatCompletionRequestBody,
      ): GoogleMessage | undefined => {
        // systemInstruction is only supported from gemini 1.5 models
        if (
          SYSTEM_INSTRUCTION_DISABLED_MODELS.includes(
            idkRequestBody.model as string,
          )
        )
          return;
        const firstMessage = idkRequestBody.messages?.[0] || null;
        if (!firstMessage) return;

        if (
          ChatCompletionSystemMessageRoles.includes(firstMessage.role) &&
          typeof firstMessage.content === 'string'
        ) {
          const message: GoogleMessage = {
            parts: [
              {
                text: firstMessage.content,
              },
            ],
            role: GoogleMessageRole.SYSTEM,
          };
          return message;
        }

        if (
          ChatCompletionSystemMessageRoles.includes(firstMessage.role) &&
          typeof firstMessage.content === 'object' &&
          firstMessage.content?.[0]?.text
        ) {
          const message: GoogleMessage = {
            parts: [
              {
                text: firstMessage.content?.[0].text,
              },
            ],
            role: GoogleMessageRole.SYSTEM,
          };
          return message;
        }

        return;
      },
    },
  ],
  temperature: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  top_p: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  top_k: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  max_tokens: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  max_completion_tokens: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  stop: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  response_format: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  logprobs: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  top_logprobs: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
  // https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/configure-safety-attributes
  // Example payload to be included in the request that sets the safety settings:
  //   "safety_settings": [
  //     {
  //         "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
  //         "threshold": "BLOCK_NONE"
  //     },
  //     {
  //         "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
  //         "threshold": "BLOCK_ONLY_HIGH"
  //     }
  // ]
  safety_settings: {
    param: 'safety_settings',
  },
  tools: {
    param: 'tools',
    default: '',
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      const functionDeclarations: ChatCompletionToolFunction[] = [];
      const tools: GoogleTool[] = [];
      (idkRequestBody as ChatCompletionRequestBody).tools?.forEach(
        (tool: ChatCompletionTool) => {
          if (tool.type === 'function') {
            // these are not supported by google
            recursivelyDeleteUnsupportedParameters(
              tool.function?.parameters ?? {},
            );
            delete tool.function?.strict;

            if (
              ['googleSearch', 'google_search'].includes(tool.function.name)
            ) {
              tools.push({ googleSearch: {} });
            } else if (
              ['googleSearchRetrieval', 'google_search_retrieval'].includes(
                tool.function.name,
              )
            ) {
              tools.push(buildGoogleSearchRetrievalTool(tool));
            } else {
              functionDeclarations.push(tool.function);
            }
          }
        },
      );
      if (functionDeclarations.length) {
        tools.push({ functionDeclarations });
      }
      return tools as unknown as Record<string, unknown>;
    },
  },
  tool_choice: {
    param: 'tool_config',
    default: '',
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      if (idkRequestBody.tool_choice) {
        const allowedFunctionNames: string[] = [];
        if (
          typeof idkRequestBody.tool_choice === 'object' &&
          idkRequestBody.tool_choice.type === 'function'
        ) {
          allowedFunctionNames.push(idkRequestBody.tool_choice.function.name);
        }
        const toolConfig: GoogleToolConfig = {
          function_calling_config: {
            mode: transformToolChoiceIdkToGemini(idkRequestBody.tool_choice),
          },
        };
        if (allowedFunctionNames.length > 0) {
          toolConfig.function_calling_config.allowed_function_names =
            allowedFunctionNames;
        }
        return toolConfig;
      }
    },
  },
  labels: {
    param: 'labels',
  },
  thinking: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      vertexTransformGenerationConfig(idkRequestBody),
  },
};

interface AnthorpicTextContentItem {
  type: 'text';
  text: string;
}

interface AnthropicThinkingContentItem {
  type: 'thinking';
  thinking: string;
  signature: string;
}

interface AnthropicToolContentItem {
  type: 'tool_use';
  name: string;
  id: string;
  input: Record<string, unknown>;
}

type AnthropicContentItem =
  | AnthorpicTextContentItem
  | AnthropicThinkingContentItem
  | AnthropicToolContentItem;

export const vertexAnthropicChatCompleteConfig: AIProviderFunctionConfig = {
  ...anthropicChatCompleteConfig,
  anthropic_version: {
    param: 'anthropic_version',
    required: true,
    default: 'vertex-2023-10-16',
  },
  model: {
    param: 'model',
    required: false,
  },
};

export const vertexGoogleChatCompleteResponseTransform: ResponseTransformFunction =
  (
    response,
    responseStatus,
    _responseHeaders,
    strictOpenAiCompliance,
  ): ChatCompletionResponseBody | ErrorResponseBody => {
    // when error occurs on streaming request, the response is an array of errors.
    if (
      responseStatus !== 200 &&
      Array.isArray(response) &&
      response.length > 0 &&
      'error' in response[0]
    ) {
      const { error } = response[0];

      return generateErrorResponse(
        {
          message: error.message,
          type: error.status,
          code: String(error.code),
        },
        AIProvider.GOOGLE_VERTEX_AI,
      );
    }

    if (responseStatus !== 200 && 'error' in response) {
      const { error } = response as unknown as GoogleErrorResponse;
      return generateErrorResponse(
        {
          message: error.message,
          type: error.status,
          code: String(error.code),
        },
        AIProvider.GOOGLE_VERTEX_AI,
      );
    }

    if ('candidates' in response) {
      const {
        promptTokenCount = 0,
        candidatesTokenCount = 0,
        totalTokenCount = 0,
      } = response.usageMetadata as Record<string, unknown>;

      const chatCompletionResponse: ChatCompletionResponseBody = {
        id: `portkey-${crypto.randomUUID()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.modelVersion as string,
        choices:
          (response.candidates as unknown as GoogleResponseCandidate[])?.map(
            (generation, index) => {
              // transform tool calls and content by iterating over the content parts
              const toolCalls: ChatCompletionToolCall[] = [];
              let content: string | undefined;
              for (const part of generation.content?.parts ?? []) {
                if (part.functionCall) {
                  toolCalls.push({
                    id: `portkey-${crypto.randomUUID()}`,
                    type: 'function',
                    function: {
                      name: part.functionCall.name,
                      arguments: JSON.stringify(part.functionCall.args),
                    },
                  });
                } else if (part.text) {
                  // if content is already set to the chain of thought message and the user requires both the CoT message and the completion, we need to append the completion to the CoT message
                  if (content?.length && !strictOpenAiCompliance) {
                    content += `\r\n\r\n${part.text}`;
                  } else {
                    // if content is already set to CoT, but user requires only the completion, we need to set content to the completion
                    content = part.text;
                  }
                }
              }

              const message: ChatCompletionMessage = {
                role: ChatCompletionMessageRole.ASSISTANT,
                ...(toolCalls.length && { tool_calls: toolCalls }),
                content: content ?? '',
              };
              const logprobsContent: ChatCompletionTokenLogprob[] | null =
                transformVertexLogprobs(generation);
              let logprobs: ChatCompletionChoiceLogprobs | undefined;
              if (logprobsContent) {
                logprobs = {
                  content: logprobsContent,
                };
              }

              const chatCompletionChoice: ChatCompletionChoice = {
                message: message,
                index: index,
                finish_reason:
                  generation.finishReason as ChatCompletionFinishReason,
                logprobs,
                ...(!strictOpenAiCompliance && {
                  safetyRatings: generation.safetyRatings,
                }),
                ...(!strictOpenAiCompliance && generation.groundingMetadata
                  ? { groundingMetadata: generation.groundingMetadata }
                  : {}),
              };
              return chatCompletionChoice;
            },
          ) ?? [],
        usage: {
          prompt_tokens: promptTokenCount as number,
          completion_tokens: candidatesTokenCount as number,
          total_tokens: totalTokenCount as number,
        },
      };
      return chatCompletionResponse;
    }

    return generateInvalidProviderResponseError(
      response as unknown as Record<string, unknown>,
      AIProvider.GOOGLE_VERTEX_AI,
    );
  };

export const vertexLlamaChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'meta/llama-3.1-405b-instruct-maas',
    transform: (idkRequestBody: ChatCompletionRequestBody) => {
      return (
        idkRequestBody.model?.replace('meta.', 'meta/') ||
        'meta/llama-3.1-405b-instruct-maas'
      );
    },
  },
  messages: {
    param: 'messages',
    required: true,
    default: [],
  },
  max_tokens: {
    param: 'max_tokens',
    default: 512,
    min: 1,
    max: 2048,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    default: 512,
    min: 1,
    max: 2048,
  },
  temperature: {
    param: 'temperature',
    default: 0.5,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'top_p',
    default: 0.9,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'top_k',
    default: 0,
    min: 0,
    max: 2048,
  },
  stream: {
    param: 'stream',
    default: false,
  },
};

export const vertexGoogleChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk: string,
    fallbackId: string,
    streamState: Record<string, unknown>,
    strictOpenAiCompliance: boolean,
  ): string => {
    streamState.containsChainOfThoughtMessage =
      streamState?.containsChainOfThoughtMessage ?? false;
    const chunk = responseChunk
      .trim()
      .replace(/^data: /, '')
      .trim();

    if (chunk === '[DONE]') {
      return `data: ${chunk}\n\n`;
    }

    const parsedChunk: GoogleGenerateContentResponse = JSON.parse(chunk);

    let usageMetadata: ChatCompletionUsage | undefined;
    if (parsedChunk.usageMetadata) {
      usageMetadata = {
        prompt_tokens: parsedChunk.usageMetadata.promptTokenCount,
        completion_tokens: parsedChunk.usageMetadata.candidatesTokenCount,
        total_tokens: parsedChunk.usageMetadata.totalTokenCount,
      };
    }

    const dataChunk = {
      id: fallbackId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: parsedChunk.modelVersion,
      provider: AIProvider.GOOGLE_VERTEX_AI,
      choices:
        parsedChunk.candidates?.map((generation, index) => {
          let message: ChatCompletionMessage = {
            role: ChatCompletionMessageRole.ASSISTANT,
            content: '',
          };
          if (generation.content?.parts[0]?.text) {
            if (generation.content.parts[0].thought)
              streamState.containsChainOfThoughtMessage = true;

            let content: string =
              strictOpenAiCompliance &&
              streamState.containsChainOfThoughtMessage
                ? ''
                : generation.content.parts[0]?.text;
            if (generation.content.parts[1]?.text) {
              if (strictOpenAiCompliance)
                content = generation.content.parts[1].text;
              else content += `\r\n\r\n${generation.content.parts[1]?.text}`;
              streamState.containsChainOfThoughtMessage = false;
            } else if (
              streamState.containsChainOfThoughtMessage &&
              !generation.content.parts[0]?.thought
            ) {
              if (strictOpenAiCompliance)
                content = generation.content.parts[0].text;
              else content = `\r\n\r\n${content}`;
              streamState.containsChainOfThoughtMessage = false;
            }
            message = {
              role: ChatCompletionMessageRole.ASSISTANT,
              content,
            };
          } else if (generation.content?.parts[0]?.functionCall) {
            message = {
              role: ChatCompletionMessageRole.ASSISTANT,
              tool_calls: generation.content.parts.map((part, idx) => {
                if (part.functionCall) {
                  return {
                    index: idx,
                    id: `idk-${crypto.randomUUID()}`,
                    type: 'function',
                    function: {
                      name: part.functionCall.name,
                      arguments: JSON.stringify(part.functionCall.args),
                    },
                  };
                }
                return undefined;
              }),
              content: '',
            };
          }
          return {
            delta: message,
            index: index,
            finish_reason: generation.finishReason,
            ...(!strictOpenAiCompliance && {
              safetyRatings: generation.safetyRatings,
            }),
            ...(!strictOpenAiCompliance && generation.groundingMetadata
              ? { groundingMetadata: generation.groundingMetadata }
              : {}),
          };
        }) ?? [],
      ...(parsedChunk.usageMetadata?.candidatesTokenCount && {
        usage: usageMetadata,
      }),
    };

    return `data: ${JSON.stringify(dataChunk)}\n\n`;
  };

export function AnthropicErrorResponseTransform(
  response: AnthropicErrorResponse,
): ErrorResponseBody | undefined {
  if ('error' in response) {
    return generateErrorResponse(
      {
        message: response.error?.message,
        type: response.error?.type,
      },
      AIProvider.GOOGLE_VERTEX_AI,
    );
  }

  return undefined;
}

export const vertexAnthropicChatCompleteResponseTransform: ResponseTransformFunction =
  (response, responseStatus, _responseHeaders, strictOpenAiCompliance) => {
    const anthropicResponse = response as unknown as
      | AnthropicChatCompleteResponse
      | AnthropicErrorResponse;
    if (responseStatus !== 200) {
      const errorResponse = AnthropicErrorResponseTransform(
        anthropicResponse as AnthropicErrorResponse,
      );
      if (errorResponse) {
        return errorResponse;
      }
    }

    if ('content' in anthropicResponse) {
      const { input_tokens = 0, output_tokens = 0 } = anthropicResponse.usage;

      let content: AnthropicContentItem[] | string = strictOpenAiCompliance
        ? ''
        : [];
      anthropicResponse.content.forEach((item) => {
        if (!strictOpenAiCompliance && Array.isArray(content)) {
          if (['text', 'thinking'].includes(item.type)) {
            content.push(item);
          }
        } else {
          if (item.type === 'text') {
            content += item.text;
          }
        }
      });

      const toolCalls: ChatCompletionToolCall[] = [];
      anthropicResponse.content.forEach((item) => {
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

      const chatCompletionResponse: ChatCompletionResponseBody = {
        id: anthropicResponse.id,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: anthropicResponse.model,
        choices: [
          {
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content,
              tool_calls: toolCalls.length ? toolCalls : undefined,
            },
            index: 0,
            logprobs: null,
            finish_reason: anthropicResponse.stop_reason,
          },
        ],
        usage: {
          prompt_tokens: input_tokens,
          completion_tokens: output_tokens,
          total_tokens: input_tokens + output_tokens,
        },
      };

      return chatCompletionResponse;
    }

    return generateInvalidProviderResponseError(
      response,
      AIProvider.GOOGLE_VERTEX_AI,
    );
  };

export const vertexAnthropicChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk, fallbackId, streamState, strictOpenAiCompliance) => {
    let chunk = responseChunk.trim();

    if (
      chunk.startsWith('event: ping') ||
      chunk.startsWith('event: content_block_stop') ||
      chunk.startsWith('event: vertex_event')
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
          provider: AIProvider.GOOGLE_VERTEX_AI,
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

    if (parsedChunk.type === 'message_start' && parsedChunk.message?.usage) {
      streamState.model = parsedChunk?.message?.model ?? '';
      return `data: ${JSON.stringify({
        id: fallbackId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: streamState.model,
        provider: AIProvider.GOOGLE_VERTEX_AI,
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
        usage: {
          prompt_tokens: parsedChunk.message?.usage?.input_tokens,
        },
      })}\n\n`;
    }

    if (parsedChunk.type === 'message_delta' && parsedChunk.usage) {
      return `data: ${JSON.stringify({
        id: fallbackId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: streamState.model,
        provider: AIProvider.GOOGLE_VERTEX_AI,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: parsedChunk.delta?.stop_reason,
          },
        ],
        usage: {
          completion_tokens: parsedChunk.usage?.output_tokens,
        },
      })}\n\n`;
    }

    const toolCalls = [];
    const isToolBlockStart: boolean =
      parsedChunk.type === 'content_block_start' &&
      parsedChunk.content_block?.type === 'tool_use';
    if (isToolBlockStart) {
      streamState.toolIndex = (streamState.toolIndex as number) + 1;
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
      provider: AIProvider.GOOGLE_VERTEX_AI,
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

export const vertexLlamaChatCompleteResponseTransform: ResponseTransformFunction =
  (response, responseStatus) => {
    if (
      responseStatus !== 200 &&
      Array.isArray(response) &&
      response.length > 0 &&
      'error' in response[0]
    ) {
      const { error } = response[0];

      return generateErrorResponse(
        {
          message: error.message,
          type: error.status,
          code: String(error.code),
        },
        AIProvider.GOOGLE_VERTEX_AI,
      );
    }
    if ('choices' in response) {
      const chatCompletionResponse = {
        id: crypto.randomUUID(),
        created: Math.floor(Date.now() / 1000),
        ...response,
      } as ChatCompletionResponseBody;
      return chatCompletionResponse;
    }
    return generateInvalidProviderResponseError(
      response,
      AIProvider.GOOGLE_VERTEX_AI,
    );
  };

export function vertexLlamaChatCompleteStreamChunkTransform(
  responseChunk: string,
  fallbackId: string,
): string {
  let chunk = responseChunk.trim();
  chunk = chunk.replace(/^data: /, '');
  chunk = chunk.trim();
  const parsedChunk: VertexLlamaChatCompleteStreamChunk = JSON.parse(chunk);
  parsedChunk.id = fallbackId;
  parsedChunk.created = Math.floor(Date.now() / 1000);
  parsedChunk.provider = AIProvider.GOOGLE_VERTEX_AI;
  return `data: ${JSON.stringify(parsedChunk)}\n\n`;
}
