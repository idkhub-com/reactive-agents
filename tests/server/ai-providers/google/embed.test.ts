import {
  googleEmbedConfig,
  googleEmbedResponseTransform,
} from '@server/ai-providers/google/embed';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request';
import { describe, expect, it } from 'vitest';

describe('Google Embed Configuration', () => {
  describe('Configuration Structure', () => {
    it('should have all required configuration properties', () => {
      expect(googleEmbedConfig).toBeDefined();
      expect(typeof googleEmbedConfig).toBe('object');
    });

    it('should have model configuration with correct properties', () => {
      expect(googleEmbedConfig.model).toBeDefined();
      const modelConfig = googleEmbedConfig.model;
      if (modelConfig && !Array.isArray(modelConfig)) {
        expect(modelConfig.param).toBe('model');
        expect(modelConfig.required).toBe(true);
        expect(modelConfig.default).toBe('embedding-001');
      }
    });

    it('should have input configuration with correct properties', () => {
      expect(googleEmbedConfig.input).toBeDefined();
      const inputConfig = googleEmbedConfig.input;
      if (inputConfig && !Array.isArray(inputConfig)) {
        expect(inputConfig.param).toBe('content');
        expect(inputConfig.required).toBe(true);
        expect(inputConfig.transform).toBeDefined();
      }
    });

    it('should have dimensions configuration that maps to output_dimensionality', () => {
      expect(googleEmbedConfig.dimensions).toBeDefined();
      const dimensionsConfig = googleEmbedConfig.dimensions;
      if (dimensionsConfig && !Array.isArray(dimensionsConfig)) {
        expect(dimensionsConfig.param).toBe('output_dimensionality');
        expect(dimensionsConfig.required).toBe(false);
      }
    });
  });

  describe('Parameter Mapping', () => {
    it('should map dimensions to output_dimensionality for Google API', () => {
      const dimensionsConfig = googleEmbedConfig.dimensions;
      if (dimensionsConfig && !Array.isArray(dimensionsConfig)) {
        expect(dimensionsConfig.param).toBe('output_dimensionality');
      }
    });

    it('should map input to content for Google API', () => {
      const inputConfig = googleEmbedConfig.input;
      if (inputConfig && !Array.isArray(inputConfig)) {
        expect(inputConfig.param).toBe('content');
      }
    });
  });

  describe('Input Transform', () => {
    it('should transform string input to Google content format', () => {
      const inputConfig = googleEmbedConfig.input;
      if (inputConfig && !Array.isArray(inputConfig) && inputConfig.transform) {
        const result = inputConfig.transform({
          input: 'Hello, world!',
          model: 'embedding-001',
        } as never);
        expect(result).toEqual({
          parts: [{ text: 'Hello, world!' }],
        });
      }
    });

    it('should transform array input to Google content format', () => {
      const inputConfig = googleEmbedConfig.input;
      if (inputConfig && !Array.isArray(inputConfig) && inputConfig.transform) {
        const result = inputConfig.transform({
          input: ['Hello', 'World'],
          model: 'embedding-001',
        } as never);
        expect(result).toEqual({
          parts: [{ text: 'Hello' }, { text: 'World' }],
        });
      }
    });
  });

  describe('Response Transform', () => {
    it('should transform successful embedding response to OpenAI format', () => {
      const googleResponse = {
        embedding: {
          values: [0.1, 0.2, 0.3, 0.4, 0.5],
        },
      };

      const result = googleEmbedResponseTransform(
        googleResponse,
        200,
        new Headers(),
        true,
        {
          requestBody: { model: 'text-embedding-004', input: 'test' },
        } as unknown as ReactiveAgentsRequestData,
      );

      expect(result).toEqual({
        object: 'list',
        data: [
          {
            object: 'embedding',
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            index: 0,
          },
        ],
        model: 'text-embedding-004',
        usage: {
          prompt_tokens: -1,
          total_tokens: -1,
        },
      });
    });

    it('should handle error response', () => {
      const errorResponse = {
        error: {
          code: '400',
          message: 'Invalid request',
          status: 'INVALID_ARGUMENT',
          details: [],
        },
      };

      const result = googleEmbedResponseTransform(
        errorResponse,
        400,
        new Headers(),
        true,
        {
          requestBody: { model: 'text-embedding-004', input: 'test' },
        } as unknown as ReactiveAgentsRequestData,
      );

      expect(result).toHaveProperty('error');
    });

    it('should handle invalid response format', () => {
      const invalidResponse = { invalid: 'response' };

      const result = googleEmbedResponseTransform(
        invalidResponse,
        200,
        new Headers(),
        true,
        {
          requestBody: { model: 'text-embedding-004', input: 'test' },
        } as unknown as ReactiveAgentsRequestData,
      );

      expect(result).toHaveProperty('error');
    });
  });
});
