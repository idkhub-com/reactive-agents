import { conversationCompletenessEvaluationConnector } from '@server/connectors/evaluations/conversation-completeness/conversation-completeness';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { describe, expect, it } from 'vitest';

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
      conversationCompletenessEvaluationConnector.getParameterSchema;
    expect(schema).toBeDefined();
    expect(typeof schema.safeParse).toBe('function');
  });

  it('should validate parameters correctly', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;
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
      limit: 50,
      offset: 0,
      agent_id: '123e4567-e89b-12d3-a456-426614174000',
      dataset_id: '123e4567-e89b-12d3-a456-426614174001',
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

  it('should use default threshold when not provided', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;
    const paramsWithoutThreshold = {
      model: 'gpt-4o-mini',
      temperature: 0.1,
    };

    const result = schema.safeParse(paramsWithoutThreshold);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBeUndefined(); // Optional field not provided
    }
  });

  it('should validate UUID format for agent_id and dataset_id', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid UUID format
    const invalidUUID = {
      agent_id: 'invalid-uuid',
      dataset_id: 'also-invalid',
    };

    const result = schema.safeParse(invalidUUID);
    expect(result.success).toBe(false);
  });

  it('should accept optional parameters', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;
    const minimalParams = {
      threshold: 0.6,
    };

    const result = schema.safeParse(minimalParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBe(0.6);
      expect(result.data.model).toBeUndefined();
      expect(result.data.temperature).toBeUndefined();
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
      conversationCompletenessEvaluationConnector.getParameterSchema;
    const booleanParams = {
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
