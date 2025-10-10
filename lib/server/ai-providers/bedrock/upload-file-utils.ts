import type { BedrockErrorResponse } from '@server/ai-providers/bedrock/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import {
  type ChatCompletionContentType,
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import type { ChatCompletionToolCall } from '@shared/types/api/routes/shared/tools';
import { AIProvider } from '@shared/types/constants';
import * as z from 'zod';
import {
  LLAMA_2_SPECIAL_TOKENS,
  LLAMA_3_SPECIAL_TOKENS,
  MISTRAL_CONTROL_TOKENS,
} from './constants';

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<
      string,
      {
        type: string;
        description: string;
      }
    >;
    required: string[];
  };
}

interface AnthropicToolResultContentItem {
  type: 'tool_result';
  tool_use_id: string;
  content?: string;
}

type AnthropicMessageContentItem =
  | AnthropicToolResultContentItem
  | ChatCompletionContentType;

interface AnthropicMessage extends ChatCompletionMessage {
  content?: string | AnthropicMessageContentItem[];
}

interface AnthropicTextContentItem {
  type: 'text';
  text: string;
}

interface AnthropicToolContentItem {
  type: 'tool_use';
  name: string;
  id: string;
  input: Record<string, unknown>;
}

interface AnthropicImageContentItem {
  type: 'image';
  source: {
    type: string;
    media_type: string;
    data: string;
  };
}

type AnthropicContentItem =
  | AnthropicTextContentItem
  | AnthropicToolContentItem
  | AnthropicImageContentItem;

const transformAssistantMessageForAnthropic = (
  msg: ChatCompletionMessage,
): AnthropicMessage => {
  const content: AnthropicContentItem[] = [];

  if (msg.content && typeof msg.content === 'string') {
    content.push({
      type: 'text',
      text: msg.content,
    });
  } else if (
    msg.content &&
    typeof msg.content === 'object' &&
    msg.content.length
  ) {
    if (msg.content[0].text) {
      content.push({
        type: 'text',
        text: msg.content[0].text,
      });
    }
  }
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    msg.tool_calls.forEach((toolCall: ChatCompletionToolCall) => {
      content.push({
        type: 'tool_use',
        name: toolCall.function.name,
        id: toolCall.id,
        input: JSON.parse(toolCall.function.arguments),
      });
    });
  }
  return {
    ...msg,
    content,
  };
};

const transformToolMessageForAnthropic = (
  msg: ChatCompletionMessage,
): AnthropicMessage => {
  return {
    ...msg,
    role: ChatCompletionMessageRole.USER,
    content: [
      {
        type: 'tool_result',
        tool_use_id: msg.tool_call_id,
        content: msg.content as string,
      },
    ],
  };
};

const BedrockAnthropicChatCompleteConfig: AIProviderFunctionConfig = {
  messages: [
    {
      param: 'messages',
      required: true,
      transform: (
        idkRequestBody: ChatCompletionRequestBody,
      ): Record<string, unknown>[] => {
        const messages: AnthropicMessage[] = [];
        // Transform the chat messages into a simple prompt
        if (idkRequestBody.messages) {
          idkRequestBody.messages.forEach((msg: ChatCompletionMessage) => {
            if (msg.role === ChatCompletionMessageRole.SYSTEM) return;

            if (msg.role === ChatCompletionMessageRole.ASSISTANT) {
              messages.push(transformAssistantMessageForAnthropic(msg));
            } else if (
              msg.content &&
              typeof msg.content === 'object' &&
              msg.content.length
            ) {
              const transformedMessage: Record<string, unknown> = {
                role: msg.role as ChatCompletionMessageRole,
                content: [],
              };
              msg.content.forEach((item: ChatCompletionContentType) => {
                if (item.type === 'text') {
                  (transformedMessage.content as AnthropicContentItem[]).push({
                    type: item.type,
                    text: item.text as string,
                  });
                } else if (
                  item.type === 'image_url' &&
                  item.image_url &&
                  item.image_url.url
                ) {
                  const parts = item.image_url.url.split(';');
                  if (parts.length === 2) {
                    const base64ImageParts = parts[1].split(',');
                    const base64Image = base64ImageParts[1];
                    const mediaTypeParts = parts[0].split(':');
                    if (mediaTypeParts.length === 2 && base64Image) {
                      const mediaType = mediaTypeParts[1];
                      (
                        transformedMessage.content as AnthropicContentItem[]
                      ).push({
                        type: 'image',
                        source: {
                          type: 'base64',
                          media_type: mediaType,
                          data: base64Image,
                        },
                      });
                    }
                  }
                }
              });
              messages.push(transformedMessage as unknown as AnthropicMessage);
            } else if (msg.role === ChatCompletionMessageRole.TOOL) {
              // even though anthropic supports images in tool results, openai doesn't support it yet
              messages.push(transformToolMessageForAnthropic(msg));
            } else {
              messages.push({
                ...msg,
                role: msg.role as ChatCompletionMessageRole,
                content: msg.content ?? undefined,
              });
            }
          });
        }

        return messages as unknown as Record<string, unknown>[];
      },
    },
    {
      param: 'system',
      required: false,
      transform: (params: ChatCompletionRequestBody): string => {
        let systemMessage = '';
        // Transform the chat messages into a simple prompt
        if (params.messages) {
          params.messages.forEach((msg: ChatCompletionMessage) => {
            if (
              msg.role === ChatCompletionMessageRole.SYSTEM &&
              msg.content &&
              typeof msg.content === 'object' &&
              msg.content[0].text
            ) {
              systemMessage = msg.content[0].text;
            } else if (
              msg.role === ChatCompletionMessageRole.SYSTEM &&
              typeof msg.content === 'string'
            ) {
              systemMessage = msg.content;
            }
          });
        }
        return systemMessage;
      },
    },
  ],
  tools: {
    param: 'tools',
    required: false,
    transform: (
      idkRequestBody: ChatCompletionRequestBody,
    ): Record<string, unknown> => {
      const tools: AnthropicTool[] = [];
      if (idkRequestBody.tools) {
        idkRequestBody.tools.forEach((tool) => {
          if (tool.function) {
            tools.push({
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
            });
          }
        });
      }
      return tools as unknown as Record<string, unknown>;
    },
  },
  // None is not supported by Anthropic, defaults to auto
  tool_choice: {
    param: 'tool_choice',
    required: false,
    transform: (params: ChatCompletionRequestBody) => {
      if (params.tool_choice) {
        if (typeof params.tool_choice === 'string') {
          if (params.tool_choice === 'required') return { type: 'unknown' };
          else if (params.tool_choice === 'auto') return { type: 'auto' };
        } else if (typeof params.tool_choice === 'object') {
          return { type: 'tool', name: params.tool_choice.function.name };
        }
      }
      return {};
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
    transform: (params: ChatCompletionRequestBody) => {
      if (params.stop === null) {
        return [];
      }
      return params.stop;
    },
  },
  user: {
    param: 'metadata.user_id',
  },
  anthropic_version: {
    param: 'anthropic_version',
    required: true,
    default: 'bedrock-2023-05-31',
  },
};

const BedrockCohereChatCompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'prompt',
    required: true,
    transform: (params: ChatCompletionRequestBody) => {
      let prompt = '';
      if (params.messages) {
        const messages: ChatCompletionMessage[] = params.messages;
        messages.forEach((msg, index) => {
          if (index === 0 && msg.role === 'system') {
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

/*
  Helper function to use inside reduce to convert ContentType array to string
*/
const convertContentTypesToString = (
  acc: string,
  curr: ChatCompletionContentType,
): string => {
  if (curr.type !== 'text') return acc;
  acc += `${curr.text}\n`;
  return acc;
};

/*
    Handle messages of both string and ContentType array
  */
const getMessageContent = (message: ChatCompletionMessage): string => {
  if (message === undefined) return '';
  if (message.content && typeof message.content === 'object') {
    return message.content.reduce(convertContentTypesToString, '');
  }
  return message.content || '';
};

/*
  This function transforms the messages for the LLama 3.1 prompt.
  It adds the special tokens to the beginning and end of the prompt.
  refer: https://www.llama.com/docs/model-cards-and-prompt-formats/llama3_1
  NOTE: Portkey does not restrict messages to alternate user and assistant roles, this is to support more flexible use cases.
*/
const transformMessagesForLLama3Prompt = (
  messages: ChatCompletionMessage[],
): string => {
  let prompt = '';
  prompt += `${LLAMA_3_SPECIAL_TOKENS.PROMPT_START}\n`;
  messages.forEach((msg) => {
    prompt +=
      LLAMA_3_SPECIAL_TOKENS.ROLE_START +
      msg.role +
      LLAMA_3_SPECIAL_TOKENS.ROLE_END +
      '\n';
    prompt += getMessageContent(msg) + LLAMA_3_SPECIAL_TOKENS.END_OF_TURN;
  });
  prompt +=
    LLAMA_3_SPECIAL_TOKENS.ROLE_START +
    ChatCompletionMessageRole.ASSISTANT +
    LLAMA_3_SPECIAL_TOKENS.ROLE_END +
    '\n';
  return prompt;
};

/*
    This function transforms the messages for the LLama 2 prompt.
    It combines the system message with the first user message,
    and then attaches the message pairs.
    Finally, it adds the last message to the prompt.
    refer: https://github.com/meta-llama/llama/blob/main/llama/generation.py#L284-L395
  */
const transformMessagesForLLama2Prompt = (
  messages: ChatCompletionMessage[],
): string => {
  let finalPrompt = '';
  // combine system message with first user message
  if (
    messages.length > 0 &&
    messages[0].role === ChatCompletionMessageRole.SYSTEM
  ) {
    messages[0].content =
      LLAMA_2_SPECIAL_TOKENS.SYSTEM_MESSAGE_START +
      getMessageContent(messages[0]) +
      LLAMA_2_SPECIAL_TOKENS.SYSTEM_MESSAGE_END +
      getMessageContent(messages[1]);
  }
  messages = [messages[0], ...messages.slice(2)];
  // attach message pairs
  for (let i = 1; i < messages.length; i += 2) {
    const prompt = getMessageContent(messages[i - 1]);
    const answer = getMessageContent(messages[i]);
    finalPrompt += `${LLAMA_2_SPECIAL_TOKENS.BEGINNING_OF_SENTENCE}${LLAMA_2_SPECIAL_TOKENS.CONVERSATION_TURN_START} ${prompt} ${LLAMA_2_SPECIAL_TOKENS.CONVERSATION_TURN_END} ${answer} ${LLAMA_2_SPECIAL_TOKENS.END_OF_SENTENCE}`;
  }
  if (messages.length % 2 === 1) {
    finalPrompt += `${LLAMA_2_SPECIAL_TOKENS.BEGINNING_OF_SENTENCE}${LLAMA_2_SPECIAL_TOKENS.CONVERSATION_TURN_START} ${getMessageContent(messages[messages.length - 1])} ${LLAMA_2_SPECIAL_TOKENS.CONVERSATION_TURN_END}`;
  }
  return finalPrompt;
};

/*
  refer: https://docs.mistral.ai/guides/tokenization/
  refer: https://github.com/chujiezheng/chat_templates/blob/main/chat_templates/mistral-instruct.jinja
  */
const transformMessagesForMistralPrompt = (
  messages: ChatCompletionMessage[],
): string => {
  let finalPrompt = `${MISTRAL_CONTROL_TOKENS.BEGINNING_OF_SENTENCE}`;
  // Mistral does not support system messages. (ref: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3/discussions/14)
  if (
    messages.length > 0 &&
    messages[0].role === ChatCompletionMessageRole.SYSTEM
  ) {
    messages[0].content = `${getMessageContent(messages[0])}\n${getMessageContent(messages[1])}`;
    messages[0].role = ChatCompletionMessageRole.USER;
  }
  for (const message of messages) {
    if (message.role === ChatCompletionMessageRole.USER) {
      finalPrompt += `${MISTRAL_CONTROL_TOKENS.CONVERSATION_TURN_START} ${message.content} ${MISTRAL_CONTROL_TOKENS.CONVERSATION_TURN_END}`;
    } else {
      finalPrompt += ` ${message.content} ${MISTRAL_CONTROL_TOKENS.END_OF_SENTENCE}`;
    }
  }
  return finalPrompt;
};

const BedrockLlama2ChatCompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'prompt',
    required: true,
    transform: (params: ChatCompletionRequestBody) => {
      if (!params.messages) return '';
      return transformMessagesForLLama2Prompt(params.messages);
    },
  },
  max_tokens: {
    param: 'max_gen_len',
    default: 512,
    min: 1,
    max: 2048,
  },
  max_completion_tokens: {
    param: 'max_gen_len',
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
};

const BedrockLlama3ChatCompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'prompt',
    required: true,
    transform: (params: ChatCompletionRequestBody) => {
      if (!params.messages) return '';
      return transformMessagesForLLama3Prompt(params.messages);
    },
  },
  max_tokens: {
    param: 'max_gen_len',
    default: 512,
    min: 1,
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
};

const BedrockMistralChatCompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'prompt',
    required: true,
    transform: (params: ChatCompletionRequestBody) => {
      let prompt = '';
      if (params.messages)
        prompt = transformMessagesForMistralPrompt(params.messages);
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
    param: 'top_p',
    default: 0.75,
    min: 0,
    max: 1,
  },
  top_k: {
    param: 'top_k',
    default: 0,
    max: 200,
  },
  stop: {
    param: 'stop',
  },
};

const transformTitanGenerationConfig = (
  params: ChatCompletionRequestBody,
): Record<string, unknown> => {
  const generationConfig: Record<string, unknown> = {};
  if (params.temperature) {
    generationConfig.temperature = params.temperature;
  }
  if (params.top_p) {
    generationConfig.topP = params.top_p;
  }
  if (params.max_tokens) {
    generationConfig.maxTokenCount = params.max_tokens;
  }
  if (params.max_completion_tokens) {
    generationConfig.maxTokenCount = params.max_completion_tokens;
  }
  if (params.stop) {
    generationConfig.stopSequences = params.stop;
  }
  return generationConfig;
};

const BedrockTitanChatompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'inputText',
    required: true,
    transform: (params: ChatCompletionRequestBody) => {
      let prompt = '';
      if (params.messages) {
        const messages: ChatCompletionMessage[] = params.messages;
        messages.forEach((msg) => {
          if (msg.role === ChatCompletionMessageRole.SYSTEM) {
            prompt += `system: ${messages}\n`;
          } else if (msg.role === ChatCompletionMessageRole.USER) {
            prompt += `user: ${msg.content}\n`;
          } else if (msg.role === ChatCompletionMessageRole.ASSISTANT) {
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
  temperature: {
    param: 'textGenerationConfig',
    transform: (params: ChatCompletionRequestBody) =>
      transformTitanGenerationConfig(params),
  },
  max_tokens: {
    param: 'textGenerationConfig',
    transform: (params: ChatCompletionRequestBody) =>
      transformTitanGenerationConfig(params),
  },
  max_completion_tokens: {
    param: 'textGenerationConfig',
    transform: (params: ChatCompletionRequestBody) =>
      transformTitanGenerationConfig(params),
  },
  top_p: {
    param: 'textGenerationConfig',
    transform: (params: ChatCompletionRequestBody) =>
      transformTitanGenerationConfig(params),
  },
};

const BedrockAI21ChatCompleteConfig: AIProviderFunctionConfig = {
  messages: {
    param: 'prompt',
    required: true,
    transform: (params: ChatCompletionRequestBody) => {
      let prompt = '';
      if (params.messages) {
        const messages: ChatCompletionMessage[] = params.messages;
        messages.forEach((msg, index) => {
          if (index === 0 && msg.role === ChatCompletionMessageRole.SYSTEM) {
            prompt += `system: ${messages}\n`;
          } else if (msg.role === ChatCompletionMessageRole.USER) {
            prompt += `user: ${msg.content}\n`;
          } else if (msg.role === ChatCompletionMessageRole.ASSISTANT) {
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
    transform: (params: ChatCompletionRequestBody) => {
      return {
        scale: params.presence_penalty,
      };
    },
  },
  frequency_penalty: {
    param: 'frequencyPenalty',
    transform: (params: ChatCompletionRequestBody) => {
      return {
        scale: params.frequency_penalty,
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

export const BedrockErrorResponseTransform: (
  response: BedrockErrorResponse,
) => ErrorResponseBody | undefined = (response) => {
  if ('message' in response) {
    return generateErrorResponse(
      {
        message: response.message,
        type: undefined,
        param: undefined,
        code: undefined,
      },
      AIProvider.BEDROCK,
    );
  }

  return undefined;
};

export const bedrockLlamaChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody) => {
    if ('generation' in aiProviderResponseBody) {
      const chatCompleteResponseBody = ChatCompletionResponseBody.parse(
        aiProviderResponseBody,
      );
      return chatCompleteResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };

export const bedrockTitanChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody) => {
    if ('results' in aiProviderResponseBody) {
      const chatCompleteResponseBody = ChatCompletionResponseBody.parse(
        aiProviderResponseBody,
      );
      return chatCompleteResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };

export const bedrockAI21ChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody) => {
    if ('completions' in aiProviderResponseBody) {
      const chatCompleteResponseBody = ChatCompletionResponseBody.parse(
        aiProviderResponseBody,
      );
      return chatCompleteResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };

export const bedrockAnthropicChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody) => {
    if ('content' in aiProviderResponseBody) {
      const chatCompleteResponseBody = ChatCompletionResponseBody.parse(
        aiProviderResponseBody,
      );
      return chatCompleteResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };

export const bedrockCohereChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody) => {
    if ('generations' in aiProviderResponseBody) {
      const chatCompleteResponseBody = ChatCompletionResponseBody.parse(
        aiProviderResponseBody,
      );
      return chatCompleteResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };

export const bedrockMistralChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody) => {
    if ('outputs' in aiProviderResponseBody) {
      const chatCompleteResponseBody = ChatCompletionResponseBody.parse(
        aiProviderResponseBody,
      );
      return chatCompleteResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody,
      AIProvider.BEDROCK,
    );
  };

export const BedrockUploadFileTransformerConfig: Record<
  string,
  AIProviderFunctionConfig
> = {
  anthropic: BedrockAnthropicChatCompleteConfig,
  cohere: BedrockCohereChatCompleteConfig,
  mistral: BedrockMistralChatCompleteConfig,
  titan: BedrockTitanChatompleteConfig,
  ai21: BedrockAI21ChatCompleteConfig,
  llama2: BedrockLlama2ChatCompleteConfig,
  llama3: BedrockLlama3ChatCompleteConfig,
};

export const BedrockUploadFileResponseTransforms: Record<string, unknown> = {
  anthropic: bedrockAnthropicChatCompleteResponseTransform,
  cohere: bedrockCohereChatCompleteResponseTransform,
  mistral: bedrockMistralChatCompleteResponseTransform,
  titan: bedrockTitanChatCompleteResponseTransform,
  ai21: bedrockAI21ChatCompleteResponseTransform,
  llama2: bedrockLlamaChatCompleteResponseTransform,
  llama3: bedrockLlamaChatCompleteResponseTransform,
};

type BedrockChatCompletionLine = {
  system: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
  }>;
};
const chatCompletionLineSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    }),
  ),
});

const textSchema = z.object({
  prompt: z.string(),
  completion: z.string(),
});

const chatCompletionTransform = chatCompletionLineSchema.transform((data) => {
  const chunk: {
    system: string;
    messages: BedrockChatCompletionLine['messages'];
  } = { system: '', messages: [] };
  const [firstMessage, ...rest] = data.messages;

  if (rest.at(0)?.role !== 'user') {
    return null;
  }

  if (rest.at(-1)?.role !== 'assistant') {
    return null;
  }

  if (firstMessage && firstMessage.role === 'system') {
    chunk.system = firstMessage.content;
  }

  // Assuming message roles are alternating
  chunk.messages = rest as BedrockChatCompletionLine['messages'];
  return chunk;
});

const chatToTextTransform = chatCompletionTransform.transform((data) => {
  const messages = data?.messages ?? [];

  if (messages.length === 0) {
    return null;
  }

  if (messages.at(0)?.role === 'system') {
    messages.splice(0, 1);
  }

  if (messages.length > 2) {
    return null;
  }

  if (messages.at(0)?.role !== 'user') {
    // Invalid dataset
    return null;
  }

  if (messages.at(-1)?.role !== 'assistant') {
    // Invalid dataset
    return null;
  }

  for (let index = 0; index < messages.length; index += 2) {
    const userMessage = messages.at(index);
    const assistantMessage = messages.at(index + 1);

    if (userMessage?.role === 'tool' || assistantMessage?.role === 'tool') {
      return null;
    }

    return {
      completion: assistantMessage?.content ?? '',
      prompt: userMessage?.content ?? '',
    };
  }
});

export const transformFinetuneDatasetLine = (
  json: unknown,
): BedrockChatCompletionLine | null => {
  const parseResult = chatCompletionTransform.safeParse(json);
  if (!parseResult.success) {
    return null;
  }
  return parseResult.data;
};

export const tryChatToTextTransformation = (json: unknown): unknown | null => {
  const parseResult = chatCompletionLineSchema.safeParse(json);
  const textSchemaResult = textSchema.safeParse(json);
  // invalid chunk that doesn't follow either chat or text-to-text data.
  if (!parseResult.success && !textSchemaResult.success) {
    return null;
  }

  // follows text-to-text data
  if (textSchemaResult.success) {
    return json;
  }

  // follows chat data, transform to text-to-text data
  if (parseResult.success) {
    const transformed = chatToTextTransform.safeParse(parseResult.data);
    return transformed.success ? transformed.data : null;
  }

  return null;
};
