import deepSeekAPIConfig from '@api/ai-providers/deepseek/api';
import {
  deepSeekChatCompleteResponseTransform,
  deepSeekChatCompleteStreamChunkTransform,
} from '@api/ai-providers/deepseek/chat-complete';
import { deepSeekConfig } from '@api/ai-providers/deepseek/index';
import type { DeepSeekStreamChunk } from '@api/ai-providers/deepseek/types';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request';
import { FunctionName } from '@shared/types/api/request';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestContext = Parameters<typeof deepSeekAPIConfig.getBaseURL>[0];

describe('DeepSeek Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    it('should have all required configuration properties', () => {
      expect(deepSeekConfig).toBeDefined();
      expect(deepSeekConfig.api).toBeDefined();
      expect(deepSeekConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(deepSeekConfig.responseTransforms).toBeDefined();
    });

    it('should support chat completions and streaming', () => {
      expect(deepSeekConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(deepSeekConfig[FunctionName.STREAM_CHAT_COMPLETE]).toBeDefined();
      expect(deepSeekConfig[FunctionName.EMBED]).toBeUndefined();
      expect(deepSeekConfig[FunctionName.GENERATE_IMAGE]).toBeUndefined();
    });
  });

  describe('API Configuration', () => {
    it('should return correct base URL', () => {
      const baseURL = deepSeekAPIConfig.getBaseURL(
        {} as unknown as TestContext,
      );
      expect(baseURL).toBe('https://api.deepseek.com');
    });

    it('should return correct headers with API key', () => {
      const headers = deepSeekAPIConfig.headers({
        raTarget: {
          provider: AIProvider.DEEPSEEK,
          api_key: 'deepseek-test-key',
        },
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        Authorization: 'Bearer deepseek-test-key',
      });
    });

    it('should return correct endpoint for chat completion', () => {
      const endpoint = deepSeekAPIConfig.getEndpoint({
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('/v1/chat/completions');
    });

    it('should return empty string for unsupported functions', () => {
      const endpoint = deepSeekAPIConfig.getEndpoint({
        raRequestData: {
          functionName: FunctionName.EMBED,
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('');
    });
  });

  describe('Response Transformation', () => {
    it('should transform successful response correctly', () => {
      const deepSeekResponse: ChatCompletionResponseBody = {
        id: 'chatcmpl-test123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: 'Hello! How can I help you today?',
            },
            finish_reason: ChatCompletionFinishReason.STOP,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      };

      const result = deepSeekChatCompleteResponseTransform(
        deepSeekResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.id).toBe('chatcmpl-test123');
      expect(result.object).toBe('chat.completion');
      expect(result.model).toBe('deepseek-chat');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe(
        'Hello! How can I help you today?',
      );
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.DEEPSEEK,
      );
    });

    it('should handle tool calls in response', () => {
      const deepSeekResponse: ChatCompletionResponseBody = {
        id: 'chatcmpl-tool',
        object: 'chat.completion',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: null,
              tool_calls: [
                {
                  id: 'call_test123',
                  type: 'function',
                  function: {
                    name: 'get_weather',
                    arguments: JSON.stringify({ location: 'San Francisco' }),
                  },
                },
              ],
            },
            finish_reason: ChatCompletionFinishReason.TOOL_CALLS,
          },
        ],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 5,
          total_tokens: 25,
        },
      };

      const result = deepSeekChatCompleteResponseTransform(
        deepSeekResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.choices[0].message.tool_calls).toHaveLength(1);
      expect(result.choices[0].message.tool_calls?.[0].function.name).toBe(
        'get_weather',
      );
      expect(result.choices[0].finish_reason).toBe(
        ChatCompletionFinishReason.TOOL_CALLS,
      );
    });

    it('should handle error response correctly', () => {
      const deepSeekErrorResponse = {
        message: 'Invalid API key',
        type: 'authentication_error',
        code: 'invalid_api_key',
      };

      const result = deepSeekChatCompleteResponseTransform(
        deepSeekErrorResponse,
        401,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid API key');
      expect(result.error.type).toBe('authentication_error');
      expect(result.error.code).toBe('invalid_api_key');
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.DEEPSEEK,
      );
    });

    it('should handle error as string', () => {
      const deepSeekErrorResponse = {
        message: 'Simple error message',
      };

      const result = deepSeekChatCompleteResponseTransform(
        deepSeekErrorResponse,
        500,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Simple error message');
    });

    it('should handle malformed response gracefully', () => {
      const malformedResponse = { invalid: 'response' };

      const result = deepSeekChatCompleteResponseTransform(
        malformedResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid response');
    });

    it('should validate required fields before processing', () => {
      const invalidResponse = {
        id: 'test',
        // missing choices
        object: 'chat.completion',
      };

      const result = deepSeekChatCompleteResponseTransform(
        invalidResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid response');
    });

    it('should handle missing usage in response', () => {
      const deepSeekResponse = {
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'test' },
            finish_reason: 'stop',
          },
        ],
        // no usage field
      };

      const result = deepSeekChatCompleteResponseTransform(
        deepSeekResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.usage).toBeUndefined();
    });

    it('should handle multiple choices in response', () => {
      const deepSeekResponse = {
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'First' },
            finish_reason: 'stop',
          },
          {
            index: 1,
            message: { role: 'assistant', content: 'Second' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      };

      const result = deepSeekChatCompleteResponseTransform(
        deepSeekResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.choices).toHaveLength(2);
      expect(result.choices[0].message.content).toBe('First');
      expect(result.choices[1].message.content).toBe('Second');
    });
  });

  describe('Stream Chunk Transformation', () => {
    it('should transform regular stream chunk correctly', () => {
      const streamChunk: DeepSeekStreamChunk = {
        id: 'chatcmpl-stream',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: 'Hello',
            },
            finish_reason: null,
          },
        ],
      };

      const chunkStr = `data: ${JSON.stringify(streamChunk)}`;
      const result = deepSeekChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as ReactiveAgentsRequestData,
      );

      expect(result).toContain('data:');
      expect(result).toContain('"provider":"deepseek"');
      expect(result).toContain('"content":"Hello"');
      expect(result).toContain('"role":"assistant"');
    });

    it('should handle [DONE] marker', () => {
      const result = deepSeekChatCompleteStreamChunkTransform(
        'data: [DONE]',
        'fallback-id',
        {},
        true,
        {} as ReactiveAgentsRequestData,
      );
      expect(result).toBe('data: [DONE]\n\n');
    });

    it('should handle usage metadata chunk', () => {
      const usageChunk: DeepSeekStreamChunk = {
        id: 'chatcmpl-usage',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      const chunkStr = `data: ${JSON.stringify(usageChunk)}`;
      const result = deepSeekChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as ReactiveAgentsRequestData,
      );

      expect(result).toContain('"usage"');
      expect(result).toContain('"prompt_tokens":10');
      expect(result).toContain('"completion_tokens":20');
      expect(result).toContain('"total_tokens":30');
    });

    it('should handle empty choices array in stream', () => {
      const streamChunk: DeepSeekStreamChunk = {
        id: 'chatcmpl-empty',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [],
      };

      const chunkStr = `data: ${JSON.stringify(streamChunk)}`;
      const result = deepSeekChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as ReactiveAgentsRequestData,
      );

      expect(result).toContain('"choices":[]');
    });

    it('should handle tool calls in stream chunk', () => {
      const streamChunk: DeepSeekStreamChunk = {
        id: 'chatcmpl-tool-stream',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'deepseek-chat',
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              tool_calls: [
                {
                  id: 'call_test',
                  type: 'function',
                  function: { name: 'get_weather', arguments: '{"loc' },
                },
              ],
            },
            finish_reason: null,
          },
        ],
      };

      const chunkStr = `data: ${JSON.stringify(streamChunk)}`;
      const result = deepSeekChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as ReactiveAgentsRequestData,
      );

      expect(result).toContain('"tool_calls"');
      expect(result).toContain('get_weather');
    });

    it('should handle non-string input gracefully', () => {
      const result = deepSeekChatCompleteStreamChunkTransform(
        { toString: () => 'data: [DONE]' } as unknown as string,
        'fallback-id',
        {},
        true,
        {} as ReactiveAgentsRequestData,
      );
      expect(result).toBe('data: [DONE]\n\n');
    });
  });

  describe('Response Transforms Registration', () => {
    it('should provide response transforms for supported functions', () => {
      const transforms = deepSeekConfig.responseTransforms;
      expect(transforms).toBeDefined();
      expect(transforms![FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(transforms![FunctionName.STREAM_CHAT_COMPLETE]).toBeDefined();
    });

    it('should use custom transforms for chat completions', () => {
      const transforms = deepSeekConfig.responseTransforms;
      expect(transforms![FunctionName.CHAT_COMPLETE]).toBe(
        deepSeekChatCompleteResponseTransform,
      );
      expect(transforms![FunctionName.STREAM_CHAT_COMPLETE]).toBe(
        deepSeekChatCompleteStreamChunkTransform,
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle response with missing id', () => {
      const invalidResponse = {
        // missing id
        object: 'chat.completion',
        choices: [],
      };

      const result = deepSeekChatCompleteResponseTransform(
        invalidResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
    });
  });

  describe('Integration with Provider System', () => {
    it('should construct complete request URLs', () => {
      const baseURL = deepSeekAPIConfig.getBaseURL(
        {} as unknown as TestContext,
      );
      const endpoint = deepSeekAPIConfig.getEndpoint({
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
        },
      } as unknown as TestContext);

      const fullURL = `${baseURL}${endpoint}`;
      expect(fullURL).toBe('https://api.deepseek.com/v1/chat/completions');
    });

    it('should be properly registered in provider system', () => {
      expect(deepSeekConfig.api).toBe(deepSeekAPIConfig);
      expect(deepSeekConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
    });
  });
});
