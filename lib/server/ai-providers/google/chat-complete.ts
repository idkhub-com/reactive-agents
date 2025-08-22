import {
  type GoogleErrorResponse,
  type GoogleFileDataMessagePart,
  type GoogleFunctionCallMessagePart,
  type GoogleFunctionResponseMessagePart,
  type GoogleInlineDataMessagePart,
  type GoogleMessage,
  GoogleMessageRole,
  type GoogleResponseCandidate,
  type GoogleTool,
  GoogleToolChoiceType,
  type GoogleToolConfig,
} from '@server/ai-providers/google/types';
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
  ChatCompletionToolCall,
  ChatCompletionToolChoice,
  ChatCompletionToolFunction,
} from '@shared/types/api/routes/shared/tools';
import { AIProvider } from '@shared/types/constants';
import { buildGoogleSearchRetrievalTool } from '../google-vertex-ai/chat-complete';
import {
  derefer,
  getMimeType,
  recursivelyDeleteUnsupportedParameters,
  transformVertexLogprobs,
} from '../google-vertex-ai/utils';

const googleTransformGenerationConfig = (
  idkRequestBody: ChatCompletionRequestBody,
): Record<string, unknown> => {
  const generationConfig: Record<string, unknown> = {};
  if (idkRequestBody.temperature) {
    generationConfig.temperature = idkRequestBody.temperature;
  }
  if (idkRequestBody.top_p) {
    generationConfig.topP = idkRequestBody.top_p;
  }
  if (idkRequestBody.max_tokens) {
    generationConfig.maxOutputTokens = idkRequestBody.max_tokens;
  }
  if (idkRequestBody.max_completion_tokens) {
    generationConfig.maxOutputTokens = idkRequestBody.max_completion_tokens;
  }
  if (idkRequestBody.stop) {
    generationConfig.stopSequences = idkRequestBody.stop;
  }
  if (idkRequestBody?.response_format?.type === 'json_object') {
    generationConfig.responseMimeType = 'application/json';
  }
  if (idkRequestBody.logprobs) {
    generationConfig.responseLogprobs = idkRequestBody.logprobs;
  }
  if (idkRequestBody.top_logprobs) {
    generationConfig.logprobs = idkRequestBody.top_logprobs; // range 1-5, openai supports 1-20
  }
  if (idkRequestBody?.response_format?.type === 'json_schema') {
    generationConfig.responseMimeType = 'application/json';
    recursivelyDeleteUnsupportedParameters(
      idkRequestBody?.response_format?.json_schema?.schema,
    );
    let schema =
      idkRequestBody?.response_format?.json_schema?.schema ??
      idkRequestBody?.response_format?.json_schema;
    if (Object.keys(schema).includes('$defs')) {
      schema = derefer(schema);
      delete schema.$defs;
    }
    generationConfig.responseSchema = schema;
  }
  if (idkRequestBody?.thinking) {
    const thinkingConfig: Record<string, unknown> = {};
    thinkingConfig.include_thoughts = true;
    thinkingConfig.thinking_budget = idkRequestBody.thinking.budget_tokens;
    generationConfig.thinking_config = thinkingConfig;
  }
  return generationConfig;
};

// models for which systemInstruction is not supported
export const SYSTEM_INSTRUCTION_DISABLED_MODELS = [
  'gemini-1.0-pro',
  'gemini-1.0-pro-001',
  'gemini-1.0-pro-latest',
  'gemini-1.0-pro-vision-latest',
  'gemini-pro',
  'gemini-pro-vision',
];

export const transformOpenAIRoleToGoogleRole = (
  role: ChatCompletionMessageRole,
): GoogleMessageRole => {
  switch (role) {
    case ChatCompletionMessageRole.ASSISTANT:
      return GoogleMessageRole.MODEL;
    case ChatCompletionMessageRole.DEVELOPER:
      return GoogleMessageRole.SYSTEM;
    case ChatCompletionMessageRole.SYSTEM:
      return GoogleMessageRole.SYSTEM;
    case ChatCompletionMessageRole.TOOL:
      return GoogleMessageRole.FUNCTION;
    case ChatCompletionMessageRole.FUNCTION:
      return GoogleMessageRole.FUNCTION;
    case ChatCompletionMessageRole.USER:
      return GoogleMessageRole.USER;
  }
};

export const transformToolChoiceForGemini = (
  tool_choice: ChatCompletionToolChoice,
): GoogleToolChoiceType | undefined => {
  if (typeof tool_choice === 'object' && tool_choice.type === 'function')
    return GoogleToolChoiceType.ANY;
  if (typeof tool_choice === 'string') {
    switch (tool_choice) {
      case 'auto':
        return GoogleToolChoiceType.AUTO;
      case 'none':
        return GoogleToolChoiceType.NONE;
      case 'required':
        return GoogleToolChoiceType.ANY;
    }
  }
  return undefined;
};

// TODOS: this configuration does not enforce the maximum token limit for the input parameter. If you want to enforce this, you might need to add a custom validation function or a max property to the ParameterConfig interface, and then use it in the input configuration. However, this might be complex because the token count is not a simple length check, but depends on the specific tokenization method used by the model.

export const googleChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'gemini-1.5-pro',
  },
  messages: [
    {
      param: 'contents',
      default: '',
      transform: (
        idkRequestBody: ChatCompletionRequestBody,
      ): GoogleMessage[] => {
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

          const role = transformOpenAIRoleToGoogleRole(message.role);
          const parts: (
            | GoogleFunctionCallMessagePart
            | GoogleFunctionResponseMessagePart
            | GoogleInlineDataMessagePart
            | GoogleFileDataMessagePart
            | { text: string }
          )[] = [];

          if (
            message.role === ChatCompletionMessageRole.ASSISTANT &&
            message.tool_calls
          ) {
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
                if (!url) return;

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
                } else if (
                  url.startsWith('gs://') ||
                  url.startsWith('https://') ||
                  url.startsWith('http://')
                ) {
                  parts.push({
                    fileData: {
                      mimeType: passedMimeType || getMimeType(url) || '',
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
        return messages;
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
          return {
            parts: [
              {
                text: firstMessage.content,
              },
            ],
            role: GoogleMessageRole.SYSTEM,
          };
        }

        if (
          ChatCompletionSystemMessageRoles.includes(firstMessage.role) &&
          typeof firstMessage.content === 'object' &&
          firstMessage.content?.[0]?.text
        ) {
          return {
            parts: [
              {
                text: firstMessage.content?.[0].text,
              },
            ],
            role: GoogleMessageRole.SYSTEM,
          };
        }

        return;
      },
    },
  ],
  temperature: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  top_p: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  top_k: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  max_tokens: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  max_completion_tokens: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  stop: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  response_format: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  logprobs: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  top_logprobs: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
  tools: {
    param: 'tools',
    default: '',
    transform: (
      idkRequestBody: ChatCompletionRequestBody,
    ): GoogleTool[] | undefined => {
      const functionDeclarations: ChatCompletionToolFunction[] = [];
      const tools: GoogleTool[] = [];
      idkRequestBody.tools?.forEach((tool) => {
        if (tool.type === 'function') {
          // these are not supported by google
          recursivelyDeleteUnsupportedParameters(
            tool.function?.parameters ?? {},
          );
          delete tool.function?.strict;

          if (['googleSearch', 'google_search'].includes(tool.function.name)) {
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
      });
      if (functionDeclarations.length) {
        tools.push({ functionDeclarations });
      }
      return tools;
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
            mode: transformToolChoiceForGemini(idkRequestBody.tool_choice),
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
  thinking: {
    param: 'generationConfig',
    transform: (idkRequestBody: ChatCompletionRequestBody) =>
      googleTransformGenerationConfig(idkRequestBody),
  },
};

interface GoogleGenerateContentResponse {
  modelVersion: string;
  candidates: GoogleResponseCandidate[];
  promptFeedback: {
    safetyRatings: {
      category: string;
      probability: string;
    }[];
  };
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export const googleErrorResponseTransform = (
  aiProviderResponseBody: Record<string, unknown>,
  provider?: AIProvider,
): ErrorResponseBody => {
  if ('error' in aiProviderResponseBody) {
    const errorResponse =
      aiProviderResponseBody as unknown as GoogleErrorResponse;
    return generateErrorResponse(
      {
        message: errorResponse.error.message ?? '',
        type: errorResponse.error.status ?? null,
        code: errorResponse.error.code ?? null,
      },
      provider ?? AIProvider.GOOGLE,
    );
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody as unknown as Record<string, unknown>,
    AIProvider.GOOGLE,
  );
};

export const googleChatCompleteResponseTransform: ResponseTransformFunction = (
  aiProviderResponseBody,
  aiProviderResponseStatus,
  _responseHeaders,
  strictOpenAiCompliance,
) => {
  if (aiProviderResponseStatus !== 200) {
    const errorResponse = googleErrorResponseTransform(aiProviderResponseBody);
    if (errorResponse) return errorResponse;
  }

  if ('candidates' in aiProviderResponseBody) {
    const googleResponse =
      aiProviderResponseBody as unknown as GoogleGenerateContentResponse;
    return {
      id: `portkey-${crypto.randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: googleResponse.modelVersion,
      provider: 'google',
      choices:
        googleResponse.candidates?.map((generation, idx) => {
          // transform tool calls and content by iterating over the content parts
          const toolCalls: ChatCompletionToolCall[] = [];
          let content = '';
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
            ...{ tool_calls: toolCalls },
            ...{ content },
          };
          const logprobsContent: ChatCompletionTokenLogprob[] | null =
            transformVertexLogprobs(generation);
          let logprobs: ChatCompletionChoiceLogprobs | undefined;
          if (logprobsContent) {
            logprobs = {
              content: logprobsContent,
            };
          }
          const choice: ChatCompletionChoice = {
            message: message,
            logprobs,
            index: generation.index ?? idx,
            finish_reason:
              generation.finishReason as ChatCompletionFinishReason,
            ...(!strictOpenAiCompliance && generation.groundingMetadata
              ? { groundingMetadata: generation.groundingMetadata }
              : {}),
          };
          return choice;
        }) ?? [],
      usage: {
        prompt_tokens: googleResponse.usageMetadata.promptTokenCount,
        completion_tokens: googleResponse.usageMetadata.candidatesTokenCount,
        total_tokens: googleResponse.usageMetadata.totalTokenCount,
      },
    };
  }

  return generateInvalidProviderResponseError(
    aiProviderResponseBody,
    AIProvider.GOOGLE,
  );
};

export const googleChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (responseChunk, fallbackId, streamState, strictOpenAiCompliance) => {
    streamState.containsChainOfThoughtMessage =
      streamState?.containsChainOfThoughtMessage ?? false;
    let chunk = responseChunk.trim();
    if (chunk.startsWith('[')) {
      chunk = chunk.slice(1);
    }

    if (chunk.endsWith(',')) {
      chunk = chunk.slice(0, chunk.length - 1);
    }
    if (chunk.endsWith(']')) {
      chunk = chunk.slice(0, chunk.length - 2);
    }
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
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

    return `data: ${JSON.stringify({
      id: fallbackId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: parsedChunk.modelVersion,
      provider: 'google',
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
          } else if (generation.content.parts[0]?.functionCall) {
            message = {
              role: ChatCompletionMessageRole.ASSISTANT,
              tool_calls: generation.content.parts.map((part, idx) => {
                if (part.functionCall) {
                  return {
                    index: idx,
                    id: `portkey-${crypto.randomUUID()}`,
                    type: 'function',
                    function: {
                      name: part.functionCall.name,
                      arguments: JSON.stringify(part.functionCall.args),
                    },
                  };
                }
              }),
              content: '',
            };
          }
          return {
            delta: message,
            index: generation.index ?? index,
            finish_reason: generation.finishReason,
            ...(!strictOpenAiCompliance && generation.groundingMetadata
              ? { groundingMetadata: generation.groundingMetadata }
              : {}),
          };
        }) ?? [],
      ...(parsedChunk.usageMetadata?.candidatesTokenCount && {
        usage: usageMetadata,
      }),
    })}\n\n`;
  };
