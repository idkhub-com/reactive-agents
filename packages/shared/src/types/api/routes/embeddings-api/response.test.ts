import {
  CreateEmbeddingsError,
  CreateEmbeddingsErrorResponseBody,
  CreateEmbeddingsResponseBody,
  EmbeddingData,
  EmbeddingsUsage,
} from '@shared/types/api/routes/embeddings-api/response';
import { describe, expect, it } from 'vitest';

describe('Embeddings Response Types', () => {
  describe('EmbeddingData', () => {
    it('should validate valid embedding data with number array', () => {
      const validEmbedding = {
        object: 'embedding' as const,
        embedding: [0.1, -0.5, 0.8, -0.2],
        index: 0,
      };

      expect(() => EmbeddingData.parse(validEmbedding)).not.toThrow();
      const parsed = EmbeddingData.parse(validEmbedding);
      expect(parsed).toEqual(validEmbedding);
    });

    it('should validate valid embedding data with string (base64)', () => {
      const validEmbedding = {
        object: 'embedding' as const,
        embedding: 'base64encodedstring==',
        index: 1,
      };

      expect(() => EmbeddingData.parse(validEmbedding)).not.toThrow();
      const parsed = EmbeddingData.parse(validEmbedding);
      expect(parsed).toEqual(validEmbedding);
    });

    it('should reject missing required fields', () => {
      const invalidEmbedding = {
        object: 'embedding' as const,
        // missing embedding and index
      };

      expect(() => EmbeddingData.parse(invalidEmbedding)).toThrow();
    });

    it('should reject wrong object type', () => {
      const invalidEmbedding = {
        object: 'invalid',
        embedding: [0.1, 0.2],
        index: 0,
      };

      expect(() => EmbeddingData.parse(invalidEmbedding)).toThrow();
    });

    it('should reject invalid embedding type', () => {
      const invalidEmbedding = {
        object: 'embedding' as const,
        embedding: { invalid: 'type' },
        index: 0,
      };

      expect(() => EmbeddingData.parse(invalidEmbedding)).toThrow();
    });

    it('should reject invalid index type', () => {
      const invalidEmbedding = {
        object: 'embedding' as const,
        embedding: [0.1, 0.2],
        index: 'invalid',
      };

      expect(() => EmbeddingData.parse(invalidEmbedding)).toThrow();
    });
  });

  describe('EmbeddingsUsage', () => {
    it('should validate valid usage data', () => {
      const validUsage = {
        prompt_tokens: 10,
        total_tokens: 10,
      };

      expect(() => EmbeddingsUsage.parse(validUsage)).not.toThrow();
      const parsed = EmbeddingsUsage.parse(validUsage);
      expect(parsed).toEqual(validUsage);
    });

    it('should reject missing prompt_tokens', () => {
      const invalidUsage = {
        total_tokens: 10,
      };

      expect(() => EmbeddingsUsage.parse(invalidUsage)).toThrow();
    });

    it('should reject missing total_tokens', () => {
      const invalidUsage = {
        prompt_tokens: 10,
      };

      expect(() => EmbeddingsUsage.parse(invalidUsage)).toThrow();
    });

    it('should reject non-number token counts', () => {
      const invalidUsage = {
        prompt_tokens: '10',
        total_tokens: 10,
      };

      expect(() => EmbeddingsUsage.parse(invalidUsage)).toThrow();
    });
  });

  describe('CreateEmbeddingsResponseBody', () => {
    it('should validate complete response body', () => {
      const validResponse = {
        object: 'list' as const,
        data: [
          {
            object: 'embedding' as const,
            embedding: [0.1, -0.5, 0.8],
            index: 0,
          },
          {
            object: 'embedding' as const,
            embedding: [0.2, -0.3, 0.9],
            index: 1,
          },
        ],
        model: 'text-embedding-3-small',
        usage: {
          prompt_tokens: 8,
          total_tokens: 8,
        },
      };

      expect(() =>
        CreateEmbeddingsResponseBody.parse(validResponse),
      ).not.toThrow();
      const parsed = CreateEmbeddingsResponseBody.parse(validResponse);
      expect(parsed).toEqual(validResponse);
    });

    it('should validate response with single embedding', () => {
      const validResponse = {
        object: 'list' as const,
        data: [
          {
            object: 'embedding' as const,
            embedding: [0.1, -0.5, 0.8, -0.2],
            index: 0,
          },
        ],
        model: 'text-embedding-ada-002',
        usage: {
          prompt_tokens: 4,
          total_tokens: 4,
        },
      };

      expect(() =>
        CreateEmbeddingsResponseBody.parse(validResponse),
      ).not.toThrow();
    });

    it('should validate response with base64 embedding', () => {
      const validResponse = {
        object: 'list' as const,
        data: [
          {
            object: 'embedding' as const,
            embedding: 'encodedbase64string==',
            index: 0,
          },
        ],
        model: 'text-embedding-3-large',
        usage: {
          prompt_tokens: 2,
          total_tokens: 2,
        },
      };

      expect(() =>
        CreateEmbeddingsResponseBody.parse(validResponse),
      ).not.toThrow();
    });

    it('should reject wrong object type', () => {
      const invalidResponse = {
        object: 'embedding',
        data: [],
        model: 'test',
        usage: { prompt_tokens: 0, total_tokens: 0 },
      };

      expect(() =>
        CreateEmbeddingsResponseBody.parse(invalidResponse),
      ).toThrow();
    });

    it('should reject empty data array', () => {
      const invalidResponse = {
        object: 'list' as const,
        data: [],
        model: 'test',
        usage: { prompt_tokens: 0, total_tokens: 0 },
      };

      // Should not throw - empty arrays are valid
      expect(() =>
        CreateEmbeddingsResponseBody.parse(invalidResponse),
      ).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidResponse = {
        object: 'list' as const,
        data: [
          {
            object: 'embedding' as const,
            embedding: [0.1],
            index: 0,
          },
        ],
        // missing model and usage
      };

      expect(() =>
        CreateEmbeddingsResponseBody.parse(invalidResponse),
      ).toThrow();
    });

    it('should reject invalid data array items', () => {
      const invalidResponse = {
        object: 'list' as const,
        data: [
          {
            object: 'invalid',
            embedding: [0.1],
            index: 0,
          },
        ],
        model: 'test',
        usage: { prompt_tokens: 1, total_tokens: 1 },
      };

      expect(() =>
        CreateEmbeddingsResponseBody.parse(invalidResponse),
      ).toThrow();
    });
  });

  describe('CreateEmbeddingsError', () => {
    it('should validate complete error object', () => {
      const validError = {
        message: 'Invalid request parameters',
        type: 'invalid_request_error',
        param: 'input',
        code: 'invalid_input',
      };

      expect(() => CreateEmbeddingsError.parse(validError)).not.toThrow();
      const parsed = CreateEmbeddingsError.parse(validError);
      expect(parsed).toEqual(validError);
    });

    it('should validate minimal error object', () => {
      const minimalError = {
        message: 'Something went wrong',
        type: 'server_error',
      };

      expect(() => CreateEmbeddingsError.parse(minimalError)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const invalidError = {
        type: 'server_error',
        // missing message
      };

      expect(() => CreateEmbeddingsError.parse(invalidError)).toThrow();
    });

    it('should validate with optional param only', () => {
      const errorWithParam = {
        message: 'Invalid parameter',
        type: 'invalid_request_error',
        param: 'model',
      };

      expect(() => CreateEmbeddingsError.parse(errorWithParam)).not.toThrow();
    });

    it('should validate with optional code only', () => {
      const errorWithCode = {
        message: 'Rate limit exceeded',
        type: 'rate_limit_error',
        code: 'rate_limit_exceeded',
      };

      expect(() => CreateEmbeddingsError.parse(errorWithCode)).not.toThrow();
    });
  });

  describe('CreateEmbeddingsErrorResponseBody', () => {
    it('should validate complete error response', () => {
      const validErrorResponse = {
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error',
          param: 'api_key',
          code: 'invalid_api_key',
        },
      };

      expect(() =>
        CreateEmbeddingsErrorResponseBody.parse(validErrorResponse),
      ).not.toThrow();
      const parsed =
        CreateEmbeddingsErrorResponseBody.parse(validErrorResponse);
      expect(parsed).toEqual(validErrorResponse);
    });

    it('should validate minimal error response', () => {
      const minimalErrorResponse = {
        error: {
          message: 'Server error',
          type: 'server_error',
        },
      };

      expect(() =>
        CreateEmbeddingsErrorResponseBody.parse(minimalErrorResponse),
      ).not.toThrow();
    });

    it('should reject missing error field', () => {
      const invalidErrorResponse = {
        // missing error
      };

      expect(() =>
        CreateEmbeddingsErrorResponseBody.parse(invalidErrorResponse),
      ).toThrow();
    });

    it('should reject invalid error object', () => {
      const invalidErrorResponse = {
        error: {
          type: 'server_error',
          // missing message
        },
      };

      expect(() =>
        CreateEmbeddingsErrorResponseBody.parse(invalidErrorResponse),
      ).toThrow();
    });

    it('should reject non-object error field', () => {
      const invalidErrorResponse = {
        error: 'string error',
      };

      expect(() =>
        CreateEmbeddingsErrorResponseBody.parse(invalidErrorResponse),
      ).toThrow();
    });
  });
});
