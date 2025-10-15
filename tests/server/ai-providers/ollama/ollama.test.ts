import OllamaAPIConfig from '@server/ai-providers/ollama/api';
import {
  OllamaChatCompleteConfig,
  OllamaChatCompleteResponseTransform,
  OllamaChatCompleteStreamChunkTransform,
} from '@server/ai-providers/ollama/chat-complete';
import {
  OllamaEmbedConfig,
  OllamaEmbedResponseTransform,
} from '@server/ai-providers/ollama/embed';
import { ollamaConfig } from '@server/ai-providers/ollama/index';
import type {
  OllamaChatCompleteResponse,
  OllamaEmbedResponse,
  OllamaStreamChunk,
} from '@server/ai-providers/ollama/types';
import { ollamaErrorResponseTransform } from '@server/ai-providers/ollama/utils';
import type { IdkRequestData } from '@shared/types/api/request';
import { FunctionName } from '@shared/types/api/request';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import type { ChatCompletionResponseBody } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionFinishReason } from '@shared/types/api/routes/chat-completions-api';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type TestContext = Parameters<typeof OllamaAPIConfig.getBaseURL>[0];
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

describe('Ollama Provider Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Configuration', () => {
    it('should have all required configuration properties', () => {
      expect(ollamaConfig).toBeDefined();
      expect(ollamaConfig.api).toBeDefined();
      expect(ollamaConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(ollamaConfig[FunctionName.EMBED]).toBeDefined();
      expect(ollamaConfig.responseTransforms).toBeDefined();
    });

    it('should have response transforms for all supported functions', () => {
      expect(
        ollamaConfig.responseTransforms?.[FunctionName.CHAT_COMPLETE],
      ).toBeDefined();
      expect(
        ollamaConfig.responseTransforms?.[FunctionName.STREAM_CHAT_COMPLETE],
      ).toBeDefined();
      expect(
        ollamaConfig.responseTransforms?.[FunctionName.EMBED],
      ).toBeDefined();
    });

    it('should support chat completions and embeddings', () => {
      expect(ollamaConfig[FunctionName.CHAT_COMPLETE]).toBeDefined();
      expect(ollamaConfig[FunctionName.EMBED]).toBeDefined();
      expect(ollamaConfig[FunctionName.COMPLETE]).toBeUndefined();
      expect(ollamaConfig[FunctionName.GENERATE_IMAGE]).toBeUndefined();
    });
  });

  describe('API Configuration', () => {
    it('should return localhost as default base URL for self-hosting', () => {
      const baseURL = OllamaAPIConfig.getBaseURL({
        idkTarget: { provider: AIProvider.OLLAMA },
      } as unknown as TestContext);
      expect(baseURL).toBe('http://localhost:11434');
    });

    it('should use custom_host when provided', () => {
      const baseURL = OllamaAPIConfig.getBaseURL({
        idkTarget: {
          provider: AIProvider.OLLAMA,
          custom_host: 'http://192.168.1.100:11434',
        },
      } as unknown as TestContext);
      expect(baseURL).toBe('http://192.168.1.100:11434');
    });

    it('should use custom_host for remote Ollama instances', () => {
      const baseURL = OllamaAPIConfig.getBaseURL({
        idkTarget: {
          provider: AIProvider.OLLAMA,
          custom_host: 'https://ollama.example.com',
        },
      } as unknown as TestContext);
      expect(baseURL).toBe('https://ollama.example.com');
    });

    it('should return correct headers with API key for remote instances', () => {
      const headers = OllamaAPIConfig.headers({
        idkTarget: { provider: AIProvider.OLLAMA, api_key: 'ollama-key-123' },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'x-ollama-api-key': 'ollama-key-123',
      });
    });

    it('should return headers with empty API key for local instances', () => {
      const headers = OllamaAPIConfig.headers({
        idkTarget: { provider: AIProvider.OLLAMA },
      } as unknown as TestContext);

      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'x-ollama-api-key': '',
      });
    });

    it('should return correct endpoint for chat completion', () => {
      const endpoint = OllamaAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.CHAT_COMPLETE,
          requestBody: { model: 'llama2', messages: [] },
        },
        idkTarget: { provider: AIProvider.OLLAMA },
      } as unknown as TestContext);

      expect(endpoint).toBe('/v1/chat/completions');
    });

    it('should return correct endpoint for streaming chat completion', () => {
      const endpoint = OllamaAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.STREAM_CHAT_COMPLETE,
          requestBody: { model: 'llama2', messages: [] },
        },
        idkTarget: { provider: AIProvider.OLLAMA },
      } as unknown as TestContext);

      expect(endpoint).toBe('/v1/chat/completions');
    });

    it('should return correct endpoint for embeddings', () => {
      const endpoint = OllamaAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.EMBED,
          requestBody: { model: 'llama2', input: 'test' },
        },
        idkTarget: { provider: AIProvider.OLLAMA },
      } as unknown as TestContext);

      expect(endpoint).toBe('/api/embeddings');
    });

    it('should handle proxy requests for chat', () => {
      const endpoint = OllamaAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.PROXY,
          requestBody: {},
        },
        idkTarget: {
          provider: AIProvider.OLLAMA,
          ollama_url_to_fetch: '/api/chat/something',
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('/v1/chat/completions');
    });

    it('should handle proxy requests for embeddings', () => {
      const endpoint = OllamaAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.PROXY,
          requestBody: {},
        },
        idkTarget: {
          provider: AIProvider.OLLAMA,
          ollama_url_to_fetch: '/embeddings',
        },
      } as unknown as TestContext);

      expect(endpoint).toBe('/api/embeddings');
    });

    it('should return empty string for unsupported functions', () => {
      const endpoint = OllamaAPIConfig.getEndpoint({
        idkRequestData: {
          functionName: FunctionName.GENERATE_IMAGE,
          requestBody: {},
        },
        idkTarget: { provider: AIProvider.OLLAMA },
      } as unknown as TestContext);

      expect(endpoint).toBe('');
    });
  });

  describe('Chat Complete Configuration', () => {
    it('should have correct model configuration', () => {
      const config = OllamaChatCompleteConfig;
      expect(config.model).toBeDefined();
      expect(config.model).toHaveProperty('param', 'model');
      expect(config.model).toHaveProperty('required', true);
      expect(config.model).toHaveProperty('default', 'llama2');
    });

    it('should have correct parameter configurations', () => {
      const config = OllamaChatCompleteConfig;

      expect(config.messages).toBeDefined();
      expect(config.max_tokens).toBeDefined();
      expect(config.max_completion_tokens).toBeDefined();
      expect(config.temperature).toBeDefined();
      expect(config.top_p).toBeDefined();
      expect(config.stream).toBeDefined();
    });

    it('should have correct temperature limits', () => {
      const config = OllamaChatCompleteConfig;
      expect(config.temperature).toHaveProperty('min', 0);
      expect(config.temperature).toHaveProperty('max', 2);
      expect(config.temperature).toHaveProperty('default', 1);
    });

    it('should have correct penalty configurations', () => {
      const config = OllamaChatCompleteConfig;
      expect(config.presence_penalty).toHaveProperty('min', -2);
      expect(config.presence_penalty).toHaveProperty('max', 2);
      expect(config.frequency_penalty).toHaveProperty('min', -2);
      expect(config.frequency_penalty).toHaveProperty('max', 2);
    });

    it('should support tool calling', () => {
      const config = OllamaChatCompleteConfig;
      expect(config.tools).toBeDefined();
    });

    it('should support response format', () => {
      const config = OllamaChatCompleteConfig;
      expect(config.response_format).toBeDefined();
    });

    it('should support seed parameter', () => {
      const config = OllamaChatCompleteConfig;
      expect(config.seed).toBeDefined();
    });

    it('should support stop sequences', () => {
      const config = OllamaChatCompleteConfig;
      expect(config.stop).toBeDefined();
    });

    it('should transform developer role to system role', () => {
      const config = OllamaChatCompleteConfig;
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
  });

  describe('Embed Configuration', () => {
    it('should have correct model configuration', () => {
      const config = OllamaEmbedConfig;
      expect(config.model).toBeDefined();
      expect(config.model).toHaveProperty('param', 'model');
    });

    it('should have correct input configuration', () => {
      const config = OllamaEmbedConfig;
      expect(config.input).toBeDefined();
      expect(config.input).toHaveProperty('param', 'prompt');
      expect(config.input).toHaveProperty('required', true);
    });
  });

  describe('Error Response Transform', () => {
    it('should transform string error response', () => {
      const response = {
        error: 'Model not found',
      };

      const result = ollamaErrorResponseTransform(response, 404);

      expect(result).toMatchObject({
        error: {
          message: 'ollama error: Model not found',
          type: undefined,
          param: undefined,
          code: '404',
        },
        provider: AIProvider.OLLAMA,
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

      const result = ollamaErrorResponseTransform(response);

      expect(result).toMatchObject({
        error: {
          message: 'ollama error: Invalid request',
          type: 'invalid_request_error',
          code: 'invalid_model',
        },
        provider: AIProvider.OLLAMA,
      });
    });

    it('should handle missing error object', () => {
      const response = {};

      const result = ollamaErrorResponseTransform(response);

      expect(result).toMatchObject({
        error: {
          message: 'ollama error: Unknown error',
        },
        provider: AIProvider.OLLAMA,
      });
    });
  });

  describe('Chat Complete Response Transform', () => {
    it('should transform successful chat completion response', () => {
      const ollamaResponse: OllamaChatCompleteResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'llama2',
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

      const result = OllamaChatCompleteResponseTransform(
        ollamaResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        false,
        {} as IdkRequestData,
      ) as ChatCompletionResponseBody;

      expect(result.id).toBe('chatcmpl-123');
      expect(result.model).toBe('llama2');
      expect((result as unknown as { provider: string }).provider).toBe(
        AIProvider.OLLAMA,
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

      const result = OllamaChatCompleteResponseTransform(
        errorResponse,
        404,
        new Headers(),
        false,
        {} as IdkRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('ollama error: Model not found');
      expect(result.provider).toBe(AIProvider.OLLAMA);
    });

    it('should handle response without choices', () => {
      const response = {
        id: 'test-id',
        object: 'chat.completion',
        created: 123,
        model: 'llama2',
      };

      const result = OllamaChatCompleteResponseTransform(
        response,
        200,
        new Headers(),
        false,
        {} as IdkRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.provider).toBe(AIProvider.OLLAMA);
    });
  });

  describe('Stream Chunk Transform', () => {
    it('should transform streaming chunk', () => {
      const streamChunk: OllamaStreamChunk = {
        id: 'chatcmpl-123',
        object: 'chat.completion.chunk',
        created: 1234567890,
        model: 'llama2',
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
      const result = OllamaChatCompleteStreamChunkTransform(
        chunkString,
        'fallback-id',
        {},
        false,
        {} as IdkRequestData,
      );

      expect(result).toContain('data: ');
      expect(result).toContain('"provider":"ollama"');
      expect(result).toContain('"model":"llama2"');
      expect(result).toContain('\n\n');
    });

    it('should handle [DONE] marker', () => {
      const result = OllamaChatCompleteStreamChunkTransform(
        'data: [DONE]',
        'fallback-id',
        {},
        false,
        {} as IdkRequestData,
      );

      expect(result).toBe('data: [DONE]\n\n');
    });

    it('should handle malformed streaming chunk gracefully', () => {
      const result = OllamaChatCompleteStreamChunkTransform(
        'data: {invalid json',
        'fallback-id',
        {},
        false,
        {} as IdkRequestData,
      );

      expect(result).toContain('data: ');
      expect(result).toContain('\n\n');
    });

    it('should trim whitespace from chunks', () => {
      const streamChunk: OllamaStreamChunk = {
        id: 'test',
        object: 'chat.completion.chunk',
        created: 123,
        model: 'llama2',
        choices: [
          {
            delta: { content: 'test' },
            index: 0,
            finish_reason: null,
          },
        ],
      };

      const chunkString = `  data: ${JSON.stringify(streamChunk)}  `;
      const result = OllamaChatCompleteStreamChunkTransform(
        chunkString,
        'fallback-id',
        {},
        false,
        {} as IdkRequestData,
      );

      expect(result).toContain('"provider":"ollama"');
    });
  });

  describe('Embed Response Transform', () => {
    it('should transform successful embed response', () => {
      const ollamaResponse: OllamaEmbedResponse = {
        embedding: [0.1, 0.2, 0.3, 0.4],
        model: 'llama2',
      };

      const result = OllamaEmbedResponseTransform(
        ollamaResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        false,
        {
          requestBody: { model: 'llama2', input: 'test' },
        } as IdkRequestData,
      ) as EmbedResponseType;

      expect(result.object).toBe('list');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].object).toBe('embedding');
      expect(result.data[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4]);
      expect(result.data[0].index).toBe(0);
      expect(result.model).toBe('llama2');
    });

    it('should use model from request body if not in response', () => {
      const ollamaResponse: OllamaEmbedResponse = {
        embedding: [0.1, 0.2, 0.3],
      };

      const result = OllamaEmbedResponseTransform(
        ollamaResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        false,
        {
          requestBody: { model: 'nomic-embed-text', input: 'test' },
        } as IdkRequestData,
      ) as EmbedResponseType;

      expect(result.model).toBe('nomic-embed-text');
    });

    it('should transform embed error response', () => {
      const errorResponse = {
        error: 'Invalid model',
      };

      const result = OllamaEmbedResponseTransform(
        errorResponse,
        400,
        new Headers(),
        false,
        {
          requestBody: { model: 'llama2', input: 'test' },
        } as IdkRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('ollama error: Invalid model');
      expect(result.provider).toBe(AIProvider.OLLAMA);
    });

    it('should handle response without embedding', () => {
      const response = {
        model: 'llama2',
      };

      const result = OllamaEmbedResponseTransform(
        response,
        200,
        new Headers(),
        false,
        {
          requestBody: { model: 'llama2', input: 'test' },
        } as IdkRequestData,
      ) as ErrorResponseBody;

      expect(result.error).toBeDefined();
      expect(result.provider).toBe(AIProvider.OLLAMA);
    });

    it('should set usage tokens to -1', () => {
      const ollamaResponse: OllamaEmbedResponse = {
        embedding: [0.1, 0.2],
        model: 'llama2',
      };

      const result = OllamaEmbedResponseTransform(
        ollamaResponse as unknown as Record<string, unknown>,
        200,
        new Headers(),
        false,
        {
          requestBody: { model: 'llama2', input: 'test' },
        } as IdkRequestData,
      ) as EmbedResponseType;

      expect(result.usage?.prompt_tokens).toBe(-1);
      expect(result.usage?.total_tokens).toBe(-1);
    });
  });
});
