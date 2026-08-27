import { groqAPIConfig } from '@api/ai-providers/groq/api';
import {
  groqChatCompleteResponseTransform,
  groqChatCompleteStreamChunkTransform,
} from '@api/ai-providers/groq/chat-complete';
import { groqConfig } from '@api/ai-providers/groq/index';
import type { GroqStreamChunk } from '@api/ai-providers/groq/types';
import type { SuperAgentsRequestData } from '@shared/types/api/request';
import { FunctionName } from '@shared/types/api/request';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestContext = Parameters<typeof groqAPIConfig.getBaseURL>[0];

describe('Groq Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    it('should have all required configuration properties', () => {
      expect(groqConfig).toBeDefined();
      expect(groqConfig.api).toBeDefined();
      expect(groqConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(groqConfig[FunctionName.STREAM_CHAT_COMPLETE]).toBeDefined();
      expect(groqConfig.responseTransforms).toBeDefined();
    });

    it('should support chat completions and streaming', () => {
      expect(groqConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(groqConfig[FunctionName.STREAM_CHAT_COMPLETE]).toBeDefined();
      expect(groqConfig[FunctionName.EMBED]).toBeUndefined();
      expect(groqConfig[FunctionName.GENERATE_IMAGE]).toBeUndefined();
    });

    it('should exclude unsupported parameters', () => {
      const chatConfig = groqConfig[FunctionName.CHAT_COMPLETE];
      expect(chatConfig).toBeDefined();
      // Groq doesn't support these parameters
      expect(chatConfig!.logprobs).toBeUndefined();
      expect(chatConfig!.logits_bias).toBeUndefined();
      expect(chatConfig!.top_logprobs).toBeUndefined();
    });
  });

  describe('API Configuration', () => {
    it('should return correct base URL', () => {
      const baseURL = groqAPIConfig.getBaseURL({} as unknown as TestContext);
      expect(baseURL).toBe('https://api.groq.com/openai/v1');
    });

    it('should return correct headers with API key', () => {
      const headers = groqAPIConfig.headers({
        saTarget: { provider: AIProvider.GROQ, api_key: 'groq-test-key' },
        saRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        Authorization: 'Bearer groq-test-key',
        'Content-Type': 'application/json',
      });
    });

    it('should not set Content-Type for multipart requests', () => {
      const headers = groqAPIConfig.headers({
        saTarget: { provider: AIProvider.GROQ, api_key: 'groq-test-key' },
        saRequestData: {
          functionName: FunctionName.CREATE_TRANSCRIPTION,
        },
      } as unknown as TestContext) as Record<string, string>;

      expect(headers['Content-Type']).toBeUndefined();
      expect(headers.Authorization).toBe('Bearer groq-test-key');
    });

    it('should return correct endpoint for chat completion', () => {
      const endpoint = groqAPIConfig.getEndpoint({
        saRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('/chat/completions');
    });

    it('should return correct endpoint for streaming', () => {
      const endpoint = groqAPIConfig.getEndpoint({
        saRequestData: {
          functionName: FunctionName.STREAM_CHAT_COMPLETE,
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('/chat/completions');
    });

    it('should return empty string for unsupported functions', () => {
      const endpoint = groqAPIConfig.getEndpoint({
        saRequestData: {
          functionName: FunctionName.EMBED,
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('');
    });
  });

  describe('Response Transformation', () => {
    it('should transform successful response correctly', () => {
      const groqResponse: ChatCompletionResponseBody = {
        id: 'chatcmpl-test123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
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
        service_tier: 'on_demand', // Groq-specific value
      };

      const result = groqChatCompleteResponseTransform(
        groqResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.id).toBe('chatcmpl-test123');
      expect(result.object).toBe('chat.completion');
      expect(result.model).toBe('llama-3.1-8b-instant');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe(
        'Hello! How can I help you today?',
      );
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.GROQ,
      );
      // service_tier should be removed
      expect(result.service_tier).toBeUndefined();
    });

    it('should remove service_tier field from response', () => {
      const groqResponse = {
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'test' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        service_tier: 'on_demand',
      };

      const result = groqChatCompleteResponseTransform(
        groqResponse,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as Record<string, unknown>;

      expect(result.service_tier).toBeUndefined();
      expect('service_tier' in result).toBe(false);
    });

    it('should handle response with system_fingerprint', () => {
      const groqResponse = {
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'test' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        system_fingerprint: 'fp_test123',
      };

      const result = groqChatCompleteResponseTransform(
        groqResponse,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.system_fingerprint).toBe('fp_test123');
    });

    it('should handle tool calls in response', () => {
      const groqResponse: ChatCompletionResponseBody = {
        id: 'chatcmpl-tool',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-3.1-70b-versatile',
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

      const result = groqChatCompleteResponseTransform(
        groqResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
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
      const groqErrorResponse = {
        error: {
          message: 'Invalid API key',
          type: 'authentication_error',
          code: 'invalid_api_key',
        },
      };

      const result = groqChatCompleteResponseTransform(
        groqErrorResponse,
        401,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid API key');
      expect(result.error.type).toBe('authentication_error');
      expect(result.error.code).toBe('invalid_api_key');
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.GROQ,
      );
    });

    it('should handle error as string', () => {
      const groqErrorResponse = {
        error: 'Simple error message',
      };

      const result = groqChatCompleteResponseTransform(
        groqErrorResponse,
        500,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Simple error message');
      expect(result.error.code).toBe('500');
    });

    it('should handle malformed error object', () => {
      const groqErrorResponse = {
        error: null,
      };

      const result = groqChatCompleteResponseTransform(
        groqErrorResponse,
        500,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Unknown error occurred');
    });

    it('should handle malformed response gracefully', () => {
      const malformedResponse = { invalid: 'response' };

      const result = groqChatCompleteResponseTransform(
        malformedResponse,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
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

      const result = groqChatCompleteResponseTransform(
        invalidResponse,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Invalid response');
    });

    it('should validate choices is an array', () => {
      const invalidResponse = {
        id: 'test',
        choices: 'not-an-array', // invalid type
        object: 'chat.completion',
      };

      const result = groqChatCompleteResponseTransform(
        invalidResponse,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
    });
  });

  describe('Stream Chunk Transformation', () => {
    it('should transform regular stream chunk correctly', () => {
      const streamChunk: GroqStreamChunk = {
        id: 'chatcmpl-stream',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
        choices: [
          {
            index: 0,
            delta: {
              role: 'assistant',
              content: 'Hello',
            },
            finish_reason: null,
            logprobs: null,
          },
        ],
      };

      const chunkStr = `data: ${JSON.stringify(streamChunk)}`;
      const result = groqChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );

      expect(result).toContain('data:');
      expect(result).toContain('"provider":"groq"');
      expect(result).toContain('"content":"Hello"');
      expect(result).toContain('"role":"assistant"');
    });

    it('should handle [DONE] marker', () => {
      const result = groqChatCompleteStreamChunkTransform(
        'data: [DONE]',
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );
      expect(result).toBe('data: [DONE]\n\n');
    });

    it('should handle usage metadata chunk', () => {
      const usageChunk: GroqStreamChunk = {
        id: 'chatcmpl-usage',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        x_groq: {
          usage: {
            queue_time: 0.1,
            prompt_tokens: 10,
            prompt_time: 0.05,
            completion_tokens: 20,
            completion_time: 0.1,
            total_tokens: 30,
            total_time: 0.15,
          },
        },
      };

      const chunkStr = `data: ${JSON.stringify(usageChunk)}`;
      const result = groqChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );

      expect(result).toContain('"usage"');
      expect(result).toContain('"prompt_tokens":10');
      expect(result).toContain('"completion_tokens":20');
      expect(result).toContain('"total_tokens":30');
    });

    it('should handle malformed JSON in stream chunk', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // Mock implementation to suppress console output during tests
        });

      const result = groqChatCompleteStreamChunkTransform(
        'data: {invalid json}',
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );

      expect(result).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to parse Groq stream chunk:',
        expect.objectContaining({
          error: expect.any(String),
          chunkPreview: expect.any(String),
        }),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle empty choices array in stream', () => {
      const streamChunk: GroqStreamChunk = {
        id: 'chatcmpl-empty',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
        choices: [],
      };

      const chunkStr = `data: ${JSON.stringify(streamChunk)}`;
      const result = groqChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );

      expect(result).toContain('"choices":[]');
    });

    it('should handle tool calls in stream chunk', () => {
      const streamChunk: GroqStreamChunk = {
        id: 'chatcmpl-tool-stream',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'llama-3.1-70b-versatile',
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
            logprobs: null,
          },
        ],
      };

      const chunkStr = `data: ${JSON.stringify(streamChunk)}`;
      const result = groqChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );

      expect(result).toContain('"tool_calls"');
      expect(result).toContain('get_weather');
    });

    it('should handle non-string input gracefully', () => {
      const result = groqChatCompleteStreamChunkTransform(
        { toString: () => 'data: [DONE]' } as unknown as string,
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );
      expect(result).toBe('data: [DONE]\n\n');
    });
  });

  describe('Response Transforms Registration', () => {
    it('should provide response transforms for supported functions', () => {
      const transforms = groqConfig.responseTransforms;
      expect(transforms).toBeDefined();
      expect(transforms![FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(transforms![FunctionName.STREAM_CHAT_COMPLETE]).toBeDefined();
    });

    it('should use custom transforms for chat completions', () => {
      const transforms = groqConfig.responseTransforms;
      expect(transforms![FunctionName.CHAT_COMPLETE]).toBe(
        groqChatCompleteResponseTransform,
      );
      expect(transforms![FunctionName.STREAM_CHAT_COMPLETE]).toBe(
        groqChatCompleteStreamChunkTransform,
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing usage in response', () => {
      const groqResponse = {
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'test' },
            finish_reason: 'stop',
          },
        ],
        // no usage field
      };

      const result = groqChatCompleteResponseTransform(
        groqResponse,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.usage).toBeUndefined();
    });

    it('should handle multiple choices in response', () => {
      const groqResponse = {
        id: 'test',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
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

      const result = groqChatCompleteResponseTransform(
        groqResponse,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.choices).toHaveLength(2);
      expect(result.choices[0].message.content).toBe('First');
      expect(result.choices[1].message.content).toBe('Second');
    });

    it('should handle response with missing id', () => {
      const invalidResponse = {
        // missing id
        object: 'chat.completion',
        choices: [],
      };

      const result = groqChatCompleteResponseTransform(
        invalidResponse,
        200,
        new Headers(),
        true,
        {} as SuperAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
    });

    it('should handle stream chunk with missing choices in usage chunk', () => {
      const usageChunk = {
        id: 'test',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'test',
        choices: [], // empty choices
        x_groq: {
          usage: {
            queue_time: 0.1,
            prompt_tokens: 10,
            prompt_time: 0.05,
            completion_tokens: 20,
            completion_time: 0.1,
            total_tokens: 30,
            total_time: 0.15,
          },
        },
      };

      const chunkStr = `data: ${JSON.stringify(usageChunk)}`;
      const result = groqChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );

      // Should handle gracefully - won't include usage since choices[0] doesn't exist
      expect(result).toBeDefined();
    });
  });

  describe('Groq-Specific Features', () => {
    it('should handle x_groq usage metadata', () => {
      const usageChunk: GroqStreamChunk = {
        id: 'test',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        x_groq: {
          usage: {
            queue_time: 0.05,
            prompt_tokens: 15,
            prompt_time: 0.02,
            completion_tokens: 25,
            completion_time: 0.08,
            total_tokens: 40,
            total_time: 0.1,
          },
        },
      };

      const chunkStr = `data: ${JSON.stringify(usageChunk)}`;
      const result = groqChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );

      expect(result).toContain('"prompt_tokens":15');
      expect(result).toContain('"completion_tokens":25');
      expect(result).toContain('"total_tokens":40');
    });

    it('should handle regular usage field in stream', () => {
      const streamChunk: GroqStreamChunk = {
        id: 'test',
        object: 'chat.completion.chunk',
        created: Date.now(),
        model: 'llama-3.1-8b-instant',
        choices: [
          {
            index: 0,
            delta: { content: 'test' },
            finish_reason: null,
            logprobs: null,
          },
        ],
        usage: {
          queue_time: 0.05,
          prompt_tokens: 10,
          prompt_time: 0.02,
          completion_tokens: 5,
          completion_time: 0.03,
          total_tokens: 15,
          total_time: 0.05,
        },
      };

      const chunkStr = `data: ${JSON.stringify(streamChunk)}`;
      const result = groqChatCompleteStreamChunkTransform(
        chunkStr,
        'fallback-id',
        {},
        true,
        {} as SuperAgentsRequestData,
      );

      expect(result).toContain('"usage"');
      expect(result).toContain('"prompt_tokens":10');
    });
  });

  describe('Integration with Provider System', () => {
    it('should construct complete request URLs', () => {
      const baseURL = groqAPIConfig.getBaseURL({} as unknown as TestContext);
      const endpoint = groqAPIConfig.getEndpoint({
        saRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
        },
      } as unknown as TestContext);

      const fullURL = `${baseURL}${endpoint}`;
      expect(fullURL).toBe('https://api.groq.com/openai/v1/chat/completions');
    });

    it('should be properly registered in provider system', () => {
      expect(groqConfig.api).toBe(groqAPIConfig);
      expect(groqConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(groqConfig[FunctionName.STREAM_CHAT_COMPLETE]).toBeDefined();
    });
  });
});
