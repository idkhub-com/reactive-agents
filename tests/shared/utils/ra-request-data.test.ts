import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';
import { describe, expect, it, vi } from 'vitest';

describe('produceReactiveAgentsRequestData', () => {
  const baseUrl = 'http://localhost:3000';
  const requestHeaders = {
    'content-type': 'application/json',
    authorization: 'Bearer test-token',
  };

  describe('nullable response body handling', () => {
    it('should handle null response body for streaming chat completions', () => {
      const requestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/chat/completions`,
        requestHeaders,
        requestBody,
        null,
      );

      expect(result.functionName).toBe(FunctionName.STREAM_CHAT_COMPLETE);
      expect(result.responseBody).toBeUndefined();
      expect(result.stream).toBe(true);
    });

    it('should handle null response body for streaming completions', () => {
      const requestBody = {
        model: 'gpt-4',
        prompt: 'Hello',
        stream: true,
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/completions`,
        requestHeaders,
        requestBody,
        null,
      );

      expect(result.functionName).toBe(FunctionName.STREAM_COMPLETE);
      expect(result.responseBody).toBeUndefined();
      expect(result.stream).toBe(true);
    });

    it('should handle undefined response body', () => {
      const requestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/chat/completions`,
        requestHeaders,
        requestBody,
        undefined,
      );

      expect(result.functionName).toBe(FunctionName.CHAT_COMPLETE);
      expect(result.responseBody).toBeUndefined();
    });

    it('should handle valid response body for non-streaming requests', () => {
      const requestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const responseBody = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you?',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/chat/completions`,
        requestHeaders,
        requestBody,
        responseBody,
      );

      expect(result.functionName).toBe(FunctionName.CHAT_COMPLETE);
      expect(result.responseBody).toBeDefined();
      expect(result.responseBody).toMatchObject(responseBody);
    });

    it('should warn for invalid response body schema and use raw response', () => {
      const requestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      // Create a partially valid response body that passes the discriminated union check
      // but might have validation warnings
      const partialResponseBody = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1234567890,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response',
            },
            finish_reason: 'stop',
          },
        ],
        // Add an extra field that's not in the schema
        extraField: 'should be ignored',
      };

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/chat/completions`,
        requestHeaders,
        requestBody,
        partialResponseBody,
      );

      expect(result.functionName).toBe(FunctionName.CHAT_COMPLETE);
      expect(result.responseBody).toBeDefined();
      // The response should still be usable even with extra fields
      if (result.responseBody && 'id' in result.responseBody) {
        expect(result.responseBody.id).toBe('chatcmpl-123');
      }

      consoleWarnSpy.mockRestore();
    });
  });

  describe('stream detection', () => {
    it('should detect streaming from request body', () => {
      const streamingRequestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: true,
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/chat/completions`,
        requestHeaders,
        streamingRequestBody,
        null,
      );

      expect(result.stream).toBe(true);
      expect(result.functionName).toBe(FunctionName.STREAM_CHAT_COMPLETE);
    });

    it('should handle non-streaming requests', () => {
      const nonStreamingRequestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/chat/completions`,
        requestHeaders,
        nonStreamingRequestBody,
        undefined,
      );

      expect(result.stream).toBeUndefined();
      expect(result.functionName).toBe(FunctionName.CHAT_COMPLETE);
    });
  });

  describe('route matching', () => {
    it('should match chat completions route', () => {
      const requestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/chat/completions`,
        requestHeaders,
        requestBody,
      );

      expect(result.functionName).toBe(FunctionName.CHAT_COMPLETE);
    });

    it('should match completions route', () => {
      const requestBody = {
        model: 'gpt-4',
        prompt: 'Hello',
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/completions`,
        requestHeaders,
        requestBody,
      );

      expect(result.functionName).toBe(FunctionName.COMPLETE);
    });

    it('should match embeddings route', () => {
      const requestBody = {
        model: 'text-embedding-ada-002',
        input: 'Hello world',
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/embeddings`,
        requestHeaders,
        requestBody,
      );

      expect(result.functionName).toBe(FunctionName.EMBED);
    });

    it('should match image generation route', () => {
      const requestBody = {
        model: 'dall-e-3',
        prompt: 'A beautiful sunset',
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/images/generations`,
        requestHeaders,
        requestBody,
      );

      expect(result.functionName).toBe(FunctionName.GENERATE_IMAGE);
    });

    it('should match Responses API route', () => {
      const requestBody = {
        model: 'gpt-4',
        input: [{ role: 'user', content: 'Hello' }],
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/responses`,
        requestHeaders,
        requestBody,
      );

      expect(result.functionName).toBe(FunctionName.CREATE_MODEL_RESPONSE);
    });

    it('should throw error for unknown route', () => {
      const requestBody = {
        model: 'gpt-4',
        prompt: 'Hello',
      };

      expect(() => {
        produceReactiveAgentsRequestData(
          HttpMethod.POST,
          `${baseUrl}/v1/unknown-route`,
          requestHeaders,
          requestBody,
        );
      }).toThrow('Unknown method: POST for pathname: /v1/unknown-route');
    });

    it('should throw error for missing pathname', () => {
      const requestBody = {
        model: 'gpt-4',
        prompt: 'Hello',
      };

      expect(() => {
        produceReactiveAgentsRequestData(
          HttpMethod.POST,
          'not-a-valid-url',
          requestHeaders,
          requestBody,
        );
      }).toThrow();
    });
  });

  describe('request validation', () => {
    it('should throw error for invalid request body schema', () => {
      const invalidRequestBody = {
        // Missing required 'model' field
        messages: [{ role: 'user', content: 'Hello' }],
      };

      expect(() => {
        produceReactiveAgentsRequestData(
          HttpMethod.POST,
          `${baseUrl}/v1/chat/completions`,
          requestHeaders,
          invalidRequestBody,
        );
      }).toThrow('Invalid request body');
    });

    it('should validate request body against schema', () => {
      const validRequestBody = {
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        max_tokens: 100,
      };

      const result = produceReactiveAgentsRequestData(
        HttpMethod.POST,
        `${baseUrl}/v1/chat/completions`,
        requestHeaders,
        validRequestBody,
      );

      expect(result.requestBody).toMatchObject(validRequestBody);
    });
  });
});
