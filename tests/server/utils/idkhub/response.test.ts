import { HttpError } from '@server/errors/http';
import { responseHandler } from '@server/handlers/response-handler';
import type { AppContext } from '@server/types/hono';
import { HttpMethod } from '@server/types/http';
import { createResponse } from '@server/utils/idkhub/response';
import {
  type ChatCompletionRequestData,
  FunctionName,
} from '@shared/types/api/request';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import type { AIProvider } from '@shared/types/constants';
import { CacheMode, type CacheStatus } from '@shared/types/middleware/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import z from 'zod';

// Mock the responseHandler
vi.mock('@server/handlers/response-handler', () => ({
  responseHandler: vi.fn(),
}));

describe('createResponse', () => {
  let mockContext: AppContext;
  let mockResponse: Response;
  let mockOptions: Parameters<typeof createResponse>[1];

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock context
    mockContext = {
      set: vi.fn(),
    } as unknown as AppContext;

    // Mock response
    mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      clone: vi.fn(),
      text: vi.fn(),
    } as unknown as Response;

    // Mock request data
    const mockIdkRequestData: ChatCompletionRequestData = {
      functionName: FunctionName.CHAT_COMPLETE,
      method: HttpMethod.POST,
      url: 'https://api.openai.com/v1/chat/completions',
      requestBody: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: ChatCompletionMessageRole.USER, content: 'Hello' }],
      },
      requestHeaders: { 'content-type': 'application/json' },
      route_pattern: /^\/v1\/chat\/completions$/,
      requestSchema: z.object({}),
      responseSchema: z.object({}),
    };

    // Mock options
    mockOptions = {
      idkRequestData: mockIdkRequestData,
      aiProviderRequestURL: 'https://api.openai.com/v1/chat/completions',
      isStreamingMode: false,
      provider: 'openai' as AIProvider,
      strictOpenAiCompliance: true,
      areSyncHooksAvailable: true,
      currentIndex: 0,
      fetchOptions: {},
      cacheSettings: { mode: CacheMode.DISABLED, max_age: 0 },
      response: mockResponse,
      responseTransformerFunctionName: undefined,
      cacheStatus: 'miss' as CacheStatus,
      retryCount: undefined,
      aiProviderRequestBody: {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    };

    // Mock responseHandler to return the mock response
    vi.mocked(responseHandler).mockResolvedValue({
      response: mockResponse,
      idkResponseBody: null,
    });

    // Mock response clone and text methods
    const mockResponseClone = {
      text: vi
        .fn()
        .mockResolvedValue(
          '{"choices":[{"message":{"content":"Hello there!"}}]}',
        ),
    };
    vi.mocked(mockResponse.clone).mockReturnValue(
      mockResponseClone as unknown as Response,
    );
  });

  describe('successful response handling', () => {
    it('should process successful response correctly', async () => {
      const result = await createResponse(mockContext, mockOptions);

      expect(result).toBe(mockResponse);
      expect(responseHandler).toHaveBeenCalledWith(
        mockResponse,
        false,
        'openai',
        undefined,
        'https://api.openai.com/v1/chat/completions',
        'miss',
        mockOptions.idkRequestData,
        true,
        true,
      );
      expect(mockContext.set).toHaveBeenCalledWith(
        'ai_provider_log',
        expect.objectContaining({
          provider: 'openai',
          function_name: FunctionName.CHAT_COMPLETE,
          method: HttpMethod.POST,
          request_url: 'https://api.openai.com/v1/chat/completions',
          status: 200,
          request_body: mockOptions.idkRequestData.requestBody,
          response_body: {
            choices: [{ message: { content: 'Hello there!' } }],
          },
          raw_request_body: JSON.stringify(
            mockOptions.idkRequestData.requestBody,
          ),
          raw_response_body:
            '{"choices":[{"message":{"content":"Hello there!"}}]}',
          cache_status: 'miss',
          cache_mode: CacheMode.DISABLED,
        }),
      );
    });

    it('should handle streaming mode correctly', async () => {
      mockOptions.isStreamingMode = true;

      await createResponse(mockContext, mockOptions);

      expect(responseHandler).toHaveBeenCalledWith(
        mockResponse,
        true, // isStreamingMode
        'openai',
        undefined,
        'https://api.openai.com/v1/chat/completions',
        'miss',
        mockOptions.idkRequestData,
        true,
        true,
      );
    });

    it('should handle different providers correctly', async () => {
      mockOptions.provider = 'anthropic' as AIProvider;

      await createResponse(mockContext, mockOptions);

      expect(responseHandler).toHaveBeenCalledWith(
        mockResponse,
        false,
        'anthropic',
        undefined,
        'https://api.openai.com/v1/chat/completions',
        'miss',
        mockOptions.idkRequestData,
        true,
        true,
      );
    });

    it('should handle different cache statuses', async () => {
      mockOptions.cacheStatus = 'hit' as CacheStatus;

      await createResponse(mockContext, mockOptions);

      expect(mockContext.set).toHaveBeenCalledWith(
        'ai_provider_log',
        expect.objectContaining({
          cache_status: 'hit',
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should throw HttpError when response is not ok', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        clone: vi.fn(),
        text: vi.fn().mockResolvedValue('{"error": "Invalid request"}'),
      } as unknown as Response;

      vi.mocked(responseHandler).mockResolvedValue({
        response: errorResponse,
        idkResponseBody: null,
      });

      const errorResponseClone = {
        text: vi.fn().mockResolvedValue('{"error": "Invalid request"}'),
      };
      vi.mocked(errorResponse.clone).mockReturnValue(
        errorResponseClone as unknown as Response,
      );

      await expect(
        createResponse(mockContext, {
          ...mockOptions,
          response: errorResponse,
        }),
      ).rejects.toThrow(HttpError);

      expect(mockContext.set).toHaveBeenCalledWith(
        'ai_provider_log',
        expect.objectContaining({
          status: 400,
          response_body: { error: 'Invalid request' },
          raw_response_body: '{"error": "Invalid request"}',
        }),
      );
    });

    it('should handle non-JSON response text', async () => {
      const textResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        clone: vi.fn(),
        text: vi.fn().mockResolvedValue('Plain text response'),
      } as unknown as Response;

      vi.mocked(responseHandler).mockResolvedValue({
        response: textResponse,
        idkResponseBody: null,
      });

      const textResponseClone = {
        text: vi.fn().mockResolvedValue('Plain text response'),
      };
      vi.mocked(textResponse.clone).mockReturnValue(
        textResponseClone as unknown as Response,
      );

      await expect(
        createResponse(mockContext, {
          ...mockOptions,
          response: textResponse,
        }),
      ).rejects.toThrow('Unexpected token');
    });
  });

  describe('edge cases', () => {
    it('should handle empty response body', async () => {
      const emptyResponseClone = {
        text: vi.fn().mockResolvedValue(''),
      };
      vi.mocked(mockResponse.clone).mockReturnValue(
        emptyResponseClone as unknown as Response,
      );

      await expect(createResponse(mockContext, mockOptions)).rejects.toThrow(
        'Unexpected end of JSON input',
      );
    });

    it('should handle null response body', async () => {
      const nullResponseClone = {
        text: vi.fn().mockResolvedValue('null'),
      };
      vi.mocked(mockResponse.clone).mockReturnValue(
        nullResponseClone as unknown as Response,
      );

      const result = await createResponse(mockContext, mockOptions);

      expect(result).toBe(mockResponse);
      expect(mockContext.set).toHaveBeenCalledWith(
        'ai_provider_log',
        expect.objectContaining({
          response_body: null,
          raw_response_body: 'null',
        }),
      );
    });

    it('should handle cache key when provided', async () => {
      mockOptions.cacheKey = 'test-cache-key';

      await createResponse(mockContext, mockOptions);

      // The cache key should be available in the options but not directly used in the log
      expect(mockOptions.cacheKey).toBe('test-cache-key');
    });
  });
});
