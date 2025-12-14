import type {
  BedrockAI21CompleteResponse,
  BedrockChatCompleteStreamChunk,
  BedrockChatCompletionResponse,
  BedrockChatCompletionsParams,
  BedrockCohereCompleteResponse,
  BedrockCohereStreamChunk,
  BedrockContentItem,
  BedrockConverseAI21ChatCompletionsParams,
  BedrockConverseAnthropicChatCompletionsParams,
  BedrockConverseCohereChatCompletionsParams,
  StreamContentBlock,
} from '@server/ai-providers/bedrock/types';
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
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import {
  type ChatCompletionChoice,
  ChatCompletionFinishReason,
  type ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api/response';
import {
  type ChatCompletionContentType,
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
  ChatCompletionSystemMessageRoles,
} from '@shared/types/api/routes/shared/messages';
import type { ChatCompletionToolCall } from '@shared/types/api/routes/shared/tools';
import {
  AIProvider,
  documentMimeTypes,
  fileExtensionMimeTypeMap,
  imagesMimeTypes,
} from '@shared/types/constants';
import {
  transformAdditionalModelRequestFields,
  transformAI21AdditionalModelRequestFields,
  transformAnthropicAdditionalModelRequestFields,
  transformCohereAdditionalModelRequestFields,
  transformInferenceConfig,
} from './utils';

const getMessageTextContentArray = (
  message: ChatCompletionMessage,
): Array<{ text: string } | { cachePoint: { type: string } }> => {
  if (message.content && typeof message.content === 'object') {
    const filteredContentMessages = message.content.filter(
      (item) => item.type === 'text',
    );
    const finalContent: Array<
      { text: string } | { cachePoint: { type: string } }
    > = [];
    filteredContentMessages.forEach((item) => {
      finalContent.push({
        text: item.text || '',
      });
      // push a cache point.
      if (item.cache_control) {
        finalContent.push({
          cachePoint: {
            type: 'default',
          },
        });
      }
    });
    return finalContent;
  }
  return [
    {
      text: message.content || '',
    },
  ];
};

const transformAndAppendThinkingMessageItem = (
  item: ChatCompletionContentType,
  out: unknown[],
): void => {
  if (item.type === 'thinking') {
    out.push({
      reasoningContent: {
        reasoningText: {
          signature: item.signature,
          text: item.thinking,
        },
      },
    });
  } else if (item.type === 'redacted_thinking') {
    out.push({
      reasoningContent: {
        redactedContent: item.data,
      },
    });
  }
};

const getMessageContent = (
  message: ChatCompletionMessage,
): BedrockContentItem[] => {
  if (!message.content && !message.tool_calls && !message.tool_call_id)
    return [];
  if (message.role === ChatCompletionMessageRole.TOOL) {
    const toolResultContent = getMessageTextContentArray(message);
    return [
      {
        toolResult: {
          ...(toolResultContent.length &&
          (toolResultContent[0] as { text: string })?.text
            ? { content: toolResultContent }
            : { content: [] }), // Bedrock allows empty array but does not allow empty string in content.
          toolUseId: message.tool_call_id || '',
        },
      },
    ];
  }
  const out: BedrockContentItem[] = [];
  const inputContent: ChatCompletionContentType[] | string | undefined =
    message.content_blocks ?? message.content ?? undefined;
  // if message is a string, return a single element array with the text
  if (typeof inputContent === 'string' && inputContent.trim()) {
    out.push({
      text: inputContent,
    });
  } else if (inputContent && Array.isArray(inputContent)) {
    inputContent.forEach((item) => {
      if (item.type === 'text') {
        out.push({
          text: item.text || '',
        });
      } else if (item.type === 'thinking') {
        transformAndAppendThinkingMessageItem(item, out);
      } else if (item.type === 'image_url' && item.image_url) {
        const mimetypeParts = item.image_url.url.split(';');
        const mimeType = mimetypeParts[0].split(':')[1];
        const fileFormat = mimeType.split('/')[1];
        const bytes = mimetypeParts[1].split(',')[1];
        if (imagesMimeTypes.includes(mimeType)) {
          out.push({
            image: {
              source: {
                bytes,
              },
              format: fileFormat,
            },
          });
        } else if (documentMimeTypes.includes(mimeType)) {
          out.push({
            document: {
              format: fileFormat,
              name: crypto.randomUUID(),
              source: {
                bytes,
              },
            },
          });
        }
      } else if (item.type === 'file') {
        const mimeType = item.file?.mime_type || fileExtensionMimeTypeMap.pdf;
        const fileFormat = mimeType.split('/')[1];
        if (item.file?.file_url) {
          out.push({
            document: {
              format: fileFormat,
              name: item.file.file_name || crypto.randomUUID(),
              source: {
                s3Location: {
                  uri: item.file.file_url,
                },
              },
            },
          });
        } else if (item.file?.file_data) {
          out.push({
            document: {
              format: fileFormat,
              name: item.file.file_name || crypto.randomUUID(),
              source: {
                bytes: item.file.file_data,
              },
            },
          });
        }
      }

      if (item.cache_control) {
        // if content item has `cache_control`, push the cache point to the out array
        out.push({
          cachePoint: {
            type: 'default',
          },
        });
      }
    });
  }

  message.tool_calls?.forEach((toolCall: ChatCompletionToolCall) => {
    out.push({
      toolUse: {
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments),
        toolUseId: toolCall.id,
      },
    });
  });
  return out;
};

// refer: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html
export const bedrockConverseChatCompleteConfig: AIProviderFunctionConfig = {
  messages: [
    {
      param: 'messages',
      required: true,
      transform: (
        params: BedrockChatCompletionsParams,
      ): ChatCompletionMessage[] => {
        if (!params.messages) return [];
        const transformedMessages = params.messages
          .filter((msg) => !ChatCompletionSystemMessageRoles.includes(msg.role))
          .map((msg) => {
            return {
              role:
                msg.role === ChatCompletionMessageRole.ASSISTANT
                  ? ChatCompletionMessageRole.ASSISTANT
                  : ChatCompletionMessageRole.USER,
              content: getMessageContent(msg),
            };
          });
        let prevRole = '';
        // combine user messages in succession
        const combinedMessages = transformedMessages.reduce(
          (acc: typeof transformedMessages, msg) => {
            if (
              msg.role === ChatCompletionMessageRole.USER &&
              prevRole === ChatCompletionMessageRole.USER
            ) {
              const lastMessage = acc[acc.length - 1];
              const newContent = [...lastMessage.content, ...msg.content];
              lastMessage.content = newContent as typeof lastMessage.content;
            } else {
              acc.push(msg);
            }
            prevRole = msg.role;
            return acc;
          },
          [],
        );
        return combinedMessages as unknown as ChatCompletionMessage[];
      },
    },
    {
      param: 'system',
      required: false,
      transform: (
        params: BedrockChatCompletionsParams,
      ): Array<{ text: string } | { cachePoint: { type: string } }> => {
        if (!params.messages) return [];
        const systemMessages: Array<
          { text: string } | { cachePoint: { type: string } }
        > = params.messages.reduce(
          (
            acc: Array<{ text: string } | { cachePoint: { type: string } }>,
            msg,
          ) => {
            if (ChatCompletionSystemMessageRoles.includes(msg.role))
              return acc.concat(...getMessageTextContentArray(msg));
            return acc;
          },
          [],
        );
        if (!systemMessages.length) return [];
        return systemMessages;
      },
    },
  ],
  tools: {
    param: 'toolConfig',
    transform: (params: BedrockChatCompletionsParams) => {
      const canBeAmazonModel = params.model?.includes('amazon');
      const tools: Array<
        | {
            toolSpec: {
              name: string;
              description?: string;
              inputSchema: unknown;
            };
          }
        | { cachePoint: { type: string } }
      > = [];
      params.tools?.forEach((tool) => {
        tools.push({
          toolSpec: {
            name: tool.function.name,
            description: tool.function.description,
            inputSchema: { json: tool.function.parameters },
          },
        });
        if (tool.cache_control && !canBeAmazonModel) {
          tools.push({
            cachePoint: {
              type: 'default',
            },
          });
        }
      });
      const toolConfig = {
        tools,
      };
      let toolChoice:
        | { tool: { name: string } }
        | { any: Record<string, never> }
        | { auto: Record<string, never> }
        | undefined;
      if (params.tool_choice) {
        if (typeof params.tool_choice === 'object') {
          toolChoice = {
            tool: {
              name: params.tool_choice.function.name,
            },
          };
        } else if (typeof params.tool_choice === 'string') {
          if (params.tool_choice === 'required') {
            toolChoice = {
              any: {},
            };
          } else if (params.tool_choice === 'auto') {
            toolChoice = {
              auto: {},
            };
          }
        }
      }
      return { ...toolConfig, toolChoice };
    },
  },
  guardrailConfig: {
    param: 'guardrailConfig',
    required: false,
  },
  guardrail_config: {
    param: 'guardrailConfig',
    required: false,
  },
  additionalModelResponseFieldPaths: {
    param: 'additionalModelResponseFieldPaths',
    required: false,
  },
  additional_model_response_field_paths: {
    param: 'additionalModelResponseFieldPaths',
    required: false,
  },
  max_tokens: {
    param: 'inferenceConfig',
    transform: (params: BedrockChatCompletionsParams) =>
      transformInferenceConfig(params),
  },
  max_completion_tokens: {
    param: 'inferenceConfig',
    transform: (params: BedrockChatCompletionsParams) =>
      transformInferenceConfig(params),
  },
  stop: {
    param: 'inferenceConfig',
    transform: (params: BedrockChatCompletionsParams) =>
      transformInferenceConfig(params),
  },
  temperature: {
    param: 'inferenceConfig',
    transform: (params: BedrockChatCompletionsParams) =>
      transformInferenceConfig(params),
  },
  top_p: {
    param: 'inferenceConfig',
    transform: (params: BedrockChatCompletionsParams) =>
      transformInferenceConfig(params),
  },
  additionalModelRequestFields: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockChatCompletionsParams) =>
      transformAdditionalModelRequestFields(params),
  },
  additional_model_request_fields: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockChatCompletionsParams) =>
      transformAdditionalModelRequestFields(params),
  },
};

export const bedrockErrorResponseTransform: (
  response: Record<string, unknown>,
) => ErrorResponseBody | undefined = (response) => {
  if ('message' in response) {
    return generateErrorResponse(
      {
        message: response.message as string,
        type: undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.BEDROCK,
    );
  }

  return undefined;
};

const transformContentBlocks = (
  contentBlocks: BedrockContentItem[],
): ChatCompletionContentType[] => {
  const output: ChatCompletionContentType[] = [];
  contentBlocks.forEach((contentBlock) => {
    if (contentBlock.text) {
      output.push({
        type: 'text',
        text: contentBlock.text,
      });
    } else if (contentBlock.reasoningContent?.reasoningText) {
      output.push({
        type: 'thinking',
        thinking: contentBlock.reasoningContent.reasoningText.text,
        signature: contentBlock.reasoningContent.reasoningText.signature,
      });
    } else if (contentBlock.reasoningContent?.redactedContent) {
      output.push({
        type: 'redacted_thinking',
        data: contentBlock.reasoningContent.redactedContent,
      });
    }
  });
  return output;
};

export const bedrockChatCompleteResponseTransform: ResponseTransformFunction = (
  response,
  responseStatus,
  _responseHeaders,
  strictOpenAiCompliance,
  raRequestData,
) => {
  if (responseStatus !== 200) {
    const errorResponse = bedrockErrorResponseTransform(response);
    if (errorResponse) return errorResponse;
  }

  if ('output' in response) {
    const chatCompletionRequestBody =
      raRequestData.requestBody as ChatCompletionRequestBody;

    const bedrockResponse =
      response as unknown as BedrockChatCompletionResponse;
    const shouldSendCacheUsage =
      bedrockResponse.usage.cacheWriteInputTokens ||
      bedrockResponse.usage.cacheReadInputTokens;

    const content = bedrockResponse.output.message.content
      .filter((item) => item.text)
      .map((item) => item.text)
      .join('\n');
    const contentBlocks = !strictOpenAiCompliance
      ? transformContentBlocks(bedrockResponse.output.message.content)
      : undefined;

    const responseObj: ChatCompletionResponseBody = {
      id: Date.now().toString(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: chatCompletionRequestBody.model || '',
      choices: [
        {
          index: 0,
          message: {
            role: ChatCompletionMessageRole.ASSISTANT,
            content,
            ...(!strictOpenAiCompliance && {
              content_blocks: contentBlocks,
            }),
          },
          finish_reason:
            bedrockResponse.stopReason as unknown as ChatCompletionFinishReason,
        },
      ],
      usage: {
        prompt_tokens: bedrockResponse.usage.inputTokens,
        completion_tokens: bedrockResponse.usage.outputTokens,
        total_tokens: bedrockResponse.usage.totalTokens, // contains the cache usage as well
        ...(shouldSendCacheUsage && {
          cache_read_input_tokens: bedrockResponse.usage.cacheReadInputTokens,
          cache_creation_input_tokens:
            bedrockResponse.usage.cacheWriteInputTokens,
        }),
      },
    };
    const toolCalls = bedrockResponse.output.message.content
      .filter((content) => content.toolUse)
      .map((content) => ({
        id: content.toolUse!.toolUseId,
        type: 'function',
        function: {
          name: content.toolUse!.name,
          arguments: JSON.stringify(content.toolUse!.input),
        },
      }));
    if (toolCalls.length > 0)
      responseObj.choices[0].message.tool_calls = toolCalls;
    return responseObj;
  }

  return generateInvalidProviderResponseError(
    response as ErrorResponseBody,
    AIProvider.BEDROCK,
  );
};

// refer: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ConverseStream.html
export const bedrockChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    fallbackId,
    streamState,
    strictOpenAiCompliance,
    raRequestData,
  ) => {
    const parsedChunk: BedrockChatCompleteStreamChunk =
      JSON.parse(responseChunk);
    if (parsedChunk.stopReason) {
      streamState.stopReason = parsedChunk.stopReason;
    }
    if (streamState.currentToolCallIndex === undefined) {
      streamState.currentToolCallIndex = -1;
    }
    const chatCompletionRequestBody =
      raRequestData.requestBody as ChatCompletionRequestBody;

    if (parsedChunk.usage) {
      const shouldSendCacheUsage =
        parsedChunk.usage.cacheWriteInputTokens ||
        parsedChunk.usage.cacheReadInputTokens;
      return [
        `data: ${JSON.stringify({
          id: fallbackId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: chatCompletionRequestBody.model || '',
          provider: AIProvider.BEDROCK,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: streamState.stopReason,
            },
          ],
          usage: {
            prompt_tokens: parsedChunk.usage.inputTokens,
            completion_tokens: parsedChunk.usage.outputTokens,
            total_tokens: parsedChunk.usage.totalTokens,
            ...(shouldSendCacheUsage && {
              cache_read_input_tokens: parsedChunk.usage.cacheReadInputTokens,
              cache_creation_input_tokens:
                parsedChunk.usage.cacheWriteInputTokens,
            }),
          },
        })}\n\n`,
        `data: [DONE]\n\n`,
      ];
    }

    const toolCalls = [];
    if (parsedChunk.start?.toolUse) {
      streamState.currentToolCallIndex =
        (streamState.currentToolCallIndex as number) + 1;
      toolCalls.push({
        index: streamState.currentToolCallIndex,
        id: parsedChunk.start.toolUse.toolUseId,
        type: 'function',
        function: {
          name: parsedChunk.start.toolUse.name,
          arguments: parsedChunk.start.toolUse.input,
        },
      });
    } else if (parsedChunk.delta?.toolUse) {
      toolCalls.push({
        index: streamState.currentToolCallIndex,
        id: parsedChunk.delta.toolUse.toolUseId,
        type: 'function',
        function: {
          name: parsedChunk.delta.toolUse.name,
          arguments: parsedChunk.delta.toolUse.input,
        },
      });
    }

    const content = parsedChunk.delta?.text;

    const contentBlockObject: StreamContentBlock = {
      index: parsedChunk.contentBlockIndex ?? 0,
      delta: {},
    };
    if (parsedChunk.delta?.reasoningContent?.text)
      contentBlockObject.delta.thinking =
        parsedChunk.delta.reasoningContent.text;
    if (parsedChunk.delta?.reasoningContent?.signature)
      contentBlockObject.delta.signature =
        parsedChunk.delta.reasoningContent.signature;
    if (parsedChunk.delta?.text)
      contentBlockObject.delta.text = parsedChunk.delta.text;
    if (parsedChunk.delta?.reasoningContent?.redactedContent)
      contentBlockObject.delta.data =
        parsedChunk.delta.reasoningContent.redactedContent;

    return `data: ${JSON.stringify({
      id: fallbackId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: chatCompletionRequestBody.model || '',
      provider: AIProvider.BEDROCK,
      choices: [
        {
          index: 0,
          delta: {
            role: 'assistant',
            content,
            ...(!strictOpenAiCompliance &&
              !toolCalls.length &&
              Object.keys(contentBlockObject.delta).length > 0 && {
                content_blocks: [contentBlockObject],
              }),
            tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
          },
        },
      ],
    })}\n\n`;
  };

export const bedrockConverseAnthropicChatCompleteConfig: AIProviderFunctionConfig =
  {
    ...bedrockConverseChatCompleteConfig,
    additionalModelRequestFields: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseAnthropicChatCompletionsParams) =>
        transformAnthropicAdditionalModelRequestFields(params),
    },
    additional_model_request_fields: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseAnthropicChatCompletionsParams) =>
        transformAnthropicAdditionalModelRequestFields(params),
    },
    top_k: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseAnthropicChatCompletionsParams) =>
        transformAnthropicAdditionalModelRequestFields(params),
    },
    anthropic_version: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseAnthropicChatCompletionsParams) =>
        transformAnthropicAdditionalModelRequestFields(params),
    },
    user: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseAnthropicChatCompletionsParams) =>
        transformAnthropicAdditionalModelRequestFields(params),
    },
    thinking: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseAnthropicChatCompletionsParams) =>
        transformAnthropicAdditionalModelRequestFields(params),
    },
    anthropic_beta: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseAnthropicChatCompletionsParams) =>
        transformAnthropicAdditionalModelRequestFields(params),
    },
  };

export const bedrockConverseCohereChatCompleteConfig: AIProviderFunctionConfig =
  {
    ...bedrockConverseChatCompleteConfig,
    additionalModelRequestFields: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseCohereChatCompletionsParams) =>
        transformCohereAdditionalModelRequestFields(params),
    },
    additional_model_request_fields: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseCohereChatCompletionsParams) =>
        transformCohereAdditionalModelRequestFields(params),
    },
    top_k: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseCohereChatCompletionsParams) =>
        transformCohereAdditionalModelRequestFields(params),
    },
    frequency_penalty: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseCohereChatCompletionsParams) =>
        transformCohereAdditionalModelRequestFields(params),
    },
    presence_penalty: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseCohereChatCompletionsParams) =>
        transformCohereAdditionalModelRequestFields(params),
    },
    logit_bias: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseCohereChatCompletionsParams) =>
        transformCohereAdditionalModelRequestFields(params),
    },
    n: {
      param: 'additionalModelRequestFields',
      transform: (params: BedrockConverseCohereChatCompletionsParams) =>
        transformCohereAdditionalModelRequestFields(params),
    },
  };

export const bedrockConverseAI21ChatCompleteConfig: AIProviderFunctionConfig = {
  ...bedrockConverseChatCompleteConfig,
  additionalModelRequestFields: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockConverseAI21ChatCompletionsParams) =>
      transformAI21AdditionalModelRequestFields(params),
  },
  additional_model_request_fields: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockConverseAI21ChatCompletionsParams) =>
      transformAI21AdditionalModelRequestFields(params),
  },
  top_k: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockConverseAI21ChatCompletionsParams) =>
      transformAI21AdditionalModelRequestFields(params),
  },
  frequency_penalty: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockConverseAI21ChatCompletionsParams) =>
      transformAI21AdditionalModelRequestFields(params),
  },
  presence_penalty: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockConverseAI21ChatCompletionsParams) =>
      transformAI21AdditionalModelRequestFields(params),
  },
  frequencyPenalty: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockConverseAI21ChatCompletionsParams) =>
      transformAI21AdditionalModelRequestFields(params),
  },
  presencePenalty: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockConverseAI21ChatCompletionsParams) =>
      transformAI21AdditionalModelRequestFields(params),
  },
  countPenalty: {
    param: 'additionalModelRequestFields',
    transform: (params: BedrockConverseAI21ChatCompletionsParams) =>
      transformAI21AdditionalModelRequestFields(params),
  },
};

export const bedrockCohereChatCompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'prompt',
    required: true,
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      let prompt = '';
      if (raRequestBody.messages) {
        const messages = raRequestBody.messages;
        messages.forEach((msg, index) => {
          if (
            index === 0 &&
            ChatCompletionSystemMessageRoles.includes(msg.role)
          ) {
            prompt += `system: ${messages}\n`;
          } else if (msg.role === 'user') {
            prompt += `user: ${msg.content}\n`;
          } else if (msg.role === 'assistant') {
            prompt += `assistant: ${msg.content}\n`;
          } else {
            prompt += `${msg.role}: ${msg.content}\n`;
          }
        });
        prompt += 'Assistant:';
      }
      return prompt;
    },
  },
  max_tokens: {
    param: 'max_tokens',
    default: 20,
    min: 1,
  },
  max_completion_tokens: {
    param: 'max_tokens',
    default: 20,
    min: 1,
  },
  temperature: {
    param: 'temperature',
    default: 0.75,
    min: 0,
    max: 5,
  },
  top_p: {
    param: 'p',
    default: 0.75,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'k',
    default: 0,
    max: 500,
  },
  frequency_penalty: {
    param: 'frequency_penalty',
    default: 0,
    min: 0,
    max: 1,
  },
  presence_penalty: {
    param: 'presence_penalty',
    default: 0,
    min: 0,
    max: 1,
  },
  logit_bias: {
    param: 'logit_bias',
  },
  n: {
    param: 'num_generations',
    default: 1,
    min: 1,
    max: 5,
  },
  stop: {
    param: 'end_sequences',
  },
  stream: {
    param: 'stream',
  },
};

export const bedrockCohereChatCompleteResponseTransform: ResponseTransformFunction =
  (
    response,
    responseStatus,
    responseHeaders,
    _strictOpenAiCompliance,
    raRequestData,
  ) => {
    if (responseStatus !== 200) {
      const errorResponse = bedrockErrorResponseTransform(response);
      if (errorResponse) {
        return errorResponse;
      }
    }

    if ('generations' in response) {
      const chatCompletionRequestBody =
        raRequestData.requestBody as ChatCompletionRequestBody;
      const bedrockResponse =
        response as unknown as BedrockCohereCompleteResponse;
      const prompt_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Input-Token-Count')) || 0;
      const completion_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Output-Token-Count')) || 0;
      const chatCompletionResponse: ChatCompletionResponseBody = {
        id: Date.now().toString(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: chatCompletionRequestBody.model ?? '',
        choices: bedrockResponse.generations.map((generation, index) => {
          const choice: ChatCompletionChoice = {
            index: index,
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: generation.text,
            },
            finish_reason: generation.finish_reason
              ? (generation.finish_reason as ChatCompletionFinishReason)
              : ChatCompletionFinishReason.STOP,
          };
          return choice;
        }),
        usage: {
          prompt_tokens: prompt_tokens,
          completion_tokens: completion_tokens,
          total_tokens: prompt_tokens + completion_tokens,
        },
      };
      return chatCompletionResponse;
    }

    return generateInvalidProviderResponseError(
      response as ErrorResponseBody,
      AIProvider.BEDROCK,
    );
  };

export const bedrockCohereChatCompleteStreamChunkTransform: ResponseChunkStreamTransformFunction =
  (
    responseChunk,
    fallbackId,
    _streamState,
    _strictOpenAiCompliance,
    raRequestData,
  ) => {
    let chunk = responseChunk.trim();
    chunk = chunk.replace(/^data: /, '');
    chunk = chunk.trim();
    const parsedChunk: BedrockCohereStreamChunk = JSON.parse(chunk);

    const chatCompletionRequestBody =
      raRequestData.requestBody as ChatCompletionRequestBody;

    // discard the last cohere chunk as it sends the whole response combined.
    if (parsedChunk.is_finished) {
      return [
        `data: ${JSON.stringify({
          id: fallbackId,
          object: 'chat.completion.chunk',
          created: Math.floor(Date.now() / 1000),
          model: chatCompletionRequestBody.model,
          provider: AIProvider.BEDROCK,
          choices: [
            {
              index: parsedChunk.index ?? 0,
              delta: {},
              finish_reason: parsedChunk.finish_reason,
            },
          ],
          usage: {
            prompt_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount,
            completion_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
            total_tokens:
              parsedChunk['amazon-bedrock-invocationMetrics'].inputTokenCount +
              parsedChunk['amazon-bedrock-invocationMetrics'].outputTokenCount,
          },
        })}\n\n`,
        `data: [DONE]\n\n`,
      ];
    }

    return `data: ${JSON.stringify({
      id: fallbackId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: chatCompletionRequestBody.model,
      provider: AIProvider.BEDROCK,
      choices: [
        {
          index: parsedChunk.index ?? 0,
          delta: {
            role: 'assistant',
            content: parsedChunk.text,
          },
          finish_reason: null,
        },
      ],
    })}\n\n`;
  };

export const bedrockAI21ChatCompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'prompt',
    required: true,
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      let prompt = '';
      if (raRequestBody.messages) {
        const messages = raRequestBody.messages;
        messages.forEach((msg, index) => {
          if (
            index === 0 &&
            ChatCompletionSystemMessageRoles.includes(msg.role)
          ) {
            prompt += `system: ${messages}\n`;
          } else if (msg.role === 'user') {
            prompt += `user: ${msg.content}\n`;
          } else if (msg.role === 'assistant') {
            prompt += `assistant: ${msg.content}\n`;
          } else {
            prompt += `${msg.role}: ${msg.content}\n`;
          }
        });
        prompt += 'Assistant:';
      }
      return prompt;
    },
  },
  max_tokens: {
    param: 'maxTokens',
    default: 200,
  },
  max_completion_tokens: {
    param: 'maxTokens',
    default: 200,
  },
  temperature: {
    param: 'temperature',
    default: 0.7,
    min: 0,
    max: 1,
  },
  top_p: {
    param: 'topP',
    default: 1,
  },
  stop: {
    param: 'stopSequences',
  },
  presence_penalty: {
    param: 'presencePenalty',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      return {
        scale: raRequestBody.presence_penalty,
      };
    },
  },
  frequency_penalty: {
    param: 'frequencyPenalty',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      return {
        scale: raRequestBody.frequency_penalty,
      };
    },
  },
  countPenalty: {
    param: 'countPenalty',
  },
  frequencyPenalty: {
    param: 'frequencyPenalty',
  },
  presencePenalty: {
    param: 'presencePenalty',
  },
};

export const bedrockAI21ChatCompleteResponseTransform: ResponseTransformFunction =
  (
    response,
    responseStatus,
    responseHeaders,
    _strictOpenAiCompliance,
    raRequestData,
  ) => {
    if (responseStatus !== 200) {
      const errorResponse = bedrockErrorResponseTransform(response);
      if (errorResponse) {
        return errorResponse;
      }
    }

    if ('completions' in response) {
      const chatCompletionRequestBody =
        raRequestData.requestBody as ChatCompletionRequestBody;
      const bedrockResponse =
        response as unknown as BedrockAI21CompleteResponse;

      const prompt_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Input-Token-Count')) || 0;
      const completion_tokens =
        Number(responseHeaders.get('X-Amzn-Bedrock-Output-Token-Count')) || 0;
      const chatCompletionResponse: ChatCompletionResponseBody = {
        id: bedrockResponse.id.toString(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: chatCompletionRequestBody.model ?? '',

        choices: bedrockResponse.completions.map((completion, index) => {
          const choice: ChatCompletionChoice = {
            index: index,
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: completion.data.text,
            },
            finish_reason: completion.finishReason?.reason
              ? (completion.finishReason.reason as ChatCompletionFinishReason)
              : ChatCompletionFinishReason.STOP,
          };
          return choice;
        }),
        usage: {
          prompt_tokens: prompt_tokens,
          completion_tokens: completion_tokens,
          total_tokens: prompt_tokens + completion_tokens,
        },
      };
      return chatCompletionResponse;
    }

    return generateInvalidProviderResponseError(
      response as ErrorResponseBody,
      AIProvider.BEDROCK,
    );
  };
