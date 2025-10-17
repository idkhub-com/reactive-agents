import mistralAIAPIConfig from '@server/ai-providers/mistral-ai/api';
import {
  mistralAIChatCompleteConfig,
  mistralAIChatCompleteResponseTransform,
  mistralAIChatCompleteStreamChunkTransform,
} from '@server/ai-providers/mistral-ai/chat-complete';
import {
  mistralAIEmbedConfig,
  mistralAIEmbedResponseTransform,
} from '@server/ai-providers/mistral-ai/embed';
import { mistralAIConfig } from '@server/ai-providers/mistral-ai/index';
import type {
  MistralAIChatCompleteResponse,
  MistralAIEmbedResponse,
  MistralAIStreamChunk,
} from '@server/ai-providers/mistral-ai/types';
import { mistralAIErrorResponseTransform } from '@server/ai-providers/mistral-ai/utils';
import type { IdkRequestData } from '@shared/types/api/request';
import { FunctionName } from '@shared/types/api/request';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestContext = Parameters<typeof mistralAIAPIConfig.getBaseURL>[0];
type EmbedResponseType = {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
};

describe('Mistral AI Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    it('should have all required configuration properties', () => {
      expect(mistralAIConfig).toBeDefined();
      expect(mistralAIConfig.api).toBeDefined();
      expect(mistralAIConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(mistralAIConfig[FunctionName.EMBED]).toBeDefined();
      expect(mistralAIConfig.responseTransforms).toBeDefined();
    });

    it('should have response transforms for all supported functions', () => {
      expect(
        mistralAIConfig.responseTransforms?.[FunctionName.CHAT_COMPLETE],
      ).toBeDefined();
      expect(
        mistralAIConfig.responseTransforms?.[FunctionName.STREAM_CHAT_COMPLETE],
      ).toBeDefined();
      expect(
        mistralAIConfig.responseTransforms?.[FunctionName.EMBED],
      ).toBeDefined();
    });

    it('should support chat completions and embeddings', () => {
      expect(mistralAIConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(mistralAIConfig[FunctionName.EMBED]).toBeDefined();
      expect(mistralAIConfig[FunctionName.COMPLETE]).toBeUndefined();
      expect(mistralAIConfig[FunctionName.GENERATE_IMAGE]).toBeUndefined();
    });
  });

  describe('API Configuration', () => {
    it('should return Mistral AI API as default base URL', () => {
      const baseURL = mistralAIAPIConfig.getBaseURL({
        idkTarget: { provider: AIProvider.MISTRAL_AI },
      } as unknown as TestContext);
      expect(baseURL).toBe('https://api.mistral.ai/v1');
    });

    it('should use custom_host when provided', () => {
      const baseURL = mistralAIAPIConfig.getBaseURL({
        idkTarget: {
          provider: AIProvider.MISTRAL_AI,
          custom_host: 'https://custom-mistral.example.com/v1',
        },
      } as unknown as TestContext);
      expect(baseURL).toBe('https://custom-mistral.example.com/v1');
    });

    it('should use custom_host for self-hosted instances', () => {
      const baseURL = mistralAIAPIConfig.getBaseURL({
        idkTarget: {
          provider: AIProvider.MISTRAL_AI,
          custom_host: 'http://localhost:8000/v1',
        },
      } as unknown as TestContext);
      expect(baseURL).toBe('http://localhost:8000/v1');
    });

    it('should return correct headers with API key', () => {
      const headers = mistralAIAPIConfig.headers({
        idkTarget: {
          provider: AIProvider.MISTRAL_AI,
          api_key: 'mistral-key-123',
        },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer mistral-key-123',
      });
    });

    it('should return headers without API key when not provided', () => {
      const headers = mistralAIAPIConfig.headers({
        idkTarget: { provider: AIProvider.MISTRAL_AI },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should return correct endpoint for chat completion', () => {
      const endpoint = mistralAIAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: { model: 'mistral-tiny', messages: [] },
        },
        idkTarget: { provider: AIProvider.MISTRAL_AI },
      } as unknown as TestContext);

      expect(endpoint).toBe('/chat/completions');
    });

    it('should return correct endpoint for streaming chat completion', () => {
      const endpoint = mistralAIAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.STREAM_CHAT_COMPLETE,
          requestBody: { model: 'mistral-tiny', messages: [] },
        },
        idkTarget: { provider: AIProvider.MISTRAL_AI },
      } as unknown as TestContext);

      expect(endpoint).toBe('/chat/completions');
    });

    it('should return correct endpoint for embeddings', () => {
      const endpoint = mistralAIAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.EMBED,
          requestBody: { model: 'mistral-embed', input: 'test' },
        },
        idkTarget: { provider: AIProvider.MISTRAL_AI },
      } as unknown as TestContext);

      expect(endpoint).toBe('/embeddings');
    });

    it('should return FIM endpoint when mistral_fim_completion is true', () => {
      const endpoint = mistralAIAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: { model: 'mistral-tiny', messages: [] },
        },
        idkTarget: {
          provider: AIProvider.MISTRAL_AI,
          mistral_fim_completion: 'true',
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('/fim/completions');
    });

    it('should return empty string for unsupported functions', () => {
      const endpoint = mistralAIAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.GENERATE_IMAGE,
          requestBody: {},
        },
        idkTarget: { provider: AIProvider.MISTRAL_AI },
      } as unknown as TestContext);

      expect(endpoint).toBe('');
    });

    it('should validate custom_host URL format', () => {
      expect(() => {
        mistralAIAPIConfig.getBaseURL({
          idkTarget: {
            provider: AIProvider.MISTRAL_AI,
            custom_host: 'invalid-url',
          },
        } as unknown as TestContext);
      }).toThrow('Invalid custom_host URL');
    });

    it('should reject non-HTTP protocols', () => {
      expect(() => {
        mistralAIAPIConfig.getBaseURL({
          idkTarget: {
            provider: AIProvider.MISTRAL_AI,
            custom_host: 'ftp://example.com',
          },
        } as unknown as TestContext);
      }).toThrow('Only HTTP and HTTPS protocols are allowed');
    });
  });

  describe('Chat Complete Configuration', () => {
    it('should have correct model configuration', () => {
      const config = mistralAIChatCompleteConfig;
      expect(config.model).toBeDefined();
      expect(config.model).toHaveProperty('param', 'model');
      expect(config.model).toHaveProperty('required', true);
      expect(config.model).toHaveProperty('default', 'mistral-tiny');
    });

    it('should have correct parameter configurations', () => {
      const config = mistralAIChatCompleteConfig;

      expect(config.messages).toBeDefined();
      expect(config.max_tokens).toBeDefined();
      expect(config.max_completion_tokens).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.top_p).toBeDefined();
      expect(config.stream).toBeDefined();
    });

    it('should have correct temperature limits', () => {
      const config = mistralAIChatCompleteConfig;
      expect(config.temperature).toHaveProperty('min', 0);
      expect(config.temperature).toHaveProperty('max', 1);
      expect(config.temperature).toHaveProperty('default', 0.7);
    });

    it('should have correct penalty configurations', () => {
      const config = mistralAIChatCompleteConfig;
      expect(config.presence_penalty).toHaveProperty('min', -2);
      expect(config.presence_penalty).toHaveProperty('max', 2);
      expect(config.frequency_penalty).toHaveProperty('min', -2);
      expect(config.frequency_penalty).toHaveProperty('max', 2);
    });

    it('should support tool calling', () => {
      const config = mistralAIChatCompleteConfig;
      expect(config.tools).toBeDefined();
    });

    it('should support response format', () => {
      const config = mistralAIChatCompleteConfig;
      expect(config.response_format).toBeDefined();
    });

    it('should support seed parameter', () => {
      const config = mistralAIChatCompleteConfig;
      expect(config.seed).toBeDefined();
    });

    it('should support stop sequences', () => {
      const config = mistralAIChatCompleteConfig;
      expect(config.stop).toBeDefined();
    });

    it('should support Mistral AI specific parameters', () => {
      const config = mistralAIChatCompleteConfig;
      expect(config.safe_prompt).toBeDefined();
      expect(config.safe_mode).toBeDefined();
      expect(config.prompt).toBeDefined();
      expect(config.suffix).toBeDefined();
      expect(config.parallel_tool_calls).toBeDefined();
    });

    it('should transform developer role to system role', () => {
      const config = mistralAIChatCompleteConfig;
      const messagesConfig = Array.isArray(config.messages)
        ? config.messages[0]
        : config.messages;
      const transform = messagesConfig?.transform;

      expect(transform).toBeDefined();

      if (transform) {
        const result = transform({
          messages: [
            {
              role: ChatCompletionMessageRole.DEVELOPER,
              content: 'System message',
            },
            { role: ChatCompletionMessageRole.USER, content: 'User message' },
          ],
        } as never);

        expect(result).toEqual([
          { role: 'system', content: 'System message' },
          { role: ChatCompletionMessageRole.USER, content: 'User message' },
        ]);
      }
    });

    it('should transform tool_choice from required to any', () => {
      const config = mistralAIChatCompleteConfig;
      const toolChoiceConfig = Array.isArray(config.tool_choice)
        ? config.tool_choice[0]
        : config.tool_choice;
      const transform = toolChoiceConfig?.transform;

      expect(transform).toBeDefined();

      if (transform) {
        const result = transform({
          tool_choice: 'required',
        } as never);

        expect(result).toBe('any');
      }
    });
  });

  describe('Embed Configuration', () => {
    it('should have correct model configuration', () => {
      const config = mistralAIEmbedConfig;
      expect(config.model).toBeDefined();
      expect(config.model).toHaveProperty('param', 'model');
      expect(config.model).toHaveProperty('default', 'mistral-embed');
    });

    it('should have correct input configuration', () => {
      const config = mistralAIEmbedConfig;
      expect(config.input).toBeDefined();
      expect(config.input).toHaveProperty('param', 'input');
      expect(config.input).toHaveProperty('required', true);
    });
  });

  describe('Error Response Transform', () => {
    it('should transform string error response', () => {
      const response = {
        error: 'Model not found',
      };

      const result = mistralAIErrorResponseTransform(response, 404);

      expect(result).toMatchObject({
        error: {
          message: 'mistral-ai error: Model not found',
          type: undefined,
          param: undefined,
          code: '404',
        },
        provider: AIProvider.MISTRAL_AI,
      });
    });

    it('should transform object error response', () => {
      const response = {
        error: {
          message: 'Invalid request',
          type: 'invalid_request_error',
          code: 'invalid_model',
        },
      };

      const result = mistralAIErrorResponseTransform(response);

      expect(result).toMatchObject({
        error: {
          message: 'mistral-ai error: Invalid request',
          type: 'invalid_request_error',
          code: 'invalid_model',
        },
        provider: AIProvider.MISTRAL_AI,
      });
    });

    it('should handle missing error object', () => {
      const response = {};

      const result = mistralAIErrorResponseTransform(response);

      expect(result).toMatchObject({
        error: {
          message: 'mistral-ai error: Unknown error',
        },
        provider: AIProvider.MISTRAL_AI,
      });
    });
  });

  describe('Chat Complete Response Transform', () => {
    it('should transform successful chat completion response', () => {
      const mistralResponse: MistralAIChatCompleteResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'mistral-tiny',
        choices: [
          {
            index: 0,
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: 'Hello! How can I help you?',
            },
            finish_reason: ChatCompletionFinishReason.STOP,
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        system_fingerprint: 'fp_123',
      };

      const result = mistralAIChatCompleteResponseTransform(
        mistralResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        false,
        {} as IdkRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.id).toBe('chatcmpl-123');
      expect(result.model).toBe('mistral-tiny');
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.MISTRAL_AI,
      );
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe(
        'Hello! How can I help you?',
      );
      expect(result.usage?.total_tokens).toBe(30);
    });

    it('should transform error response with status !== 200', () => {
      const errorResponse = {
        error: {
          message: 'Model not found',
          type: 'not_found_error',
        },
      };

      const result = mistralAIChatCompleteResponseTransform(
        errorResponse,
        404,
        new Headers(),
        false,
        {} as IdkRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('mistral-ai error: Model not found');
      expect(result.provider).toBe(AIProvider.MISTRAL_AI);
    });

    it('should handle response without choices', () => {
      const response = {
        id: 'test-id',
        object: 'chat.completion',
        created: 123,
        model: 'mistral-tiny',
      };

      const result = mistralAIChatCompleteResponseTransform(
        response,
        200,
        new Headers(),
        false,
        {} as IdkRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.provider).toBe(AIProvider.MISTRAL_AI);
    });

    it('should handle null tool_calls in response', () => {
      // Simulate the actual Mistral AI response with null tool_calls
      const mistralResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'mistral-tiny',
        choices: [
          {
            index: 0,
            message: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: 'Hello! How can I help you?',
              tool_calls: null, // This is what Mistral AI actually returns
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

      const result = mistralAIChatCompleteResponseTransform(
        mistralResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        false,
        {} as IdkRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.id).toBe('chatcmpl-123');
      expect(result.model).toBe('mistral-tiny');
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].message.content).toBe(
        'Hello! How can I help you?',
      );
      // tool_calls should be undefined, not null (our transform fixes this)
      expect(result.choices[0].message.tool_calls).toBeUndefined();
    });
  });

  describe('Stream Chunk Transform', () => {
    it('should transform streaming chunk', () => {
      const streamChunk: MistralAIStreamChunk = {
        id: 'chatcmpl-123',
        object: 'chat.completion.chunk',
        created: 1234567890,
        model: 'mistral-tiny',
        choices: [
          {
            delta: {
              role: ChatCompletionMessageRole.ASSISTANT,
              content: 'Hello',
            },
            index: 0,
            finish_reason: null,
          },
        ],
      };

      const chunkString = `data: ${JSON.stringify(streamChunk)}`;
      const result = mistralAIChatCompleteStreamChunkTransform(
        chunkString,
        'fallback-id',
        {},
        false,
        {} as IdkRequestData,
      );

      expect(result).toContain('data: ');
      expect(result).toContain('"provider":"mistral-ai"');
      expect(result).toContain('"model":"mistral-tiny"');
      expect(result).toContain('\n\n');
    });

    it('should handle [DONE] marker', () => {
      const result = mistralAIChatCompleteStreamChunkTransform(
        'data: [DONE]',
        'fallback-id',
        {},
        false,
        {} as IdkRequestData,
      );

      expect(result).toBe('data: [DONE]\n\n');
    });

    it('should throw on malformed streaming chunk', () => {
      expect(() => {
        mistralAIChatCompleteStreamChunkTransform(
          'data: {invalid json',
          'fallback-id',
          {},
          false,
          {} as IdkRequestData,
        );
      }).toThrow();
    });

    it('should trim whitespace from chunks', () => {
      const streamChunk: MistralAIStreamChunk = {
        id: 'test',
        object: 'chat.completion.chunk',
        created: 123,
        model: 'mistral-tiny',
        choices: [
          {
            delta: { content: 'test' },
            index: 0,
            finish_reason: null,
          },
        ],
      };

      const chunkString = `  data: ${JSON.stringify(streamChunk)}  `;
      const result = mistralAIChatCompleteStreamChunkTransform(
        chunkString,
        'fallback-id',
        {},
        false,
        {} as IdkRequestData,
      );

      expect(result).toContain('"provider":"mistral-ai"');
    });
  });

  describe('Embed Response Transform', () => {
    it('should transform successful embed response', () => {
      const mistralResponse: MistralAIEmbedResponse = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            embedding: [0.1, 0.2, 0.3, 0.4],
            index: 0,
          },
        ],
        model: 'mistral-embed',
        usage: {
          prompt_tokens: 5,
          total_tokens: 5,
        },
      };

      const result = mistralAIEmbedResponseTransform(
        mistralResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        false,
        {
          requestBody: { model: 'mistral-embed', input: 'test' },
        } as IdkRequestData,
      ) as EmbedResponseType;

      expect(result.object).toBe('list');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].object).toBe('embedding');
      expect(result.data[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(result.data[0].index).toBe(0);
      expect(result.model).toBe('mistral-embed');
      expect(result.usage?.prompt_tokens).toBe(5);
      expect(result.usage?.total_tokens).toBe(5);
    });

    it('should use model from request body if not in response', () => {
      const mistralResponse: MistralAIEmbedResponse = {
        object: 'list',
        data: [
          {
            object: 'embedding',
            embedding: [0.1, 0.2, 0.3],
            index: 0,
          },
        ],
        model: '',
        usage: {
          prompt_tokens: 3,
          total_tokens: 3,
        },
      };

      const result = mistralAIEmbedResponseTransform(
        mistralResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        false,
        {
          requestBody: { model: 'mistral-embed', input: 'test' },
        } as IdkRequestData,
      ) as EmbedResponseType;

      expect(result.model).toBe('mistral-embed');
    });

    it('should transform embed error response', () => {
      const errorResponse = {
        error: 'Invalid model',
      };

      const result = mistralAIEmbedResponseTransform(
        errorResponse,
        400,
        new Headers(),
        false,
        {
          requestBody: { model: 'mistral-embed', input: 'test' },
        } as IdkRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('mistral-ai error: Invalid model');
      expect(result.provider).toBe(AIProvider.MISTRAL_AI);
    });

    it('should handle response without data', () => {
      const response = {
        object: 'list',
        model: 'mistral-embed',
        usage: {
          prompt_tokens: 0,
          total_tokens: 0,
        },
      };

      const result = mistralAIEmbedResponseTransform(
        response,
        200,
        new Headers(),
        false,
        {
          requestBody: { model: 'mistral-embed', input: 'test' },
        } as IdkRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.provider).toBe(AIProvider.MISTRAL_AI);
    });
  });
});
