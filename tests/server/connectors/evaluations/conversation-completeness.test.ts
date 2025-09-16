import { conversationCompletenessEvaluationConnector } from '@server/connectors/evaluations/conversation-completeness/conversation-completeness';
import type { ConversationCompletenessEvaluationParameters } from '@shared/types/idkhub/evaluations/conversation-completeness';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { describe, expect, it } from 'vitest';
import type z from 'zod';

describe('Conversation Completeness Evaluation', () => {
  it('should have correct connector configuration', () => {
    const details = conversationCompletenessEvaluationConnector.getDetails();

    expect(details.method).toBe(EvaluationMethodName.CONVERSATION_COMPLETENESS);
    expect(details.name).toBe('Conversation Completeness');
    expect(details.description).toContain(
      'Evaluates how well an AI assistant completes conversations',
    );
  });

  it('should have parameter schema', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    expect(schema).toBeDefined();
    expect(typeof schema.safeParse).toBe('function');
  });

  it('should validate parameters correctly', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    const validParams = {
      threshold: 0.7,
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 1000,
      timeout: 30000,
      include_reason: true,
      strict_mode: false,
      async_mode: true,
      verbose_mode: false,
      batch_size: 10,
    };

    const result = schema.safeParse(validParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBe(0.7);
      expect(result.data.model).toBe('gpt-4o-mini');
    }
  });

  it('should reject invalid parameters', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid threshold (should be between 0 and 1)
    const invalidThreshold = {
      threshold: 1.5,
      model: 'gpt-4o-mini',
    };

    const result = schema.safeParse(invalidThreshold);
    expect(result.success).toBe(false);
  });

  it('should use default values when fields are not provided', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    const minimalParams = {
      threshold: 0.8,
    };

    const result = schema.safeParse(minimalParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBe(0.8);
      expect(result.data.model).toBe('gpt-4');
      expect(result.data.temperature).toBe(0.1);
      expect(result.data.include_reason).toBe(true);
    }
  });

  it('should require at least threshold when validating', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Empty object should fail because threshold is required
    const emptyParams = {};

    const result = schema.safeParse(emptyParams);
    expect(result.success).toBe(false);
  });

  it('should accept minimal parameters with defaults applied', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    const minimalParams = {
      threshold: 0.6,
    };

    const result = schema.safeParse(minimalParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBe(0.6);
      expect(result.data.model).toBe('gpt-4');
      expect(result.data.temperature).toBe(0.1);
      expect(result.data.timeout).toBe(30000);
    }
  });

  it('should validate temperature range', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Temperature too high
    const highTemp = {
      temperature: 3.0,
    };

    const result = schema.safeParse(highTemp);
    expect(result.success).toBe(false);
  });

  it('should validate max_tokens as positive integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid max_tokens
    const invalidTokens = {
      max_tokens: -100,
    };

    const result = schema.safeParse(invalidTokens);
    expect(result.success).toBe(false);
  });

  it('should validate timeout as positive integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid timeout
    const invalidTimeout = {
      timeout: 0,
    };

    const result = schema.safeParse(invalidTimeout);
    expect(result.success).toBe(false);
  });

  it('should validate batch_size as positive integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid batch_size
    const invalidBatchSize = {
      batch_size: 0,
    };

    const result = schema.safeParse(invalidBatchSize);
    expect(result.success).toBe(false);
  });

  it('should validate limit as positive integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid limit
    const invalidLimit = {
      limit: -10,
    };

    const result = schema.safeParse(invalidLimit);
    expect(result.success).toBe(false);
  });

  it('should validate offset as non-negative integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid offset
    const invalidOffset = {
      offset: -5,
    };

    const result = schema.safeParse(invalidOffset);
    expect(result.success).toBe(false);
  });

  it('should handle boolean parameters correctly', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    const booleanParams = {
      threshold: 0.5,
      include_reason: true,
      strict_mode: false,
      async_mode: true,
      verbose_mode: false,
    };

    const result = schema.safeParse(booleanParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_reason).toBe(true);
      expect(result.data.strict_mode).toBe(false);
      expect(result.data.async_mode).toBe(true);
      expect(result.data.verbose_mode).toBe(false);
    }
  });

  it('should reject unknown parameters', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;
    const unknownParams = {
      threshold: 0.7,
      unknown_field: 'should be rejected',
    };

    const result = schema.safeParse(unknownParams);
    expect(result.success).toBe(false);
  });
});
