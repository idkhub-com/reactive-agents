import {
  executeEvaluation,
  executeSingleLogEvaluation,
  getEvaluationMethodSchema,
  getEvaluationMethods,
} from '@client/api/v1/idk/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the functions
const mockGetEvaluationMethods = vi.mocked(getEvaluationMethods);
const mockGetEvaluationMethodSchema = vi.mocked(getEvaluationMethodSchema);
const mockExecuteEvaluation = vi.mocked(executeEvaluation);
const mockExecuteSingleLogEvaluation = vi.mocked(executeSingleLogEvaluation);

vi.mock('@client/api/v1/idk/evaluations/methods', () => ({
  getEvaluationMethods: vi.fn(),
  getEvaluationMethodSchema: vi.fn(),
  executeEvaluation: vi.fn(),
  executeSingleLogEvaluation: vi.fn(),
}));

describe('Evaluation Methods API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEvaluationMethods', () => {
    it('should fetch evaluation methods successfully', async () => {
      const mockMethods = [
        {
          method: EvaluationMethodName.TASK_COMPLETION,
          name: 'Task Completion',
          description: 'Evaluates task completion',
        },
        {
          method: EvaluationMethodName.ROLE_ADHERENCE,
          name: 'Role Adherence',
          description: 'Evaluates role adherence',
        },
      ];

      mockGetEvaluationMethods.mockResolvedValueOnce(mockMethods);

      const result = await getEvaluationMethods();

      expect(result).toEqual(mockMethods);
      expect(mockGetEvaluationMethods).toHaveBeenCalledTimes(1);
    });

    it('should throw error when response is not ok', async () => {
      mockGetEvaluationMethods.mockRejectedValueOnce(
        new Error('Failed to fetch evaluation methods'),
      );

      await expect(getEvaluationMethods()).rejects.toThrow(
        'Failed to fetch evaluation methods',
      );
    });
  });

  describe('getEvaluationMethodSchema', () => {
    it('should fetch method schema successfully', async () => {
      const mockSchema = {
        type: 'object',
        properties: {
          threshold: { type: 'number', default: 0.7 },
          model: { type: 'string', default: 'gpt-4o' },
        },
      };

      mockGetEvaluationMethodSchema.mockResolvedValueOnce(mockSchema);

      const result = await getEvaluationMethodSchema(
        EvaluationMethodName.TASK_COMPLETION,
      );

      expect(result).toEqual(mockSchema);
    });

    it('should throw error when response is not ok', async () => {
      mockGetEvaluationMethodSchema.mockRejectedValueOnce(
        new Error('Failed to fetch schema for method: task_completion'),
      );

      await expect(
        getEvaluationMethodSchema(EvaluationMethodName.TASK_COMPLETION),
      ).rejects.toThrow('Failed to fetch schema for method: task_completion');
    });
  });

  describe('executeEvaluation', () => {
    const mockRequest = {
      agent_id: '123e4567-e89b-12d3-a456-426614174000',
      dataset_id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      parameters: {
        threshold: 0.7,
        model: 'gpt-4o',
      },
    };

    it('should execute evaluation successfully', async () => {
      const mockResponse = {
        evaluation_run_id: 'eval-run-123',
        status: 'completed',
        message: 'Evaluation completed successfully',
      };

      mockExecuteEvaluation.mockResolvedValueOnce(mockResponse);

      const result = await executeEvaluation(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockExecuteEvaluation).toHaveBeenCalledWith(mockRequest);
    });

    it('should throw error when response is not ok', async () => {
      mockExecuteEvaluation.mockRejectedValueOnce(
        new Error('Failed to execute evaluation'),
      );

      await expect(executeEvaluation(mockRequest)).rejects.toThrow(
        'Failed to execute evaluation',
      );
    });
  });

  describe('executeSingleLogEvaluation', () => {
    const mockSingleLogRequest = {
      agent_id: '123e4567-e89b-12d3-a456-426614174000',
      log_id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      parameters: {
        threshold: 0.7,
        model: 'gpt-4o',
      },
    };

    it('should execute single log evaluation successfully', async () => {
      const mockResponse = {
        evaluation_run_id: 'eval-run-123',
        status: 'completed',
        message: 'Single log evaluation completed successfully',
      };

      mockExecuteSingleLogEvaluation.mockResolvedValueOnce(mockResponse);

      const result = await executeSingleLogEvaluation(mockSingleLogRequest);

      expect(result).toEqual(mockResponse);
      expect(mockExecuteSingleLogEvaluation).toHaveBeenCalledWith(
        mockSingleLogRequest,
      );
    });

    it('should throw error when response is not ok', async () => {
      mockExecuteSingleLogEvaluation.mockRejectedValueOnce(
        new Error('Failed to execute single log evaluation'),
      );

      await expect(
        executeSingleLogEvaluation(mockSingleLogRequest),
      ).rejects.toThrow('Failed to execute single log evaluation');
    });

    it('should handle different evaluation methods', async () => {
      const roleAdherenceRequest = {
        ...mockSingleLogRequest,
        evaluation_method: EvaluationMethodName.ROLE_ADHERENCE,
      };

      const mockResponse = {
        evaluation_run_id: 'eval-run-456',
        status: 'completed',
        message: 'Single log evaluation completed successfully',
      };

      mockExecuteSingleLogEvaluation.mockResolvedValueOnce(mockResponse);

      const result = await executeSingleLogEvaluation(roleAdherenceRequest);

      expect(result).toEqual(mockResponse);
      expect(mockExecuteSingleLogEvaluation).toHaveBeenCalledWith(
        roleAdherenceRequest,
      );
    });

    it('should pass all request parameters correctly', async () => {
      const completeRequest = {
        agent_id: '123e4567-e89b-12d3-a456-426614174000',
        log_id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        name: 'Custom Single Log Evaluation',
        description: 'Custom description for single log evaluation',
        parameters: {
          threshold: 0.9,
          model: 'gpt-4o',
          temperature: 0.2,
          max_tokens: 2000,
          include_reason: false,
          strict_mode: true,
        },
      };

      mockExecuteSingleLogEvaluation.mockResolvedValueOnce({
        evaluation_run_id: 'eval-run-789',
        status: 'completed',
        message: 'Completed',
      });

      await executeSingleLogEvaluation(completeRequest);

      expect(mockExecuteSingleLogEvaluation).toHaveBeenCalledWith(
        completeRequest,
      );
    });
  });
});
