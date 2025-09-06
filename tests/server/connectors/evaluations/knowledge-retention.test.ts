import { knowledgeRetentionEvaluationConnector } from '@server/connectors/evaluations/knowledge-retention/knowledge-retention';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { KnowledgeRetentionEvaluationParameters } from '@shared/types/idkhub/evaluations/knowledge-retention';
import { beforeEach, describe, expect, it } from 'vitest';
import type z from 'zod';

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
      threshold: 0.8,
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
    const schema =
      knowledgeRetentionEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          KnowledgeRetentionEvaluationParameters,
          KnowledgeRetentionEvaluationParameters
        >
      >;
    // Test valid max_tokens values with required threshold
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 1 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 1000 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 5000 }).success).toBe(
      true,
    );

    // Test invalid max_tokens values
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 0 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: -100 }).success).toBe(
      false,
    );
  });

  it('should require threshold field', () => {
    const schema =
      knowledgeRetentionEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          KnowledgeRetentionEvaluationParameters,
          KnowledgeRetentionEvaluationParameters
        >
      >;

    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should validate minimal parameters with defaults', () => {
    const schema =
      knowledgeRetentionEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          KnowledgeRetentionEvaluationParameters,
          KnowledgeRetentionEvaluationParameters
        >
      >;

    const result = schema.safeParse({ threshold: 0.7 });
    expect(result.success).toBe(true);

    if (result.success) {
      // Fields with defaults should have default values when not provided
      expect(result.data.threshold).toBe(0.7);
      expect(result.data.model).toBe('gpt-4o');
      expect(result.data.temperature).toBe(0.1);
      expect(result.data.max_tokens).toBe(1000);
      expect(result.data.timeout).toBe(3000);
      expect(result.data.include_reason).toBe(true);
      expect(result.data.strict_mode).toBe(false);
      expect(result.data.async_mode).toBe(false);
      expect(result.data.verbose_mode).toBe(false);
      expect(result.data.batch_size).toBe(10);
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

    // Test valid temperature values with required threshold
    expect(schema.safeParse({ threshold: 0.5, temperature: 0 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, temperature: 1 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, temperature: 2 }).success).toBe(
      true,
    );

    // Test invalid temperature values
    expect(
      schema.safeParse({ threshold: 0.5, temperature: -0.1 }).success,
    ).toBe(false);
    expect(schema.safeParse({ threshold: 0.5, temperature: 2.1 }).success).toBe(
      false,
    );
  });

  it('should validate valid parameters correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid parameter combinations
    expect(
      schema.safeParse({
        threshold: 0.8,
        model: 'gpt-4o',
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        threshold: 0.6,
        temperature: 0.5,
        max_tokens: 2000,
      }).success,
    ).toBe(true);

    // Test that unknown fields are rejected (strict mode)
    expect(schema.safeParse({ unknown_field: 'value' }).success).toBe(false);
  });

  it('should validate boolean parameters correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid boolean values with required threshold
    expect(
      schema.safeParse({ threshold: 0.5, include_reason: true }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, include_reason: false }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, strict_mode: true }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, strict_mode: false }).success,
    ).toBe(true);
    expect(schema.safeParse({ threshold: 0.5, async_mode: true }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ threshold: 0.5, async_mode: false }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, verbose_mode: true }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, verbose_mode: false }).success,
    ).toBe(true);
  });

  it('should validate integer parameters correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid integer values with required threshold
    expect(schema.safeParse({ threshold: 0.5, timeout: 1000 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, batch_size: 10 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 50 }).success).toBe(
      true,
    );

    // Test invalid integer values
    expect(schema.safeParse({ threshold: 0.5, timeout: 0 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ threshold: 0.5, batch_size: 0 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 0 }).success).toBe(
      false,
    );
  });
});
