import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';
import type {
  AIProviderFunctionConfig,
  ResponseTransformFunction,
  StreamResponseTransformFunction,
} from '@shared/types/ai-providers/config';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api/response';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';

export const siliconFlowChatCompleteConfig: AIProviderFunctionConfig = {
  model: {
    param: 'model',
    required: true,
    default: 'deepseek-ai/DeepSeek-V2-Chat',
  },
  messages: {
    param: 'messages',
    default: '',
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      return raRequestBody.messages?.map((message) => {
        if (message.role === ChatCompletionMessageRole.DEVELOPER)
          return { ...message, role: ChatCompletionMessageRole.SYSTEM };
        return message;
      });
    },
  },
  max_tokens: {
    param: 'max_tokens',
    default: 100,
    min: 0,
    transform: (raRequestBody: ChatCompletionRequestBody) => {
      // Handle precedence: max_completion_tokens takes priority over max_tokens
      return raRequestBody.max_completion_tokens || raRequestBody.max_tokens;
    },
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
};

export const siliconFlowChatCompleteResponseTransform: ResponseTransformFunction =
  (aiProviderResponseBody, aiProviderResponseStatus) => {
    // Handle error responses - prioritize status code over message field presence
    if (aiProviderResponseStatus !== 200) {
      if ('message' in aiProviderResponseBody) {
        return generateErrorResponse(
          {
            message: aiProviderResponseBody.message as string,
            type: (aiProviderResponseBody.type as string) || 'api_error',
            param: aiProviderResponseBody.param as string | undefined,
            code:
              (aiProviderResponseBody.code as string) ||
              aiProviderResponseStatus.toString(),
          },
          AIProvider.SILICONFLOW,
        );
      }

      // Handle error responses without message field
      return generateErrorResponse(
        {
          message: 'Request failed',
          type: 'api_error',
          param: undefined,
          code: aiProviderResponseStatus.toString(),
        },
        AIProvider.SILICONFLOW,
      );
    }

    if ('choices' in aiProviderResponseBody) {
      return aiProviderResponseBody as unknown as ChatCompletionResponseBody;
    }

    return generateInvalidProviderResponseError(
      aiProviderResponseBody as Record<string, unknown>,
      AIProvider.SILICONFLOW,
    );
  };

/**
 * Transforms a SiliconFlow-format chat completions JSON response into an array of formatted SiliconFlow compatible text/event-stream chunks.
 */
export const siliconFlowChatCompleteStreamChunkTransform: StreamResponseTransformFunction =
  (aiProviderResponseBody, provider) => {
    const siliconFlowResponse =
      aiProviderResponseBody as unknown as ChatCompletionResponseBody;
    const streamChunkArray: string[] = [];
    const { id, model, choices } = siliconFlowResponse;

    const { prompt_tokens, completion_tokens } =
      siliconFlowResponse.usage || {};

    let total_tokens: number | undefined;
    if (prompt_tokens && completion_tokens)
      total_tokens = prompt_tokens + completion_tokens;

    const streamChunkTemplate: Record<string, unknown> = {
      id,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: model || '',
      provider,
      usage: {
        ...(completion_tokens && { completion_tokens }),
        ...(prompt_tokens && { prompt_tokens }),
        ...(total_tokens && { total_tokens }),
      },
    };

    for (let choiceIndex = 0; choiceIndex < choices.length; choiceIndex++) {
      const choice = choices[choiceIndex];
      if (
        choice.message?.content &&
        typeof choice.message.content === 'string'
      ) {
        // Split content into proper chunks that respect UTF-8 and word boundaries
        const contentChunks: string[] = [];
        const content = choice.message.content;

        // Split by words first to avoid breaking word boundaries
        const words = content.split(/(\s+)/); // Preserve whitespace
        let currentChunk = '';

        for (const word of words) {
          // If adding this word would make chunk too long, flush current chunk
          if (currentChunk.length > 0 && (currentChunk + word).length > 50) {
            contentChunks.push(currentChunk);
            currentChunk = word;
          } else {
            currentChunk += word;
          }
        }

        // Add remaining chunk if any
        if (currentChunk.length > 0) {
          contentChunks.push(currentChunk);
        }

        // If no words were created (edge case), fall back to safe chunking
        if (contentChunks.length === 0) {
          contentChunks.push(content);
        }

        contentChunks.forEach((chunk: string) => {
          streamChunkArray.push(
            `data: ${JSON.stringify({
              ...streamChunkTemplate,
              choices: [
                {
                  index: choiceIndex,
                  delta: {
                    role: 'assistant',
                    content: chunk,
                  },
                },
              ],
            })}\n\n`,
          );
        });
      }

      streamChunkArray.push(
        `data: ${JSON.stringify({
          ...streamChunkTemplate,
          choices: [
            {
              index: choiceIndex,
              delta: {},
              finish_reason: choice.finish_reason,
            },
          ],
        })}\n\n`,
      );
    }

    streamChunkArray.push(`data: [DONE]\n\n`);
    return streamChunkArray;
  };
