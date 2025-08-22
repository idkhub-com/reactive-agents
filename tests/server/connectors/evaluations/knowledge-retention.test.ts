import { knowledgeRetentionEvaluationConnector } from '@server/connectors/evaluations/knowledge-retention/knowledge-retention';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Knowledge Retention Evaluation', () => {
  beforeEach(() => {
    // Reset any mocks or state
  });

  it('should have correct connector configuration', () => {
    const details = knowledgeRetentionEvaluationConnector.getDetails();

    expect(details.method).toBe(EvaluationMethodName.KNOWLEDGE_RETENTION);
    expect(details.name).toBe('Knowledge Retention');
    expect(details.description).toContain('retains and recalls information');
  });

  it('should have parameter schema', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('should validate parameters correctly', () => {
    const validParams = {
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 1000,
    };

    const result =
      knowledgeRetentionEvaluationConnector.getParameterSchema.safeParse(
        validParams,
      );
    expect(result.success).toBe(true);
  });

  it('should reject invalid parameters', () => {
    const invalidParams = {
      temperature: 3.0, // Should be between 0 and 2
      max_tokens: 0, // Should be positive integer
    };

    const result =
      knowledgeRetentionEvaluationConnector.getParameterSchema.safeParse(
        invalidParams,
      );
    expect(result.success).toBe(false);
  });

  it('should validate max_tokens as positive integer', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid max_tokens values
    expect(schema.safeParse({ max_tokens: 1 }).success).toBe(true);
    expect(schema.safeParse({ max_tokens: 1000 }).success).toBe(true);
    expect(schema.safeParse({ max_tokens: 5000 }).success).toBe(true); // No upper limit

    // Test invalid max_tokens values
    expect(schema.safeParse({ max_tokens: 0 }).success).toBe(false);
    expect(schema.safeParse({ max_tokens: -100 }).success).toBe(false);
  });

  it('should accept empty parameters object', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    const result = schema.safeParse({});
    expect(result.success).toBe(true);

    if (result.success) {
      // All fields should be undefined when not provided (defaults applied in business logic)
      expect(result.data.threshold).toBeUndefined();
      expect(result.data.model).toBeUndefined();
      expect(result.data.temperature).toBeUndefined();
      expect(result.data.max_tokens).toBeUndefined();
      expect(result.data.timeout).toBeUndefined();
      expect(result.data.include_reason).toBeUndefined();
      expect(result.data.strict_mode).toBeUndefined();
      expect(result.data.async_mode).toBeUndefined();
      expect(result.data.verbose_mode).toBeUndefined();
      expect(result.data.batch_size).toBeUndefined();
    }
  });

  it('should validate threshold range correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid threshold values
    expect(schema.safeParse({ threshold: 0 }).success).toBe(true);
    expect(schema.safeParse({ threshold: 0.5 }).success).toBe(true);
    expect(schema.safeParse({ threshold: 1 }).success).toBe(true);

    // Test invalid threshold values
    expect(schema.safeParse({ threshold: -0.1 }).success).toBe(false);
    expect(schema.safeParse({ threshold: 1.1 }).success).toBe(false);
  });

  it('should validate temperature range correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid temperature values
    expect(schema.safeParse({ temperature: 0 }).success).toBe(true);
    expect(schema.safeParse({ temperature: 1 }).success).toBe(true);
    expect(schema.safeParse({ temperature: 2 }).success).toBe(true);

    // Test invalid temperature values
    expect(schema.safeParse({ temperature: -0.1 }).success).toBe(false);
    expect(schema.safeParse({ temperature: 2.1 }).success).toBe(false);
  });

  it('should validate UUID format for agent_id and dataset_id', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid UUIDs
    expect(
      schema.safeParse({
        agent_id: '123e4567-e89b-12d3-a456-426614174000',
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        dataset_id: '123e4567-e89b-12d3-a456-426614174001',
      }).success,
    ).toBe(true);

    // Test invalid UUIDs
    expect(schema.safeParse({ agent_id: 'invalid-uuid' }).success).toBe(false);
    expect(schema.safeParse({ dataset_id: 'also-invalid' }).success).toBe(
      false,
    );
  });

  it('should validate boolean parameters correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid boolean values
    expect(schema.safeParse({ include_reason: true }).success).toBe(true);
    expect(schema.safeParse({ include_reason: false }).success).toBe(true);
    expect(schema.safeParse({ strict_mode: true }).success).toBe(true);
    expect(schema.safeParse({ strict_mode: false }).success).toBe(true);
    expect(schema.safeParse({ async_mode: true }).success).toBe(true);
    expect(schema.safeParse({ async_mode: false }).success).toBe(true);
    expect(schema.safeParse({ verbose_mode: true }).success).toBe(true);
    expect(schema.safeParse({ verbose_mode: false }).success).toBe(true);
  });

  it('should validate integer parameters correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid integer values
    expect(schema.safeParse({ timeout: 1000 }).success).toBe(true);
    expect(schema.safeParse({ batch_size: 10 }).success).toBe(true);
    expect(schema.safeParse({ limit: 50 }).success).toBe(true);
    expect(schema.safeParse({ offset: 0 }).success).toBe(true);
    expect(schema.safeParse({ offset: 100 }).success).toBe(true);

    // Test invalid integer values
    expect(schema.safeParse({ timeout: 0 }).success).toBe(false);
    expect(schema.safeParse({ batch_size: 0 }).success).toBe(false);
    expect(schema.safeParse({ limit: 0 }).success).toBe(false);
    expect(schema.safeParse({ offset: -1 }).success).toBe(false);
  });
});
