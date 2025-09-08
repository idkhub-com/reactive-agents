/**
 * Tests for internal error handling system
 * Tests the new internal error classification and response generation
 */

import {
  analyzeInternalError,
  createInternalErrorResponse,
  createProviderErrorResponse,
  ErrorClassification,
} from '@server/utils/error-classification-central';
import { describe, expect, it } from 'vitest';

describe('Internal Error Handling', () => {
  describe('analyzeInternalError', () => {
    it('should classify network errors as internal errors with 503 status', () => {
      const networkError = new Error('Failed to fetch: Network request failed');
      const analysis = analyzeInternalError(networkError, {
        provider: 'openai',
        stage: 'request',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(503);
      expect(analysis.genericMessage).toContain('network issues');
    });

    it('should classify timeout errors as internal errors with 503 status', () => {
      const timeoutError = new Error('Request timed out after 30 seconds');
      timeoutError.name = 'TimeoutError';
      const analysis = analyzeInternalError(timeoutError, {
        provider: 'anthropic',
        stage: 'request',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(503);
      expect(analysis.genericMessage).toContain('network issues');
    });

    it('should classify provider configuration errors as internal errors with 500 status', () => {
      const configError = new Error(
        'Provider config not found for provider: invalid-provider',
      );
      const analysis = analyzeInternalError(configError, {
        provider: 'invalid-provider',
        stage: 'request',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(500);
      expect(analysis.genericMessage).toContain('configuration error');
    });

    it('should classify response parsing errors as internal errors with 502 status', () => {
      const parseError = new Error('Unexpected token in JSON at position 0');
      const analysis = analyzeInternalError(parseError, {
        provider: 'google',
        stage: 'transformation',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(502);
      expect(analysis.genericMessage).toContain('Invalid response format');
    });

    it('should classify schema validation errors as internal errors with 502 status', () => {
      const validationError = new Error(
        'Invalid response body: Expected string but got number',
      );
      const analysis = analyzeInternalError(validationError, {
        provider: 'openai',
        stage: 'validation',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(502);
      expect(analysis.genericMessage).toContain('Response validation failed');
    });

    it('should classify authentication errors as internal errors with 500 status', () => {
      const authError = new Error('Unauthorized access to provider API');
      const analysis = analyzeInternalError(authError, {
        provider: 'anthropic',
        stage: 'request',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(500);
      expect(analysis.genericMessage).toContain('authentication error');
    });

    it('should default to generic internal error for unknown errors', () => {
      const unknownError = new Error(
        'Something completely unexpected happened',
      );
      const analysis = analyzeInternalError(unknownError, {
        provider: 'openai',
        stage: 'response',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(502); // response stage triggers transformation error
      expect(analysis.genericMessage).toContain('Invalid response format');
    });

    it('should default to generic internal error for truly unknown errors', () => {
      const unknownError = new Error(
        'Something completely unexpected happened',
      );
      const analysis = analyzeInternalError(unknownError, {
        provider: 'openai',
        // No stage specified to avoid triggering specific error patterns
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(500);
      expect(analysis.genericMessage).toContain('internal system error');
    });

    it('should classify file/resource access errors as internal errors with 404 status', () => {
      const fileError = new Error('File not found: /path/to/resource');
      const analysis = analyzeInternalError(fileError, {
        provider: 'bedrock',
        stage: 'request',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(404);
      expect(analysis.genericMessage).toContain('resource not found');
    });

    it('should classify rate limiting errors as internal errors with 429 status', () => {
      const rateLimitError = new Error(
        'Rate limit exceeded: too many requests',
      );
      const analysis = analyzeInternalError(rateLimitError, {
        provider: 'openai',
        stage: 'request',
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(429);
      expect(analysis.genericMessage).toContain('rate limit exceeded');
    });

    it('should classify memory/resource exhaustion errors as internal errors with 507 status', () => {
      const memoryError = new Error('Out of memory: resource exhausted');
      const analysis = analyzeInternalError(memoryError, {
        provider: 'anthropic',
        // No stage specified to avoid triggering response stage logic
      });

      expect(analysis.classification).toBe(ErrorClassification.INTERNAL_ERROR);
      expect(analysis.statusCode).toBe(507);
      expect(analysis.genericMessage).toContain('resource constraints');
    });
  });

  describe('createInternalErrorResponse', () => {
    it('should create a complete internal error response with all required fields', () => {
      const error = new Error('Test internal error');
      error.stack = 'Error: Test internal error\n    at test.js:1:1';
      error.cause = new Error('Root cause');

      const response = createInternalErrorResponse(error, {
        provider: 'openai',
        functionName: 'chatComplete',
        stage: 'transformation',
      });

      expect(response.error.message).toContain('Invalid response format');
      expect(response.error.type).toBe('internal_error');
      expect(response.error.code).toBe('INTERNAL_ERROR');
      expect(response.provider).toBe('openai');
      expect(response.status).toBe(502);

      // Check error_details
      expect(response.error_details?.original_message).toBe(
        'Test internal error',
      );
      expect(response.error_details?.classification).toBe('internal_error');
      expect(response.error_details?.suggested_action).toContain(
        'internal system issue',
      );
      expect(response.error_details?.context).toEqual({
        provider: 'openai',
        functionName: 'chatComplete',
        stage: 'transformation',
      });

      // Check original_error structure
      expect(response.error_details?.original_error).toEqual({
        name: 'Error',
        message: 'Test internal error',
        stack: 'Error: Test internal error\n    at test.js:1:1',
        cause: new Error('Root cause'),
      });
    });

    it('should handle network errors with appropriate status and message', () => {
      const networkError = new Error('Failed to fetch: Connection refused');
      const response = createInternalErrorResponse(networkError, {
        provider: 'anthropic',
        stage: 'request',
      });

      expect(response.status).toBe(503);
      expect(response.error.message).toContain('network issues');
      expect(response.error_details?.classification).toBe('internal_error');
    });

    it('should handle validation errors with appropriate status and message', () => {
      const validationError = new Error(
        'Schema validation failed: Expected string',
      );
      const response = createInternalErrorResponse(validationError, {
        provider: 'google',
        stage: 'validation',
      });

      expect(response.status).toBe(502);
      expect(response.error.message).toContain('Response validation failed');
      expect(response.error_details?.classification).toBe('internal_error');
    });

    it('should use system as default provider when not provided', () => {
      const error = new Error('Test error');
      const response = createInternalErrorResponse(error);

      expect(response.provider).toBe('system');
      expect(response.error_details?.context).toEqual({});
    });

    it('should preserve all error information in original_error', () => {
      const error = new Error('Complex error with details');
      error.name = 'CustomError';
      error.stack = 'CustomError: Complex error\n    at test.js:1:1';
      error.cause = { nested: 'cause' };

      const response = createInternalErrorResponse(error, {
        provider: 'openai',
        functionName: 'complete',
        stage: 'response',
      });

      expect(response.error_details?.original_error).toEqual({
        name: 'CustomError',
        message: 'Complex error with details',
        stack: 'CustomError: Complex error\n    at test.js:1:1',
        cause: { nested: 'cause' },
      });
    });
  });

  describe('Error Context Handling', () => {
    it('should include function name in context when provided', () => {
      const error = new Error('Test error');
      const response = createInternalErrorResponse(error, {
        provider: 'openai',
        functionName: 'chatComplete',
        stage: 'transformation',
      });

      expect(response.error_details?.context).toEqual({
        provider: 'openai',
        functionName: 'chatComplete',
        stage: 'transformation',
      });
    });

    it('should handle different stages appropriately', () => {
      const stages = [
        'request',
        'response',
        'transformation',
        'validation',
      ] as const;

      stages.forEach((stage) => {
        const error = new Error(`Error in ${stage}`);
        const response = createInternalErrorResponse(error, {
          provider: 'test',
          stage,
        });

        expect(response.error_details?.context?.stage).toBe(stage);
      });
    });
  });

  describe('createProviderErrorResponse', () => {
    it('should create a Response object with standardized internal error', async () => {
      const error = new Error('Provider request failed');
      const response = createProviderErrorResponse(
        error,
        'bedrock',
        'retrieveFileContent',
      );

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('application/json');

      const responseBody = await response.json();
      // Cast for type safety in tests
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
      expect(typedBody.error.message).toContain('internal system error');
      expect(typedBody.provider).toBe('bedrock');
      expect(typedBody.error_details?.context?.functionName).toBe(
        'retrieveFileContent',
      );
    });

    it('should handle non-Error objects', async () => {
      const response = createProviderErrorResponse(
        'String error',
        'openai',
        'chatComplete',
      );

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(500);

      const responseBody = await response.json();
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
      expect(typedBody.error.message).toContain('internal system error');
      expect(typedBody.provider).toBe('openai');
    });
  });

  describe('Integration with Existing Error System', () => {
    it('should maintain consistency with existing error response format', () => {
      const error = new Error('Test internal error');
      const response = createInternalErrorResponse(error, {
        provider: 'openai',
        stage: 'request',
      });

      // Should have same structure as provider errors
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('provider');
      expect(response).toHaveProperty('error_details');
      expect(response).toHaveProperty('status');

      // Error object should have expected fields
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('type');
      expect(response.error).toHaveProperty('code');

      // Error details should have expected fields
      expect(response.error_details).toHaveProperty('original_message');
      expect(response.error_details).toHaveProperty('original_error');
      expect(response.error_details).toHaveProperty('classification');
      expect(response.error_details).toHaveProperty('suggested_action');
    });
  });
});
