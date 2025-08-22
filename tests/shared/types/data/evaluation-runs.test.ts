import {
  EvaluationRun,
  EvaluationRunCreateParams,
  EvaluationRunQueryParams,
  EvaluationRunStatus,
  EvaluationRunUpdateParams,
} from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { describe, expect, it } from 'vitest';

describe('EvaluationRunStatus enum', () => {
  it('should have correct enum values', () => {
    expect(EvaluationRunStatus.PENDING).toBe('pending');
    expect(EvaluationRunStatus.RUNNING).toBe('running');
    expect(EvaluationRunStatus.COMPLETED).toBe('completed');
    expect(EvaluationRunStatus.FAILED).toBe('failed');
  });
});

describe('EvaluationRun schema', () => {
  it('should validate a complete evaluation run object', () => {
    const validEvaluationRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      dataset_id: '123e4567-e89b-12d3-a456-426614174001',
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      name: 'Test Evaluation',
      description: 'A test evaluation run',
      status: EvaluationRunStatus.COMPLETED,
      results: { accuracy: 0.95, precision: 0.92 },
      metadata: { model: 'gpt-4', version: '1.0' },
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:10:00.000Z',
      started_at: '2024-01-01T00:00:30.000Z',
      completed_at: '2024-01-01T00:10:00.000Z',
    };

    expect(() => EvaluationRun.parse(validEvaluationRun)).not.toThrow();
  });

  it('should require evaluation_method field', () => {
    const invalidEvaluationRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      dataset_id: '123e4567-e89b-12d3-a456-426614174001',
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'Test Evaluation',
      status: EvaluationRunStatus.PENDING,
      results: {},
      metadata: {},
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    expect(() => EvaluationRun.parse(invalidEvaluationRun)).toThrow();
  });

  it('should validate evaluation_method as non-empty string', () => {
    const invalidEvaluationRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      dataset_id: '123e4567-e89b-12d3-a456-426614174001',
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      evaluation_method: '',
      name: 'Test Evaluation',
      status: EvaluationRunStatus.PENDING,
      results: {},
      metadata: {},
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    expect(() => EvaluationRun.parse(invalidEvaluationRun)).toThrow();
  });

  it('should validate status as EvaluationRunStatus enum', () => {
    const invalidEvaluationRun = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      dataset_id: '123e4567-e89b-12d3-a456-426614174001',
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      name: 'Test Evaluation',
      status: 'invalid_status',
      results: {},
      metadata: {},
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    expect(() => EvaluationRun.parse(invalidEvaluationRun)).toThrow();
  });
});

describe('EvaluationRunQueryParams schema', () => {
  it('should validate query params with evaluation_method', () => {
    const validParams = {
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      status: EvaluationRunStatus.RUNNING,
      limit: 10,
      offset: 0,
    };

    expect(() => EvaluationRunQueryParams.parse(validParams)).not.toThrow();
  });

  it('should allow optional evaluation_method', () => {
    const validParams = {
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      limit: 5,
    };

    expect(() => EvaluationRunQueryParams.parse(validParams)).not.toThrow();
  });

  it('should validate status as EvaluationRunStatus enum', () => {
    const invalidParams = {
      status: 'invalid_status',
    };

    expect(() => EvaluationRunQueryParams.parse(invalidParams)).toThrow();
  });

  it('should be strict about unknown fields', () => {
    const invalidParams = {
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      unknown_field: 'value',
    };

    expect(() => EvaluationRunQueryParams.parse(invalidParams)).toThrow();
  });
});

describe('EvaluationRunCreateParams schema', () => {
  it('should validate create params with evaluation_method', () => {
    const validParams = {
      dataset_id: '123e4567-e89b-12d3-a456-426614174001',
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      name: 'New Evaluation',
      description: 'A new evaluation run',
    };

    expect(() => EvaluationRunCreateParams.parse(validParams)).not.toThrow();
  });

  it('should require evaluation_method', () => {
    const invalidParams = {
      dataset_id: '123e4567-e89b-12d3-a456-426614174001',
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'New Evaluation',
    };

    expect(() => EvaluationRunCreateParams.parse(invalidParams)).toThrow();
  });

  it('should require dataset_id and agent_id', () => {
    const invalidParams = {
      name: 'New Evaluation',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
    };

    expect(() => EvaluationRunCreateParams.parse(invalidParams)).toThrow();
  });

  it('should default metadata to empty object', () => {
    const params = {
      dataset_id: '123e4567-e89b-12d3-a456-426614174001',
      agent_id: '123e4567-e89b-12d3-a456-426614174002',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      name: 'New Evaluation',
    };

    const parsed = EvaluationRunCreateParams.parse(params);
    expect(parsed.metadata).toEqual({});
  });
});

describe('EvaluationRunUpdateParams schema', () => {
  it('should validate update params with status change', () => {
    const validParams = {
      status: EvaluationRunStatus.COMPLETED,
      results: { score: 0.85 },
      completed_at: '2024-01-01T00:10:00.000Z',
    };

    expect(() => EvaluationRunUpdateParams.parse(validParams)).not.toThrow();
  });

  it('should not allow extra parameters', () => {
    const inputData = {
      status: EvaluationRunStatus.COMPLETED,
      results: { score: 0.85 },
      completed_at: '2024-01-01T00:10:00.000Z',
      id: '123e4567-e89b-12d3-a456-426614174000',
    };

    expect(() => EvaluationRunUpdateParams.parse(inputData)).toThrow(
      `\
[
  {
    "code": "unrecognized_keys",
    "keys": [
      "id"
    ],
    "path": [],
    "message": "Unrecognized key(s) in object: 'id'"
  }
]`,
    );
  });

  it('should validate status as EvaluationRunStatus enum', () => {
    const invalidParams = {
      status: 'invalid_status',
    };

    expect(() => EvaluationRunUpdateParams.parse(invalidParams)).toThrow();
  });

  it('should require at least one field for update', () => {
    const invalidParams = {};

    expect(() => EvaluationRunUpdateParams.parse(invalidParams)).toThrow();
  });

  it('should allow multiple fields to be updated', () => {
    const validParams = {
      name: 'Updated Evaluation',
      description: 'Updated description',
      status: EvaluationRunStatus.RUNNING,
      metadata: { updated: true },
      started_at: '2024-01-01T00:00:30.000Z',
    };

    expect(() => EvaluationRunUpdateParams.parse(validParams)).not.toThrow();
  });
});
