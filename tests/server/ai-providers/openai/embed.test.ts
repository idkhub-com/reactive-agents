import { openAIEmbedConfig } from '@server/ai-providers/openai/embed';
import { describe, expect, it } from 'vitest';

describe('OpenAI Embed Configuration', () => {
  describe('Configuration Structure', () => {
    it('should have all required configuration properties', () => {
      expect(openAIEmbedConfig).toBeDefined();
      expect(typeof openAIEmbedConfig).toBe('object');
    });

    it('should have model configuration with correct properties', () => {
      expect(openAIEmbedConfig.model).toBeDefined();
      const modelConfig = openAIEmbedConfig.model;
      if (modelConfig && !Array.isArray(modelConfig)) {
        expect(modelConfig.param).toBe('model');
        expect(modelConfig.required).toBe(true);
        expect(modelConfig.default).toBe('text-embedding-ada-002');
      }
    });

    it('should have input configuration with correct properties', () => {
      expect(openAIEmbedConfig.input).toBeDefined();
      const inputConfig = openAIEmbedConfig.input;
      if (inputConfig && !Array.isArray(inputConfig)) {
        expect(inputConfig.param).toBe('input');
        expect(inputConfig.required).toBe(true);
      }
    });

    it('should have optional encoding_format configuration', () => {
      expect(openAIEmbedConfig.encoding_format).toBeDefined();
      const encodingFormatConfig = openAIEmbedConfig.encoding_format;
      if (encodingFormatConfig && !Array.isArray(encodingFormatConfig)) {
        expect(encodingFormatConfig.param).toBe('encoding_format');
        expect(encodingFormatConfig.required).toBeUndefined();
      }
    });

    it('should have optional dimensions configuration', () => {
      expect(openAIEmbedConfig.dimensions).toBeDefined();
      const dimensionsConfig = openAIEmbedConfig.dimensions;
      if (dimensionsConfig && !Array.isArray(dimensionsConfig)) {
        expect(dimensionsConfig.param).toBe('dimensions');
        expect(dimensionsConfig.required).toBeUndefined();
      }
    });

    it('should have optional user configuration', () => {
      expect(openAIEmbedConfig.user).toBeDefined();
      const userConfig = openAIEmbedConfig.user;
      if (userConfig && !Array.isArray(userConfig)) {
        expect(userConfig.param).toBe('user');
        expect(userConfig.required).toBeUndefined();
      }
    });
  });

  describe('Parameter Mapping', () => {
    it('should map all parameters correctly', () => {
      const expectedParams = {
        model: 'model',
        input: 'input',
        encoding_format: 'encoding_format',
        dimensions: 'dimensions',
        user: 'user',
      };

      Object.entries(expectedParams).forEach(([key, expectedParam]) => {
        const config = openAIEmbedConfig[key as keyof typeof openAIEmbedConfig];
        expect(config).toBeDefined();

        // Type assertion to access param property safely
        if (config && !Array.isArray(config)) {
          expect(config.param).toBe(expectedParam);
        }
      });
    });

    it('should have only model and input as required parameters', () => {
      const requiredParams = Object.entries(openAIEmbedConfig).filter(
        ([, config]) => {
          if (config && !Array.isArray(config)) {
            return config.required === true;
          }
          return false;
        },
      );

      expect(requiredParams).toHaveLength(2);
      expect(requiredParams.map(([key]) => key)).toEqual(
        expect.arrayContaining(['model', 'input']),
      );
    });

    it('should have optional parameters without required flag', () => {
      const optionalParams = Object.entries(openAIEmbedConfig).filter(
        ([, config]) => {
          if (config && !Array.isArray(config)) {
            return config.required !== true;
          }
          return true;
        },
      );

      expect(optionalParams).toHaveLength(3);
      expect(optionalParams.map(([key]) => key)).toEqual(
        expect.arrayContaining(['encoding_format', 'dimensions', 'user']),
      );
    });
  });

  describe('Default Values', () => {
    it('should have default model value', () => {
      const modelConfig = openAIEmbedConfig.model;
      if (modelConfig && !Array.isArray(modelConfig)) {
        expect(modelConfig.default).toBe('text-embedding-ada-002');
      }
    });

    it('should not have default values for other parameters', () => {
      const paramsWithoutDefaults = [
        'input',
        'encoding_format',
        'dimensions',
        'user',
      ];

      paramsWithoutDefaults.forEach((param) => {
        const config =
          openAIEmbedConfig[param as keyof typeof openAIEmbedConfig];
        if (config && !Array.isArray(config)) {
          expect(config.default).toBeUndefined();
        }
      });
    });
  });
});
