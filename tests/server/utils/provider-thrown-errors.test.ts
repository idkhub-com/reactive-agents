/**
 * Tests for handling thrown errors from provider request handlers
 * Tests the centralized error handling for provider-specific thrown errors
 */

import {
  analyzeInternalError,
  createProviderErrorResponse,
  ErrorClassification,
} from '@server/utils/error-classification-central';
import { describe, expect, it } from 'vitest';

describe('Provider Thrown Errors', () => {
  describe('Provider Request Handler Errors', () => {
    it('should handle Bedrock file upload errors with centralized system', async () => {
      // Simulate the error that would be thrown from Bedrock upload handler
      const uploadError = new Error('Invalid model slug');
      const response = createProviderErrorResponse(
        uploadError,
        'bedrock',
        'uploadFile',
      );

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(500);
      expect(response.headers.get('content-type')).toBe('application/json');

      const responseBody = await response.json();
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
      expect(typedBody.error.message).toContain('internal system error');
      expect(typedBody.provider).toBe('bedrock');
      expect(typedBody.error_details?.context?.functionName).toBe('uploadFile');
      expect(typedBody.error_details?.original_message).toBe(
        'Invalid model slug',
      );
    });

    it('should handle provider configuration errors', async () => {
      const configError = new Error(
        'Provider config not found for provider: invalid-provider',
      );
      const response = createProviderErrorResponse(
        configError,
        'invalid-provider',
        'chatComplete',
      );

      expect(response.status).toBe(500);
      const responseBody = await response.json();
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
      expect(typedBody.error.message).toContain('configuration error');
      expect(typedBody.provider).toBe('invalid-provider');
    });

    it('should handle network errors from provider handlers', async () => {
      const networkError = new Error('Failed to fetch: Connection refused');
      const response = createProviderErrorResponse(
        networkError,
        'openai',
        'complete',
      );

      expect(response.status).toBe(503);
      const responseBody = await response.json();
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
      expect(typedBody.error.message).toContain('network issues');
      expect(typedBody.provider).toBe('openai');
    });

    it('should handle validation errors from provider handlers', async () => {
      const validationError = new Error(
        'Invalid request parameters: missing required field',
      );
      const response = createProviderErrorResponse(
        validationError,
        'anthropic',
        'chatComplete',
      );

      expect(response.status).toBe(500);
      const responseBody = await response.json();
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
      expect(typedBody.error.message).toContain('internal system error');
      expect(typedBody.provider).toBe('anthropic');
    });

    it('should handle file processing errors', async () => {
      const fileError = new Error('File not found: /path/to/upload.jsonl');
      const response = createProviderErrorResponse(
        fileError,
        'bedrock',
        'uploadFile',
      );

      expect(response.status).toBe(502); // "not found" triggers transformation error logic
      const responseBody = await response.json();
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
      expect(typedBody.error.message).toContain('Invalid response format');
      expect(typedBody.provider).toBe('bedrock');
    });
  });

  describe('Error Classification for Provider Thrown Errors', () => {
    it('should classify provider-specific errors correctly', () => {
      const providerErrors = [
        {
          error: new Error('Invalid model slug'),
          expectedStatus: 500,
          expectedMessage: 'internal system error',
        },
        {
          error: new Error('Failed to fetch: Network request failed'),
          expectedStatus: 503,
          expectedMessage: 'network issues',
        },
        {
          error: new Error('File not found: /path/to/resource'),
          expectedStatus: 404,
          expectedMessage: 'resource not found',
        },
        {
          error: new Error('Rate limit exceeded: too many requests'),
          expectedStatus: 429,
          expectedMessage: 'rate limit exceeded',
        },
        {
          error: new Error('Out of memory: resource exhausted'),
          expectedStatus: 507,
          expectedMessage: 'resource constraints',
        },
      ];

      providerErrors.forEach(({ error, expectedStatus, expectedMessage }) => {
        const analysis = analyzeInternalError(error, {
          provider: 'test-provider',
          stage: 'request',
        });

        expect(analysis.classification).toBe(
          ErrorClassification.INTERNAL_ERROR,
        );
        expect(analysis.statusCode).toBe(expectedStatus);
        expect(analysis.genericMessage).toContain(expectedMessage);
      });
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve full error context for debugging', async () => {
      const error = new Error('Provider request failed');
      error.stack =
        'Error: Provider request failed\n    at provider-handler.js:1:1';
      error.cause = new Error('Root cause: Network timeout');

      const response = createProviderErrorResponse(error, 'google', 'embed');

      const responseBody = await response.json();
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;

      // Check that all error details are preserved
      expect(typedBody.error_details?.original_message).toBe(
        'Provider request failed',
      );
      expect(typedBody.error_details?.original_error).toEqual({
        name: 'Error',
        message: 'Provider request failed',
        stack: 'Error: Provider request failed\n    at provider-handler.js:1:1',
        cause: {}, // Error objects get serialized to empty objects
      });
      expect(typedBody.error_details?.context).toEqual({
        provider: 'google',
        functionName: 'embed',
        stage: 'request',
      });
      expect(typedBody.error_details?.classification).toBe('internal_error');
      expect(typedBody.error_details?.suggested_action).toContain(
        'internal system issue',
      );
    });
  });

  describe('Non-Error Object Handling', () => {
    it('should handle non-Error objects thrown by providers', async () => {
      const nonErrorObjects = [
        'String error',
        500,
        { message: 'Object error', code: 'CUSTOM_ERROR' },
        null,
        undefined,
      ];

      for (const nonError of nonErrorObjects) {
        const response = createProviderErrorResponse(
          nonError,
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
        expect(typedBody.error_details?.original_message).toBeTruthy();
      }
    });
  });

  describe('Provider-Specific Error Scenarios', () => {
    it('should handle AWS/Bedrock specific errors', async () => {
      const awsErrors = [
        new Error('AWS credentials not found'),
        new Error('S3 bucket access denied'),
        new Error('Bedrock model not available in region'),
        new Error('Invalid AWS region: us-east-99'),
      ];

      for (const error of awsErrors) {
        const response = createProviderErrorResponse(
          error,
          'bedrock',
          'uploadFile',
        );
        const responseBody = await response.json();
        const typedBody =
          responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
        expect(typedBody.provider).toBe('bedrock');
        expect(typedBody.error_details?.context?.functionName).toBe(
          'uploadFile',
        );
        expect(typedBody.error_details?.original_message).toBe(error.message);
      }
    });

    it('should handle OpenAI specific errors', async () => {
      const openaiErrors = [
        new Error('OpenAI API key invalid'),
        new Error('Model gpt-99 not found'),
        new Error('Rate limit exceeded for OpenAI API'),
        new Error('OpenAI service temporarily unavailable'),
      ];

      for (const error of openaiErrors) {
        const response = createProviderErrorResponse(
          error,
          'openai',
          'chatComplete',
        );
        const responseBody = await response.json();
        const typedBody =
          responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
        expect(typedBody.provider).toBe('openai');
        expect(typedBody.error_details?.context?.functionName).toBe(
          'chatComplete',
        );
        expect(typedBody.error_details?.original_message).toBe(error.message);
      }
    });

    it('should handle Anthropic specific errors', async () => {
      const anthropicErrors = [
        new Error('Anthropic API key not provided'),
        new Error('Claude model not available'),
        new Error('Anthropic service overloaded'),
        new Error('Invalid Anthropic request format'),
      ];

      for (const error of anthropicErrors) {
        const response = createProviderErrorResponse(
          error,
          'anthropic',
          'chatComplete',
        );
        const responseBody = await response.json();
        const typedBody =
          responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;
        expect(typedBody.provider).toBe('anthropic');
        expect(typedBody.error_details?.context?.functionName).toBe(
          'chatComplete',
        );
        expect(typedBody.error_details?.original_message).toBe(error.message);
      }
    });
  });

  describe('Integration with Existing Error System', () => {
    it('should maintain consistency with provider error responses', async () => {
      const error = new Error('Provider internal error');
      const response = createProviderErrorResponse(
        error,
        'test-provider',
        'testFunction',
      );

      const responseBody = await response.json();
      const typedBody =
        responseBody as unknown as import('@shared/types/api/response/body').ErrorResponseBody;

      // Should have same structure as other error responses
      expect(typedBody).toHaveProperty('error');
      expect(typedBody).toHaveProperty('provider');
      expect(typedBody).toHaveProperty('error_details');
      expect(typedBody).toHaveProperty('status');

      // Error object should have expected fields
      expect(typedBody.error).toHaveProperty('message');
      expect(typedBody.error).toHaveProperty('type');
      expect(typedBody.error).toHaveProperty('code');

      // Error details should have expected fields
      expect(typedBody.error_details).toHaveProperty('original_message');
      expect(typedBody.error_details).toHaveProperty('original_error');
      expect(typedBody.error_details).toHaveProperty('classification');
      expect(typedBody.error_details).toHaveProperty('suggested_action');
      expect(typedBody.error_details).toHaveProperty('context');
    });
  });
});
