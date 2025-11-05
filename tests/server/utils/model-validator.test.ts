/**
 * Tests for model capability validation and parameter transformation.
 */

import {
  parseModelIdentifier,
  registerProviderCapabilities,
  transformParameterValue,
  validateAndTransformParameter,
  validateParameter,
} from '@server/utils/model-validator';
import type { ProviderModelCapabilities } from '@shared/types/ai-providers/model-capabilities';
import { ModelParameter } from '@shared/types/ai-providers/model-capabilities';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Model Validator', () => {
  describe('parseModelIdentifier', () => {
    it('should parse simple model names', () => {
      const result = parseModelIdentifier('gpt-4', AIProvider.OPENAI);
      expect(result).toEqual({
        provider: AIProvider.OPENAI,
        modelName: 'gpt-4',
      });
    });

    it('should parse OpenRouter format with provider prefix', () => {
      const result = parseModelIdentifier('anthropic/claude-3-opus');
      expect(result).toEqual({
        provider: 'anthropic',
        modelName: 'claude-3-opus',
      });
    });

    it('should parse openai/gpt-4 format', () => {
      const result = parseModelIdentifier('openai/gpt-4');
      expect(result).toEqual({
        provider: 'openai',
        modelName: 'gpt-4',
      });
    });

    it('should use default provider if no prefix', () => {
      const result = parseModelIdentifier(
        'claude-3-opus',
        AIProvider.ANTHROPIC,
      );
      expect(result).toEqual({
        provider: AIProvider.ANTHROPIC,
        modelName: 'claude-3-opus',
      });
    });
  });

  describe('transformParameterValue', () => {
    it('should transform 0-1 value to 0-2 range (OpenAI temperature)', () => {
      const result = transformParameterValue(0.5, { min: 0, max: 2 });
      expect(result).toBe(1.0);
    });

    it('should transform 0-1 value to -2 to 2 range (penalties)', () => {
      const result = transformParameterValue(0.5, { min: -2, max: 2 });
      expect(result).toBe(0);
    });

    it('should transform 0 to minimum', () => {
      const result = transformParameterValue(0, { min: -2, max: 2 });
      expect(result).toBe(-2);
    });

    it('should transform 1 to maximum', () => {
      const result = transformParameterValue(1, { min: 0, max: 2 });
      expect(result).toBe(2);
    });

    it('should handle 0-1 range (no transformation needed)', () => {
      const result = transformParameterValue(0.5, { min: 0, max: 1 });
      expect(result).toBe(0.5);
    });

    it('should transform 0.25 to -1 in -2 to 2 range', () => {
      const result = transformParameterValue(0.25, { min: -2, max: 2 });
      expect(result).toBe(-1);
    });
  });

  describe('validateParameter - OpenAI', () => {
    beforeEach(() => {
      // Register OpenAI capabilities for testing
      const openAICapabilities: ProviderModelCapabilities = {
        provider: AIProvider.OPENAI,
        defaultParameterRanges: {
          temperature: { min: 0, max: 2 },
          top_p: { min: 0, max: 1 },
          frequency_penalty: { min: -2, max: 2 },
          presence_penalty: { min: -2, max: 2 },
        },
        models: [
          {
            modelPattern: /^gpt-4o(-mini)?$/,
            endpointConfigs: {
              [FunctionName.CHAT_COMPLETE]: {
                unsupportedParameters: [ModelParameter.REASONING_EFFORT],
              },
              [FunctionName.STREAM_CHAT_COMPLETE]: {
                unsupportedParameters: [ModelParameter.REASONING_EFFORT],
              },
            },
          },
          {
            modelPattern: 'o4-mini',
            endpointConfigs: {
              [FunctionName.CHAT_COMPLETE]: {
                unsupportedParameters: [
                  ModelParameter.TEMPERATURE,
                  ModelParameter.TOP_P,
                ],
                legacyParameterMapping: {
                  [ModelParameter.MAX_TOKENS]:
                    ModelParameter.MAX_COMPLETION_TOKENS,
                },
              },
              [FunctionName.STREAM_CHAT_COMPLETE]: {
                unsupportedParameters: [
                  ModelParameter.TEMPERATURE,
                  ModelParameter.TOP_P,
                ],
                legacyParameterMapping: {
                  [ModelParameter.MAX_TOKENS]:
                    ModelParameter.MAX_COMPLETION_TOKENS,
                },
              },
            },
          },
        ],
      };

      registerProviderCapabilities(openAICapabilities);
    });

    it('should allow temperature for gpt-4o', () => {
      const result = validateParameter(
        AIProvider.OPENAI,
        'gpt-4o',
        ModelParameter.TEMPERATURE,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(true);
      expect(result.parameterName).toBe(ModelParameter.TEMPERATURE);
    });

    it('should disallow reasoning_effort for gpt-4o', () => {
      const result = validateParameter(
        AIProvider.OPENAI,
        'gpt-4o',
        ModelParameter.REASONING_EFFORT,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should disallow temperature for o4-mini', () => {
      const result = validateParameter(
        AIProvider.OPENAI,
        'o4-mini',
        ModelParameter.TEMPERATURE,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should remap max_tokens to max_completion_tokens for o4-mini', () => {
      const result = validateParameter(
        AIProvider.OPENAI,
        'o4-mini',
        ModelParameter.MAX_TOKENS,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(true);
      expect(result.parameterName).toBe(ModelParameter.MAX_COMPLETION_TOKENS);
    });
  });

  describe('validateParameter - xAI', () => {
    beforeEach(() => {
      // Register xAI capabilities for testing
      const xaiCapabilities: ProviderModelCapabilities = {
        provider: AIProvider.XAI,
        defaultParameterRanges: {
          temperature: { min: 0, max: 2 },
          top_p: { min: 0, max: 1 },
          frequency_penalty: { min: -2, max: 2 },
          presence_penalty: { min: -2, max: 2 },
        },
        models: [
          {
            modelPattern: /^grok-3-mini-(beta|fast-beta)$/,
            endpointConfigs: {
              [FunctionName.CHAT_COMPLETE]: {
                unsupportedParameters: [ModelParameter.PRESENCE_PENALTY],
              },
              [FunctionName.STREAM_CHAT_COMPLETE]: {
                unsupportedParameters: [ModelParameter.PRESENCE_PENALTY],
              },
            },
          },
          {
            modelPattern: /^grok-4/,
            endpointConfigs: {
              [FunctionName.CHAT_COMPLETE]: {
                unsupportedParameters: [
                  ModelParameter.REASONING_EFFORT,
                  ModelParameter.PRESENCE_PENALTY,
                  ModelParameter.FREQUENCY_PENALTY,
                  ModelParameter.STOP,
                ],
              },
              [FunctionName.STREAM_CHAT_COMPLETE]: {
                unsupportedParameters: [
                  ModelParameter.REASONING_EFFORT,
                  ModelParameter.PRESENCE_PENALTY,
                  ModelParameter.FREQUENCY_PENALTY,
                  ModelParameter.STOP,
                ],
              },
            },
          },
        ],
      };

      registerProviderCapabilities(xaiCapabilities);
    });

    it('should allow temperature for grok-4', () => {
      const result = validateParameter(
        AIProvider.XAI,
        'grok-4',
        ModelParameter.TEMPERATURE,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(true);
      expect(result.parameterName).toBe(ModelParameter.TEMPERATURE);
    });

    it('should disallow presence_penalty for grok-4', () => {
      const result = validateParameter(
        AIProvider.XAI,
        'grok-4',
        ModelParameter.PRESENCE_PENALTY,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should disallow frequency_penalty for grok-4', () => {
      const result = validateParameter(
        AIProvider.XAI,
        'grok-4',
        ModelParameter.FREQUENCY_PENALTY,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should disallow stop for grok-4', () => {
      const result = validateParameter(
        AIProvider.XAI,
        'grok-4',
        ModelParameter.STOP,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should disallow reasoning_effort for grok-4', () => {
      const result = validateParameter(
        AIProvider.XAI,
        'grok-4',
        ModelParameter.REASONING_EFFORT,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should disallow presence_penalty for grok-3-mini-beta', () => {
      const result = validateParameter(
        AIProvider.XAI,
        'grok-3-mini-beta',
        ModelParameter.PRESENCE_PENALTY,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });
  });

  describe('validateParameter - Anthropic', () => {
    beforeEach(() => {
      // Register Anthropic capabilities for testing
      const anthropicCapabilities: ProviderModelCapabilities = {
        provider: AIProvider.ANTHROPIC,
        defaultParameterRanges: {
          temperature: { min: 0, max: 1 },
          top_p: { min: 0, max: 1 },
        },
        models: [
          {
            modelPattern: /^claude-.+$/,
            endpointConfigs: {
              [FunctionName.CHAT_COMPLETE]: {
                unsupportedParameters: [
                  ModelParameter.TOP_P,
                  ModelParameter.FREQUENCY_PENALTY,
                  ModelParameter.PRESENCE_PENALTY,
                  ModelParameter.REASONING_EFFORT,
                ],
              },
              [FunctionName.STREAM_CHAT_COMPLETE]: {
                unsupportedParameters: [
                  ModelParameter.TOP_P,
                  ModelParameter.FREQUENCY_PENALTY,
                  ModelParameter.PRESENCE_PENALTY,
                  ModelParameter.REASONING_EFFORT,
                ],
              },
            },
          },
        ],
      };

      registerProviderCapabilities(anthropicCapabilities);
    });

    it('should allow temperature for claude-opus-4-1', () => {
      const result = validateParameter(
        AIProvider.ANTHROPIC,
        'claude-opus-4-1',
        ModelParameter.TEMPERATURE,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(true);
      expect(result.parameterName).toBe(ModelParameter.TEMPERATURE);
    });

    it('should disallow top_p for claude-opus-4-1', () => {
      const result = validateParameter(
        AIProvider.ANTHROPIC,
        'claude-opus-4-1',
        ModelParameter.TOP_P,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });

    it('should disallow frequency_penalty for claude models', () => {
      const result = validateParameter(
        AIProvider.ANTHROPIC,
        'claude-sonnet-4-5',
        ModelParameter.FREQUENCY_PENALTY,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.reason).toContain('not supported');
    });
  });

  describe('validateAndTransformParameter', () => {
    beforeEach(() => {
      // Register test capabilities
      const testCapabilities: ProviderModelCapabilities = {
        provider: AIProvider.OPENAI,
        defaultParameterRanges: {
          temperature: { min: 0, max: 2 },
          frequency_penalty: { min: -2, max: 2 },
        },
        models: [
          {
            modelPattern: 'test-model',
            endpointConfigs: {
              [FunctionName.CHAT_COMPLETE]: {
                unsupportedParameters: [ModelParameter.TOP_P],
              },
            },
          },
        ],
      };

      registerProviderCapabilities(testCapabilities);
    });

    it('should validate and transform supported parameter', () => {
      const result = validateAndTransformParameter(
        AIProvider.OPENAI,
        'test-model',
        ModelParameter.TEMPERATURE,
        0.5,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(true);
      expect(result.transformedValue).toBe(1.0); // 0.5 * 2
      expect(result.parameterRange).toEqual({ min: 0, max: 2 });
    });

    it('should not transform unsupported parameter', () => {
      const result = validateAndTransformParameter(
        AIProvider.OPENAI,
        'test-model',
        ModelParameter.TOP_P,
        0.5,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
      expect(result.transformedValue).toBeUndefined();
    });

    it('should transform frequency_penalty with negative range', () => {
      const result = validateAndTransformParameter(
        AIProvider.OPENAI,
        'test-model',
        ModelParameter.FREQUENCY_PENALTY,
        0.25, // Should map to -1 in -2 to 2 range
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(true);
      expect(result.transformedValue).toBe(-1);
      expect(result.parameterRange).toEqual({ min: -2, max: 2 });
    });

    it('should handle transformation disabled flag', () => {
      const result = validateAndTransformParameter(
        AIProvider.OPENAI,
        'test-model',
        ModelParameter.TEMPERATURE,
        0.5,
        FunctionName.CHAT_COMPLETE,
        false, // shouldTransform = false
      );

      expect(result.isSupported).toBe(true);
      expect(result.transformedValue).toBeUndefined();
      expect(result.parameterRange).toEqual({ min: 0, max: 2 });
    });
  });

  describe('Pattern Matching', () => {
    beforeEach(() => {
      const testCapabilities: ProviderModelCapabilities = {
        provider: AIProvider.OPENAI,
        models: [
          {
            modelPattern: /^gpt-4.*$/,
            endpointConfigs: {
              [FunctionName.CHAT_COMPLETE]: {
                unsupportedParameters: [ModelParameter.REASONING_EFFORT],
              },
            },
          },
          {
            modelPattern: 'exact-match',
            endpointConfigs: {
              [FunctionName.CHAT_COMPLETE]: {
                unsupportedParameters: [ModelParameter.TEMPERATURE],
              },
            },
          },
        ],
      };

      registerProviderCapabilities(testCapabilities);
    });

    it('should match regex pattern for gpt-4 variants', () => {
      const result1 = validateParameter(
        AIProvider.OPENAI,
        'gpt-4',
        ModelParameter.REASONING_EFFORT,
        FunctionName.CHAT_COMPLETE,
      );
      const result2 = validateParameter(
        AIProvider.OPENAI,
        'gpt-4-turbo',
        ModelParameter.REASONING_EFFORT,
        FunctionName.CHAT_COMPLETE,
      );
      const result3 = validateParameter(
        AIProvider.OPENAI,
        'gpt-4o',
        ModelParameter.REASONING_EFFORT,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result1.isSupported).toBe(false);
      expect(result2.isSupported).toBe(false);
      expect(result3.isSupported).toBe(false);
    });

    it('should match exact string pattern', () => {
      const result = validateParameter(
        AIProvider.OPENAI,
        'exact-match',
        ModelParameter.TEMPERATURE,
        FunctionName.CHAT_COMPLETE,
      );

      expect(result.isSupported).toBe(false);
    });

    it('should not match incorrect pattern', () => {
      const result = validateParameter(
        AIProvider.OPENAI,
        'gpt-3.5-turbo',
        ModelParameter.REASONING_EFFORT,
        FunctionName.CHAT_COMPLETE,
      );

      // Should be supported because gpt-3.5 doesn't match the gpt-4.* pattern
      expect(result.isSupported).toBe(true);
    });
  });
});
