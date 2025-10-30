import { xaiConfig } from '@server/ai-providers/xai';
import { xaiAPIConfig } from '@server/ai-providers/xai/api';
import {
  xaiChatCompleteConfig,
  xaiChatCompleteResponseTransform,
} from '@server/ai-providers/xai/chat-complete';
import type { XaiErrorResponse } from '@server/ai-providers/xai/types';
import {
  FunctionName,
  type ReactiveAgentsRequestData,
} from '@shared/types/api/request';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test helper - use unknown casting for test contexts
type TestContext = Parameters<typeof xaiAPIConfig.getBaseURL>[0];

describe('xAI Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    it('should have all required configuration properties', () => {
      expect(xaiConfig).toBeDefined();
      expect(xaiConfig.api).toBeDefined();
      expect(xaiConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(xaiConfig.responseTransforms).toBeDefined();
    });

    it('should support only chat completions for now', () => {
      expect(xaiConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(xaiConfig[FunctionName.COMPLETE]).toBeUndefined();
      expect(xaiConfig[FunctionName.EMBED]).toBeUndefined();
      expect(xaiConfig[FunctionName.GENERATE_IMAGE]).toBeUndefined();
    });
  });

  describe('API Configuration', () => {
    it('should return correct base URL', () => {
      const baseURL = xaiAPIConfig.getBaseURL({} as unknown as TestContext);
      expect(baseURL).toBe('https://api.x.ai/v1');
    });

    it('should return correct headers with API key', () => {
      const headers = xaiAPIConfig.headers({
        raTarget: { provider: AIProvider.XAI, api_key: 'xai-test-key' },
      } as unknown as TestContext);

      expect(headers).toEqual({
        Authorization: 'Bearer xai-test-key',
        'Content-Type': 'application/json',
      });
    });

    it('should handle missing API key', () => {
      const headers = xaiAPIConfig.headers({
        raTarget: { provider: AIProvider.XAI },
      } as unknown as TestContext);

      expect(headers).toEqual({
        Authorization: 'Bearer undefined',
        'Content-Type': 'application/json',
      });
    });

    it('should return correct endpoint for chat completion', () => {
      const endpoint = xaiAPIConfig.getEndpoint({
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: { model: 'grok-4', messages: [] },
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('/chat/completions');
    });

    it('should return empty string for unsupported functions', () => {
      const endpoint = xaiAPIConfig.getEndpoint({
        raRequestData: {
          functionName: FunctionName.EMBED,
          requestBody: { model: 'test', input: 'test' },
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('');
    });
  });

  describe('Chat Complete Configuration', () => {
    it('should have correct model configuration', () => {
      const config = xaiChatCompleteConfig;
      expect(config.model).toBeDefined();
      expect(config.model).toHaveProperty('param', 'model');
      expect(config.model).toHaveProperty('required', true);
      expect(config.model).toHaveProperty('default', 'grok-4');
    });

    it('should have correct parameter configurations', () => {
      const config = xaiChatCompleteConfig;

      // Basic parameters
      expect(config.messages).toBeDefined();
      expect(config.max_tokens).toBeDefined();
      expect(config.max_completion_tokens).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.top_p).toBeDefined();
      expect(config.n).toBeDefined();
      expect(config.stream).toBeDefined();
    });

    it('should have correct temperature limits', () => {
      const config = xaiChatCompleteConfig;
      expect(config.temperature).toHaveProperty('min', 0);
      expect(config.temperature).toHaveProperty('max', 2);
      expect(config.temperature).toHaveProperty('default', 1);
    });

    it('should have correct penalty configurations', () => {
      const config = xaiChatCompleteConfig;
      expect(config.presence_penalty).toHaveProperty('min', -2);
      expect(config.presence_penalty).toHaveProperty('max', 2);
      expect(config.presence_penalty).toHaveProperty('default', 0);
      expect(config.frequency_penalty).toHaveProperty('min', -2);
      expect(config.frequency_penalty).toHaveProperty('max', 2);
      expect(config.frequency_penalty).toHaveProperty('default', 0);
    });

    it('should have xAI-specific parameters', () => {
      const config = xaiChatCompleteConfig;
      expect(config.reasoning_effort).toBeDefined();
      expect(config.search_parameters).toBeDefined();
      expect(config.web_search_options).toBeDefined();
      expect(config.deferred).toBeDefined();
      expect(config.deferred).toHaveProperty('default', false);
    });

    it('should have tool-related configurations', () => {
      const config = xaiChatCompleteConfig;
      expect(config.tools).toBeDefined();
      expect(config.tool_choice).toBeDefined();
      expect(config.parallel_tool_calls).toBeDefined();
      expect(config.parallel_tool_calls).toHaveProperty('default', true);
    });

    it('should have logprobs configurations', () => {
      const config = xaiChatCompleteConfig;
      expect(config.logprobs).toBeDefined();
      expect(config.logprobs).toHaveProperty('default', false);
      expect(config.top_logprobs).toBeDefined();
      expect(config.top_logprobs).toHaveProperty('min', 0);
      expect(config.top_logprobs).toHaveProperty('max', 8);
    });
  });

  describe('Response Transformation', () => {
    it('should transform successful response correctly', () => {
      const xaiResponse: ChatCompletionResponseBody = {
        id: 'chatcmpl-test123',
        object: 'chat.completion',
        created: Date.now(),
        model: 'grok-4',
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

      const result = xaiChatCompleteResponseTransform(
        xaiResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.id).toBe('chatcmpl-test123');
      expect(result.object).toBe('chat.completion');
      expect(result.model).toBe('grok-4');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.role).toBe(
        ChatCompletionMessageRole.ASSISTANT,
      );
      expect(result.choices[0].message.content).toBe(
        'Hello! How can I help you today?',
      );
      expect(result.choices[0].finish_reason).toBe(
        ChatCompletionFinishReason.STOP,
      );
      expect(result.usage?.prompt_tokens).toBe(10);
      expect(result.usage?.completion_tokens).toBe(15);
      expect(result.usage?.total_tokens).toBe(25);
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.XAI,
      );
    });

    it('should handle function calls in response', () => {
      const xaiResponse: ChatCompletionResponseBody = {
        id: 'chatcmpl-test456',
        object: 'chat.completion',
        created: Date.now(),
        model: 'grok-4',
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

      const result = xaiChatCompleteResponseTransform(
        xaiResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.choices[0].message.tool_calls).toHaveLength(1);
      expect(result.choices[0].message.tool_calls?.[0].function.name).toBe(
        'get_weather',
      );
      expect(result.choices[0].message.tool_calls?.[0].function.arguments).toBe(
        JSON.stringify({ location: 'San Francisco' }),
      );
      expect(result.choices[0].finish_reason).toBe(
        ChatCompletionFinishReason.TOOL_CALLS,
      );
    });

    it('should transform xAI error response correctly', () => {
      const xaiErrorResponse: XaiErrorResponse = {
        error: {
          message: 'Invalid API key',
          type: 'authentication_error',
          code: 'invalid_api_key',
        },
      };

      const result = xaiChatCompleteResponseTransform(
        xaiErrorResponse as unknown as Record<string, unknown>,
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
        AIProvider.XAI,
      );
    });

    it('should handle rate limit errors', () => {
      const xaiErrorResponse: XaiErrorResponse = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      };

      const result = xaiChatCompleteResponseTransform(
        xaiErrorResponse as unknown as Record<string, unknown>,
        429,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error.message).toContain('Rate limit exceeded');
      expect(result.error.type).toBe('rate_limit_error');
      expect(result.error.code).toBe('rate_limit_exceeded');
    });

    it('should handle missing error code', () => {
      const xaiErrorResponse: XaiErrorResponse = {
        error: {
          message: 'Something went wrong',
          type: 'server_error',
        },
      };

      const result = xaiChatCompleteResponseTransform(
        xaiErrorResponse as unknown as Record<string, unknown>,
        500,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ErrorResponseBody;

      expect(result.error.message).toContain('Something went wrong');
      expect(result.error.type).toBe('server_error');
      expect(result.error.code).toBeUndefined(); // xAI error didn't have code
    });
  });

  describe('Response Transforms Registration', () => {
    it('should provide response transforms for supported functions', () => {
      const transforms = xaiConfig.responseTransforms;
      expect(transforms).toBeDefined();
      expect(transforms![FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(transforms![FunctionName.STREAM_CHAT_COMPLETE]).toBeDefined();
    });

    it('should use same transform for streaming and non-streaming', () => {
      const transforms = xaiConfig.responseTransforms;
      expect(transforms![FunctionName.CHAT_COMPLETE]).toBe(
        transforms![FunctionName.STREAM_CHAT_COMPLETE],
      );
    });

    it('should have response API transforms', () => {
      const transforms = xaiConfig.responseTransforms;
      expect(transforms![FunctionName.CREATE_MODEL_RESPONSE]).toBeDefined();
      expect(transforms![FunctionName.GET_MODEL_RESPONSE]).toBeDefined();
      expect(transforms![FunctionName.DELETE_MODEL_RESPONSE]).toBeDefined();
      expect(transforms![FunctionName.LIST_RESPONSE_INPUT_ITEMS]).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed response gracefully', () => {
      const malformedResponse = { invalid: 'response' };

      const result = xaiChatCompleteResponseTransform(
        malformedResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      );

      // Should add provider property even to malformed responses
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.XAI,
      );
    });

    it('should handle empty choices array', () => {
      const xaiResponse: ChatCompletionResponseBody = {
        id: 'chatcmpl-empty',
        object: 'chat.completion',
        created: Date.now(),
        model: 'grok-4',
        choices: [],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 0,
          total_tokens: 10,
        },
      };

      const result = xaiChatCompleteResponseTransform(
        xaiResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.choices).toHaveLength(0);
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.XAI,
      );
    });

    it('should handle response with multiple choices', () => {
      const xaiResponse: ChatCompletionResponseBody = {
        id: 'chatcmpl-multi',
        object: 'chat.completion',
        created: Date.now(),
        model: 'grok-4',
        choices: [
          {
            index: 0,
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: 'First response',
            },
            finish_reason: ChatCompletionFinishReason.STOP,
          },
          {
            index: 1,
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: 'Second response',
            },
            finish_reason: ChatCompletionFinishReason.STOP,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      const result = xaiChatCompleteResponseTransform(
        xaiResponse,
        200,
        new Headers(),
        true,
        {} as ReactiveAgentsRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.choices).toHaveLength(2);
      expect(result.choices[0].message.content).toBe('First response');
      expect(result.choices[1].message.content).toBe('Second response');
    });
  });

  describe('Integration with Provider System', () => {
    it('should construct complete request URLs', () => {
      const baseURL = xaiAPIConfig.getBaseURL({} as unknown as TestContext);
      const endpoint = xaiAPIConfig.getEndpoint({
        raRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: { model: 'grok-4', messages: [] },
        },
      } as unknown as TestContext);

      const fullURL = `${baseURL}${endpoint}`;
      expect(fullURL).toBe('https://api.x.ai/v1/chat/completions');
    });

    it('should be properly registered in provider system', () => {
      // This test verifies that the provider is correctly structured
      expect(xaiConfig.api).toBe(xaiAPIConfig);
      expect(xaiConfig[FunctionName.CHAT_COMPLETE]).toBe(xaiChatCompleteConfig);
    });
  });

  describe('xAI-Specific Features', () => {
    it('should support live search parameters', () => {
      const config = xaiChatCompleteConfig;
      expect(config.search_parameters).toBeDefined();
      expect(config.search_parameters).toHaveProperty(
        'param',
        'search_parameters',
      );
    });

    it('should support web search options', () => {
      const config = xaiChatCompleteConfig;
      expect(config.web_search_options).toBeDefined();
      expect(config.web_search_options).toHaveProperty(
        'param',
        'web_search_options',
      );
    });

    it('should support reasoning effort parameter', () => {
      const config = xaiChatCompleteConfig;
      expect(config.reasoning_effort).toBeDefined();
      expect(config.reasoning_effort).toHaveProperty(
        'param',
        'reasoning_effort',
      );
    });

    it('should support deferred responses', () => {
      const config = xaiChatCompleteConfig;
      expect(config.deferred).toBeDefined();
      expect(config.deferred).toHaveProperty('param', 'deferred');
      expect(config.deferred).toHaveProperty('default', false);
    });
  });
});
