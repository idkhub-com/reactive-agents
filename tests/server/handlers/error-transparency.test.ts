import { retryRequest } from '@server/handlers/retry-handler';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('Error Transparency Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HTTP Error Response Handling', () => {
    it('should return HTTP error responses directly without throwing exceptions', async () => {
      // Mock a 400 Bad Request response
      const errorResponse = {
        error: {
          message: 'API key not valid',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({
          'content-type': 'application/json',
        }),
        text: vi.fn().mockResolvedValue(JSON.stringify(errorResponse)),
        json: vi.fn().mockResolvedValue(errorResponse),
      } as unknown as Response);

      const result = await retryRequest(
        'https://api.example.com/test',
        { method: 'POST' },
        0, // No retries
        [], // No retryable status codes
        null, // No timeout
      );

      // Verify the error response is returned directly
      expect(result.response.status).toBe(400);
      expect(result.response.statusText).toBe('Bad Request');

      const responseText = await result.response.text();
      expect(responseText).toBe(JSON.stringify(errorResponse));
    });

    it('should preserve original error messages from providers', async () => {
      // Mock a Gemini API error response
      const geminiError = {
        error: {
          message: 'API key not valid',
          status: 'INVALID_ARGUMENT',
          details: [
            {
              '@type': 'type.googleapis.com/google.rpc.ErrorInfo',
              reason: 'API_KEY_INVALID',
              domain: 'googleapis.com',
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({
          'content-type': 'application/json',
        }),
        text: vi.fn().mockResolvedValue(JSON.stringify(geminiError)),
        json: vi.fn().mockResolvedValue(geminiError),
      } as unknown as Response);

      const result = await retryRequest(
        'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
        { method: 'POST' },
        0, // No retries
        [], // No retryable status codes
        null, // No timeout
      );

      // Verify the original error message is preserved
      expect(result.response.status).toBe(400);
      const responseText = await result.response.text();
      const parsedResponse = JSON.parse(responseText);
      expect(parsedResponse.error.message).toBe('API key not valid');
    });

    it('should preserve HTTP status codes exactly as provided by providers', async () => {
      const testCases = [
        { status: 401, statusText: 'Unauthorized' },
        { status: 403, statusText: 'Forbidden' },
        { status: 404, statusText: 'Not Found' },
        { status: 429, statusText: 'Too Many Requests' },
        { status: 500, statusText: 'Internal Server Error' },
        { status: 502, statusText: 'Bad Gateway' },
        { status: 503, statusText: 'Service Unavailable' },
      ];

      for (const testCase of testCases) {
        const errorResponse = {
          error: {
            message: testCase.statusText,
            type: 'api_error',
          },
        };

        vi.mocked(global.fetch).mockResolvedValue({
          ok: false,
          status: testCase.status,
          statusText: testCase.statusText,
          headers: new Headers({
            'content-type': 'application/json',
          }),
          text: vi.fn().mockResolvedValue(JSON.stringify(errorResponse)),
          json: vi.fn().mockResolvedValue(errorResponse),
        } as unknown as Response);

        const result = await retryRequest(
          'https://api.example.com/test',
          { method: 'POST' },
          0, // No retries
          [], // No retryable status codes
          null, // No timeout
        );

        // Verify the status code is preserved exactly
        expect(result.response.status).toBe(testCase.status);
        expect(result.response.statusText).toBe(testCase.statusText);
      }
    });

    it('should handle non-JSON error responses correctly', async () => {
      // Mock a plain text error response
      const plainTextError = 'Service temporarily unavailable';

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'content-type': 'text/plain',
        }),
        text: vi.fn().mockResolvedValue(plainTextError),
        json: vi.fn().mockRejectedValue(new Error('Not JSON')),
      } as unknown as Response);

      const result = await retryRequest(
        'https://api.example.com/test',
        { method: 'POST' },
        0, // No retries
        [], // No retryable status codes
        null, // No timeout
      );

      // Verify the plain text error is preserved
      expect(result.response.status).toBe(503);
      expect(result.response.statusText).toBe('Service Unavailable');

      const responseText = await result.response.text();
      expect(responseText).toBe(plainTextError);
    });

    it('should handle nested JSON error responses correctly', async () => {
      // Mock a nested error response
      const nestedError = {
        error: {
          message: 'Invalid request parameters',
          details: {
            field: 'model',
            reason: 'Model not found',
            nested: {
              code: 'MODEL_NOT_FOUND',
              suggestion: 'Use a valid model name',
            },
          },
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({
          'content-type': 'application/json',
        }),
        text: vi.fn().mockResolvedValue(JSON.stringify(nestedError)),
        json: vi.fn().mockResolvedValue(nestedError),
      } as unknown as Response);

      const result = await retryRequest(
        'https://api.example.com/test',
        { method: 'POST' },
        0, // No retries
        [], // No retryable status codes
        null, // No timeout
      );

      // Verify the nested error structure is preserved
      expect(result.response.status).toBe(400);
      const responseText = await result.response.text();
      const parsedResponse = JSON.parse(responseText);
      expect(parsedResponse.error.message).toBe('Invalid request parameters');
      expect(parsedResponse.error.details.field).toBe('model');
      expect(parsedResponse.error.details.nested.code).toBe('MODEL_NOT_FOUND');
    });
  });

  describe('Retry Logic Integration', () => {
    it('should return error response after exhausting retries for retryable status codes', async () => {
      // Mock a 429 rate limit response that should be retried
      const rateLimitError = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({
          'content-type': 'application/json',
          'retry-after': '60',
        }),
        text: vi.fn().mockResolvedValue(JSON.stringify(rateLimitError)),
        json: vi.fn().mockResolvedValue(rateLimitError),
      } as unknown as Response);

      // After exhausting retries, should return the error response
      const result = await retryRequest(
        'https://api.example.com/test',
        { method: 'POST' },
        1, // 1 retry
        [429], // 429 is retryable
        null, // No timeout
      );

      // Should return the error response after retries are exhausted
      expect(result.response.status).toBe(429);
      expect(result.response.statusText).toBe('Too Many Requests');
      expect(result.attempt).toBe(1); // Should have made 1 retry attempt

      const responseText = await result.response.text();
      const parsedResponse = JSON.parse(responseText);
      expect(parsedResponse.error.message).toBe('Rate limit exceeded');
    });

    it('should return non-retryable error responses directly', async () => {
      // Mock a 400 Bad Request response that should not be retried
      const badRequestError = {
        error: {
          message: 'Bad Request',
          type: 'invalid_request_error',
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({
          'content-type': 'application/json',
        }),
        text: vi.fn().mockResolvedValue(JSON.stringify(badRequestError)),
        json: vi.fn().mockResolvedValue(badRequestError),
      } as unknown as Response);

      const result = await retryRequest(
        'https://api.example.com/test',
        { method: 'POST' },
        1, // 1 retry
        [429], // Only 429 is retryable, 400 is not
        null, // No timeout
      );

      // Should return the error response directly without retrying
      expect(result.response.status).toBe(400);
      const responseText = await result.response.text();
      const parsedResponse = JSON.parse(responseText);
      expect(parsedResponse.error.message).toBe('Bad Request');
    });
  });
});
