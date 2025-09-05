/**
 * Integration tests for OpenAI error handling through centralized system
 * Tests the complete flow: OpenAI error → transform → enhance → final response
 */

import { openAIErrorResponseTransform } from '@server/ai-providers/openai/utils';
import {
  analyzeError,
  ErrorClassification,
  enhanceErrorResponse,
} from '@server/utils/error-classification-central';
import { AIProvider } from '@shared/types/constants';
import { describe, expect, it } from 'vitest';

describe('OpenAI Error Handling Integration', () => {
  describe('Client Errors (400)', () => {
    it('should handle invalid API key error correctly', () => {
      // Simulates actual OpenAI error response
      const openAIErrorResponse = {
        error: {
          message:
            'Incorrect API key provided: sk-proj-invalid. You can find your API key at https://platform.openai.com/account/api-keys.',
          type: 'invalid_request_error',
          param: null,
          code: 'invalid_api_key',
        },
      };

      // Step 1: OpenAI transformer (existing)
      const transformedError = openAIErrorResponseTransform(
        openAIErrorResponse,
        AIProvider.OPENAI,
      );

      // Step 2: Centralized enhancement (new)
      const finalError = enhanceErrorResponse(
        transformedError,
        401, // Original HTTP status from OpenAI
        openAIErrorResponse,
      );

      // Assertions - matches your requirements exactly
      expect(finalError.status).toBe(401); // ✅ Unauthorized for authentication error
      expect(finalError.error.message).toBe(
        'openai error: Incorrect API key provided: sk-proj-invalid. You can find your API key at https://platform.openai.com/account/api-keys.',
      ); // ✅ Direct from provider with prefix
      expect(finalError.error.type).toBe('invalid_request_error');
      expect(finalError.error.code).toBe('invalid_api_key');
      expect(finalError.provider).toBe(AIProvider.OPENAI);

      // ✅ Full details in error_details
      expect(finalError.error_details?.original_error).toEqual(
        openAIErrorResponse,
      );
      expect(finalError.error_details?.classification).toBe('client_error');
      expect(finalError.error_details?.suggested_action).toContain(
        'authentication',
      );
    });

    it('should handle model not found error', () => {
      const openAIErrorResponse = {
        error: {
          message: 'The model `gpt-99` does not exist',
          type: 'invalid_request_error',
          param: null,
          code: null,
        },
      };

      const transformedError = openAIErrorResponseTransform(
        openAIErrorResponse,
        AIProvider.OPENAI,
      );
      const finalError = enhanceErrorResponse(
        transformedError,
        404,
        openAIErrorResponse,
      );

      expect(finalError.status).toBe(404); // ✅ Not Found for model error
      expect(finalError.error.message).toBe(
        'openai error: The model `gpt-99` does not exist',
      ); // ✅ Direct from provider with prefix
      expect(finalError.error_details?.classification).toBe('client_error');
    });

    it('should handle quota exceeded error', () => {
      const openAIErrorResponse = {
        error: {
          message:
            'You exceeded your current quota, please check your plan and billing details.',
          type: 'insufficient_quota',
          param: null,
          code: null,
        },
      };

      const transformedError = openAIErrorResponseTransform(
        openAIErrorResponse,
        AIProvider.OPENAI,
      );
      const finalError = enhanceErrorResponse(
        transformedError,
        429,
        openAIErrorResponse,
      );

      expect(finalError.status).toBe(429); // ✅ Too Many Requests for quota error
      expect(finalError.error.message).toBe(
        'openai error: You exceeded your current quota, please check your plan and billing details.',
      ); // ✅ Direct from provider with prefix
      expect(finalError.error_details?.classification).toBe('client_error');
    });

    it('should handle validation error', () => {
      const openAIErrorResponse = {
        error: {
          message: "'messages' is a required property",
          type: 'invalid_request_error',
          param: 'messages',
          code: null,
        },
      };

      const transformedError = openAIErrorResponseTransform(
        openAIErrorResponse,
        AIProvider.OPENAI,
      );
      const finalError = enhanceErrorResponse(
        transformedError,
        400,
        openAIErrorResponse,
      );

      expect(finalError.status).toBe(422); // ✅ Unprocessable Entity for validation error
      expect(finalError.error.message).toBe(
        "openai error: 'messages' is a required property",
      ); // ✅ Direct from provider with prefix
      expect(finalError.error.param).toBe('messages');
      expect(finalError.error_details?.classification).toBe('client_error');
    });
  });

  describe('Server Errors (500)', () => {
    it('should handle OpenAI server errors with generic messages', () => {
      const openAIErrorResponse = {
        error: {
          message:
            'The server had an error while processing your request. Sorry about that!',
          type: 'server_error',
          param: null,
          code: null,
        },
      };

      const transformedError = openAIErrorResponseTransform(
        openAIErrorResponse,
        AIProvider.OPENAI,
      );
      const finalError = enhanceErrorResponse(
        transformedError,
        500,
        openAIErrorResponse,
      );

      expect(finalError.status).toBe(500); // ✅ Server error
      expect(finalError.error.message).toBe(
        'An unexpected server error occurred. Please retry your request.',
      ); // ✅ Generic message (no prefix for 500 errors)
      expect(finalError.error_details?.original_message).toBe(
        'openai error: The server had an error while processing your request. Sorry about that!',
      ); // ✅ Original preserved with prefix
      expect(finalError.error_details?.classification).toBe('server_error');
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        error: {
          message: 'Request timed out',
          type: 'timeout_error',
        },
      };

      const transformedError = openAIErrorResponseTransform(
        timeoutError,
        AIProvider.OPENAI,
      );
      const finalError = enhanceErrorResponse(
        transformedError,
        504,
        timeoutError,
      );

      expect(finalError.status).toBe(408); // ✅ Request Timeout for timeout error
      expect(finalError.error.message).toBe(
        'Request timed out. The service is currently slow or unavailable.',
      ); // ✅ Specific generic message (no prefix for 500 errors)
      expect(finalError.error_details?.original_message).toBe(
        'openai error: Request timed out',
      ); // ✅ Original preserved with prefix
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed OpenAI response', () => {
      const malformedResponse = {
        unexpected: 'format',
        code: 500,
      };

      // Even with malformed response, system should work
      const transformedError = openAIErrorResponseTransform(
        malformedResponse,
        AIProvider.OPENAI,
      );
      const finalError = enhanceErrorResponse(
        transformedError,
        500,
        malformedResponse,
      );

      expect(finalError.status).toBe(500);
      expect(finalError.error.message).toBeTruthy();
      expect(finalError.error_details?.original_error).toEqual(
        malformedResponse,
      );
    });

    it('should work with provider that has no custom transformer', () => {
      // Simulate a provider without custom error transformer
      const rawProviderError = {
        message: 'Invalid model specified',
        error_code: 'MODEL_NOT_FOUND',
      };

      // This would be handled by the fallback logic in stream-handler.ts
      const analysis = analyzeError(rawProviderError, 400);

      expect(analysis.classification).toBe(ErrorClassification.CLIENT_ERROR);
      expect(analysis.statusCode).toBe(404); // Model not found error
    });
  });

  describe('All Provider Formats', () => {
    const testCases = [
      {
        name: 'Anthropic format',
        error: {
          error: { type: 'authentication_error', message: 'invalid x-api-key' },
        },
        status: 401,
        expectedClass: ErrorClassification.CLIENT_ERROR,
        expectedStatus: 401, // Authentication error
      },
      {
        name: 'Google format',
        error: {
          error: {
            code: 400,
            message: 'API key not valid',
            status: 'INVALID_ARGUMENT',
          },
        },
        status: 400,
        expectedClass: ErrorClassification.CLIENT_ERROR,
        expectedStatus: 401, // Authentication error
      },
      {
        name: 'Together AI format',
        error: { error: 'Model not found: invalid-model' },
        status: 404,
        expectedClass: ErrorClassification.CLIENT_ERROR,
        expectedStatus: 404, // Model not found error
      },
      {
        name: 'Workers AI format',
        error: {
          success: false,
          errors: [{ code: 1001, message: 'Authentication required' }],
        },
        status: 401,
        expectedClass: ErrorClassification.CLIENT_ERROR,
        expectedStatus: 401, // Authentication error
      },
      {
        name: 'Anyscale format',
        error: {
          detail: [
            {
              loc: ['body', 'model'],
              msg: 'field required',
              type: 'value_error.missing',
            },
          ],
        },
        status: 422,
        expectedClass: ErrorClassification.CLIENT_ERROR,
        expectedStatus: 422, // Validation error
      },
      {
        name: 'Generic server error',
        error: { error: 'Internal processing error', timestamp: Date.now() },
        status: 500,
        expectedClass: ErrorClassification.SERVER_ERROR,
        expectedStatus: 500,
      },
    ];

    testCases.forEach(
      ({ name, error, status, expectedClass, expectedStatus }) => {
        it(`should handle ${name} correctly`, () => {
          const analysis = analyzeError(error, status);
          expect(analysis.classification).toBe(expectedClass);
          expect(analysis.statusCode).toBe(expectedStatus);
        });
      },
    );
  });
});
