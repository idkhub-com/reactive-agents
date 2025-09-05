/**
 * Tests for centralized error classification that works with ALL AI providers
 */

import {
  analyzeError,
  ErrorClassification,
  enhanceErrorResponse,
  extractErrorTexts,
} from '@server/utils/error-classification-central';
import type { ErrorResponseBody } from '@shared/types/api/response/body';
import { describe, expect, it } from 'vitest';

describe('Centralized Error Classification', () => {
  describe('extractErrorTexts', () => {
    it('should extract text from OpenAI error format', () => {
      const openAIError = {
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error',
          param: null,
          code: 'invalid_api_key',
        },
      };

      const texts = extractErrorTexts(openAIError);
      expect(texts).toContain('invalid api key provided');
      expect(texts).toContain('invalid_request_error');
      expect(texts).toContain('invalid_api_key');
    });

    it('should extract text from Anthropic error format', () => {
      const anthropicError = {
        error: {
          type: 'authentication_error',
          message: 'invalid x-api-key',
        },
      };

      const texts = extractErrorTexts(anthropicError);
      expect(texts).toContain('authentication_error');
      expect(texts).toContain('invalid x-api-key');
    });

    it('should extract text from Google error format', () => {
      const googleError = {
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          status: 'INVALID_ARGUMENT',
        },
      };

      const texts = extractErrorTexts(googleError);
      expect(texts).toContain(
        'api key not valid. please pass a valid api key.',
      );
      expect(texts).toContain('invalid_argument');
    });

    it('should extract text from Together AI error format', () => {
      const togetherError = {
        error: 'Model not found: invalid-model',
        type: 'invalid_request_error',
      };

      const texts = extractErrorTexts(togetherError);
      expect(texts).toContain('model not found: invalid-model');
      expect(texts).toContain('invalid_request_error');
    });

    it('should extract from nested arrays (Anyscale format)', () => {
      const anyscaleError = {
        detail: [
          {
            loc: ['body', 'model'],
            msg: 'field required',
            type: 'value_error.missing',
          },
        ],
      };

      const texts = extractErrorTexts(anyscaleError);
      expect(texts).toContain('field required');
      expect(texts).toContain('value_error.missing');
    });
  });

  describe('analyzeError', () => {
    it('should classify OpenAI authentication error as client error', () => {
      const openAIError = {
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      };

      const analysis = analyzeError(openAIError, 401);
      expect(analysis.classification).toBe(ErrorClassification.CLIENT_ERROR);
      expect(analysis.statusCode).toBe(401); // More specific: authentication error
    });

    it('should classify quota error as client error', () => {
      const quotaError = {
        error: {
          message: 'You exceeded your current quota',
          type: 'insufficient_quota',
        },
      };

      const analysis = analyzeError(quotaError, 429);
      expect(analysis.classification).toBe(ErrorClassification.CLIENT_ERROR);
      expect(analysis.statusCode).toBe(429); // More specific: rate limiting error
      // Client errors get direct messages (not generic), generic only for server errors
    });

    it('should classify model not found as client error', () => {
      const modelError = {
        error: {
          message: 'The model gpt-99 does not exist',
          type: 'invalid_request_error',
        },
      };

      const analysis = analyzeError(modelError, 404);
      expect(analysis.classification).toBe(ErrorClassification.CLIENT_ERROR);
      expect(analysis.statusCode).toBe(404); // More specific: not found error
      // Client errors use direct provider messages, not generic
    });

    it('should classify server errors correctly', () => {
      const serverError = {
        error: {
          message: 'Internal server error',
          type: 'internal_error',
        },
      };

      const analysis = analyzeError(serverError, 500);
      expect(analysis.classification).toBe(ErrorClassification.SERVER_ERROR);
      expect(analysis.statusCode).toBe(500);
      expect(analysis.genericMessage).toBeDefined();
      expect(analysis.genericMessage).toContain('server');
    });

    it('should handle timeout errors', () => {
      const timeoutError = {
        error: 'Request timed out after 30 seconds',
      };

      const analysis = analyzeError(timeoutError, 504);
      expect(analysis.classification).toBe(ErrorClassification.SERVER_ERROR);
      expect(analysis.statusCode).toBe(408); // More specific: timeout error
      expect(analysis.genericMessage).toBeDefined();
      expect(analysis.genericMessage).toContain('timed out');
    });

    it('should handle unknown formats gracefully', () => {
      const unknownError = {
        message: 'Something went wrong',
        details: 'Unknown error occurred',
      };

      const analysis = analyzeError(unknownError, 500);
      expect(analysis.classification).toBe(ErrorClassification.SERVER_ERROR);
      expect(analysis.statusCode).toBe(500);
      expect(analysis.genericMessage).toBeDefined();
    });
  });

  describe('enhanceErrorResponse', () => {
    it('should enhance client error with direct provider message', () => {
      const errorResponse: ErrorResponseBody = {
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
        provider: 'openai',
      };

      const originalError = {
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      };

      const enhanced = enhanceErrorResponse(errorResponse, 401, originalError);

      expect(enhanced.status).toBe(401); // More specific: authentication error
      expect(enhanced.error.message).toBe(
        'openai error: Invalid API key provided',
      ); // Direct from provider with prefix
      expect(enhanced.error_details?.classification).toBe('client_error');
      expect(enhanced.error_details?.original_message).toBe(
        'Invalid API key provided',
      );
      expect(enhanced.error_details?.original_error).toBe(originalError);
      expect(enhanced.error_details?.suggested_action).toContain(
        'authentication',
      );
    });

    it('should enhance server error with generic message', () => {
      const errorResponse: ErrorResponseBody = {
        error: {
          message: 'Internal server error in model processing pipeline',
          type: 'internal_error',
        },
        provider: 'anthropic',
      };

      const originalError = {
        error: {
          message: 'Internal server error in model processing pipeline',
          type: 'internal_error',
        },
      };

      const enhanced = enhanceErrorResponse(errorResponse, 500, originalError);

      expect(enhanced.status).toBe(500);
      expect(enhanced.error.message).toBe(
        'An internal server error occurred. Our team has been notified.',
      ); // Generic message for 500
      expect(enhanced.error_details?.classification).toBe('server_error');
      expect(enhanced.error_details?.original_message).toBe(
        'Internal server error in model processing pipeline',
      ); // Original preserved
      expect(enhanced.error_details?.original_error).toBe(originalError);
      expect(enhanced.error_details?.suggested_action).toContain('server-side');
    });

    it('should work with any provider format', () => {
      // Test with Google format
      const googleError: ErrorResponseBody = {
        error: {
          message: 'API key not valid',
        },
        provider: 'google',
      };

      const originalGoogleError = {
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          status: 'INVALID_ARGUMENT',
        },
      };

      const enhanced = enhanceErrorResponse(
        googleError,
        400,
        originalGoogleError,
      );

      expect(enhanced.status).toBe(401); // More specific: authentication error
      expect(enhanced.error.message).toBe('google error: API key not valid'); // Direct for client error with prefix
      expect(enhanced.error_details?.classification).toBe('client_error');
    });
  });
});
