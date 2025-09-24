import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { LogOutput } from '@shared/types/data/log-output';
import type {
  EvaluationMethodDetails,
  EvaluationRunJobDetails,
} from '@shared/types/idkhub/evaluations/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { describe, expect, it, type MockedFunction, vi } from 'vitest';
import { z } from 'zod';

describe('Connector Interfaces', () => {
  describe('EvaluationMethodConnector Interface', () => {
    // Mock implementation for testing interface compliance
    const createMockEvaluationMethodConnector =
      (): EvaluationMethodConnector => ({
        getDetails: vi.fn().mockReturnValue({
          method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
          name: 'Test Method',
          description: 'Test evaluation method',
        } as EvaluationMethodDetails),

        evaluate: vi.fn().mockResolvedValue({
          id: 'test-evaluation-run',
          agent_id: 'test-agent',
          skill_id: 'test-skill',
          dataset_id: 'test-dataset',
          evaluation_method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
          name: 'Test Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as EvaluationRun),

        evaluateOneLog: vi.fn().mockResolvedValue(undefined),

        getParameterSchema: z.object({
          threshold: z.number().min(0).max(1),
          model: z.string(),
        }),
      });

    const mockUserDataStorageConnector: UserDataStorageConnector = {
      getFeedback: vi.fn(),
      createFeedback: vi.fn(),
      deleteFeedback: vi.fn(),
      getImprovedResponse: vi.fn(),
      createImprovedResponse: vi.fn(),
      updateImprovedResponse: vi.fn(),
      deleteImprovedResponse: vi.fn(),
      getAgents: vi.fn(),
      createAgent: vi.fn(),
      updateAgent: vi.fn(),
      deleteAgent: vi.fn(),
      getSkills: vi.fn(),
      createSkill: vi.fn(),
      updateSkill: vi.fn(),
      deleteSkill: vi.fn(),
      getSkillOptimizations: vi.fn(),
      createSkillOptimization: vi.fn(),
      updateSkillConfiguration: vi.fn(),
      deleteSkillOptimization: vi.fn(),
      getTools: vi.fn(),
      createTool: vi.fn(),
      deleteTool: vi.fn(),
      getDatasets: vi.fn(),
      createDataset: vi.fn(),
      updateDataset: vi.fn(),
      deleteDataset: vi.fn(),
      getLogs: vi.fn(),
      deleteLog: vi.fn(),
      getDatasetLogs: vi.fn(),
      addLogsToDataset: vi.fn(),
      removeLogsFromDataset: vi.fn(),
      getEvaluationRuns: vi.fn().mockResolvedValue([
        {
          id: 'test-evaluation-run',
          agent_id: 'test-agent',
          skill_id: 'test-skill',
          dataset_id: 'test-dataset',
          evaluation_method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
          name: 'Test Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: { parameters: { threshold: 0.5 } },
          results: {},
        } as unknown as EvaluationRun,
      ]),
      createEvaluationRun: vi.fn(),
      updateEvaluationRun: vi.fn(),
      deleteEvaluationRun: vi.fn(),
      getLogOutputs: vi.fn().mockResolvedValue([
        { id: 'output-1', score: 0.8 },
        { id: 'output-2', score: 0.7 },
      ] as LogOutput[]),
      createLogOutput: vi.fn().mockResolvedValue({
        id: 'new-output',
        score: 0.9,
      } as LogOutput),
      deleteLogOutput: vi.fn(),
      // AI Provider API Key methods
      getAIProviderAPIKeys: vi.fn(),
      getAIProviderAPIKeyById: vi.fn(),
      createAIProviderAPIKey: vi.fn(),
      updateAIProviderAPIKey: vi.fn(),
      deleteAIProviderAPIKey: vi.fn(),
      // Model methods
      getModels: vi.fn(),
      getModelById: vi.fn(),
      createModel: vi.fn(),
      updateModel: vi.fn(),
      deleteModel: vi.fn(),
      // Skill-Model relationship methods
      getModelsBySkillId: vi.fn(),
      getSkillsByModelId: vi.fn(),
      addModelsToSkill: vi.fn(),
      removeModelsFromSkill: vi.fn(),
    };

    it('should have all required methods', () => {
      const connector = createMockEvaluationMethodConnector();

      expect(typeof connector.getDetails).toBe('function');
      expect(typeof connector.evaluate).toBe('function');
      expect(typeof connector.evaluateOneLog).toBe('function');
      expect(connector.getParameterSchema).toBeDefined();
    });

    it('should call getDetails and return evaluation method details', () => {
      const connector = createMockEvaluationMethodConnector();
      const details = connector.getDetails();

      expect(connector.getDetails).toHaveBeenCalled();
      expect(details).toMatchObject({
        method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
        name: 'Test Method',
        description: 'Test evaluation method',
      });
    });

    it('should call evaluate with correct parameters', async () => {
      const connector = createMockEvaluationMethodConnector();
      const jobDetails: EvaluationRunJobDetails = {
        agent_id: 'test-agent',
        skill_id: 'test-skill',
        dataset_id: 'test-dataset',
        evaluation_method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
        parameters: {
          threshold: 0.5,
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          timeout: 3000,
          include_reason: true,
          strict_mode: false,
          async_mode: true,
          verbose_mode: false,
          batch_size: 10,
        },
        name: 'Test Run',
        description: 'Test description',
      };

      const result = await connector.evaluate(
        jobDetails,
        mockUserDataStorageConnector,
      );

      expect(connector.evaluate).toHaveBeenCalledWith(
        jobDetails,
        mockUserDataStorageConnector,
      );
      expect(result).toMatchObject({
        id: 'test-evaluation-run',
        agent_id: 'test-agent',
        skill_id: 'test-skill',
        dataset_id: 'test-dataset',
      });
    });

    it('should call evaluateOneLog with correct parameters', async () => {
      const connector = createMockEvaluationMethodConnector();
      const evaluationRunId = 'test-evaluation-run-id';
      const log = {
        id: 'test-log-id',
        ai_provider_request_log: {
          request_body: { input: 'test input' },
          response_body: { output: 'test output' },
        },
        metadata: { ground_truth: { text: 'expected output' } },
      } as unknown as IdkRequestLog;

      await connector.evaluateOneLog(
        evaluationRunId,
        log,
        mockUserDataStorageConnector,
      );

      expect(connector.evaluateOneLog).toHaveBeenCalledWith(
        evaluationRunId,
        log,
        mockUserDataStorageConnector,
      );
      expect(connector.evaluateOneLog).toHaveBeenCalledTimes(1);
    });

    it('should have a valid parameter schema', () => {
      const connector = createMockEvaluationMethodConnector();
      const schema = connector.getParameterSchema;

      expect(schema).toBeInstanceOf(z.ZodObject);

      // Test schema validation
      const validParams = { threshold: 0.5, model: 'gpt-4o' };
      const invalidParams = { threshold: 1.5, model: 123 };

      expect(schema.safeParse(validParams).success).toBe(true);
      expect(schema.safeParse(invalidParams).success).toBe(false);
    });

    describe('evaluateOneLog method signature compliance', () => {
      it('should accept string evaluationRunId parameter', async () => {
        const connector = createMockEvaluationMethodConnector();
        const evaluationRunId = 'test-run-id';
        const log = {} as unknown as IdkRequestLog;

        await connector.evaluateOneLog(
          evaluationRunId,
          log,
          mockUserDataStorageConnector,
        );

        expect(connector.evaluateOneLog).toHaveBeenCalledWith(
          evaluationRunId,
          expect.any(Object),
          expect.any(Object),
        );

        // Verify first argument is a string
        const callArgs = (
          connector.evaluateOneLog as MockedFunction<
            typeof connector.evaluateOneLog
          >
        ).mock.calls[0];
        expect(typeof callArgs[0]).toBe('string');
        expect(callArgs[0]).toBe(evaluationRunId);
      });

      it('should accept IdkRequestLog as log parameter', async () => {
        const connector = createMockEvaluationMethodConnector();
        const log = {
          id: 'test-log',
          ai_provider_request_log: {
            request_body: { message: 'test' },
          },
          metadata: {},
        } as unknown as IdkRequestLog;

        await connector.evaluateOneLog(
          'test-run-id',
          log,
          mockUserDataStorageConnector,
        );

        const callArgs = (
          connector.evaluateOneLog as MockedFunction<
            typeof connector.evaluateOneLog
          >
        ).mock.calls[0];
        expect(callArgs[1]).toBe(log);
        expect(callArgs[1]).toHaveProperty('id');
        expect(callArgs[1]).toHaveProperty('ai_provider_request_log');
      });

      it('should accept UserDataStorageConnector as third parameter', async () => {
        const connector = createMockEvaluationMethodConnector();

        await connector.evaluateOneLog(
          'test-run-id',
          {} as unknown as IdkRequestLog,
          mockUserDataStorageConnector,
        );

        const callArgs = (
          connector.evaluateOneLog as MockedFunction<
            typeof connector.evaluateOneLog
          >
        ).mock.calls[0];
        expect(callArgs[2]).toBe(mockUserDataStorageConnector);
        expect(typeof callArgs[2].getEvaluationRuns).toBe('function');
        expect(typeof callArgs[2].updateEvaluationRun).toBe('function');
      });

      it('should return Promise<void>', async () => {
        const connector = createMockEvaluationMethodConnector();

        const result = connector.evaluateOneLog(
          'test-run-id',
          {} as unknown as IdkRequestLog,
          mockUserDataStorageConnector,
        );

        expect(result).toBeInstanceOf(Promise);
        const resolvedResult = await result;
        expect(resolvedResult).toBeUndefined();
      });
    });

    describe('interface backwards compatibility', () => {
      it('should maintain existing evaluate method signature', async () => {
        const connector = createMockEvaluationMethodConnector();
        const jobDetails: EvaluationRunJobDetails = {
          agent_id: 'test-agent',
          skill_id: 'test-skill',
          dataset_id: 'test-dataset',
          evaluation_method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
          parameters: {
            threshold: 0.5,
            model: 'gpt-4o',
            temperature: 0.1,
            max_tokens: 1000,
            timeout: 3000,
            include_reason: true,
            strict_mode: false,
            async_mode: true,
            verbose_mode: false,
            batch_size: 10,
          },
          name: 'Test',
          description: 'Test',
        };

        // Should accept existing parameters without breaking
        await connector.evaluate(jobDetails, mockUserDataStorageConnector);

        expect(connector.evaluate).toHaveBeenCalledWith(
          jobDetails,
          mockUserDataStorageConnector,
        );
      });

      it('should maintain existing getDetails method signature', () => {
        const connector = createMockEvaluationMethodConnector();

        const details = connector.getDetails();

        expect(details).toHaveProperty('method');
        expect(details).toHaveProperty('name');
        expect(details).toHaveProperty('description');
      });

      it('should maintain existing getParameterSchema property', () => {
        const connector = createMockEvaluationMethodConnector();

        expect(connector.getParameterSchema).toBeDefined();
        expect(connector.getParameterSchema.safeParse).toBeInstanceOf(Function);
      });
    });
  });

  describe('Interface Type Safety', () => {
    it('should enforce correct method signatures at compile time', () => {
      // This test verifies TypeScript compilation - if it compiles, types are correct
      const connector: EvaluationMethodConnector = {
        getDetails: () => ({
          method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
          name: 'Test',
          description: 'Test method',
        }),
        evaluate: async (_jobDetails, _userDataStorageConnector) =>
          ({}) as EvaluationRun,
        evaluateOneLog: async (
          _evaluationRunId,
          _log,
          _userDataStorageConnector,
        ) => undefined,
        getParameterSchema: z.object({}),
      };

      // Verify all methods exist and have correct types
      expect(typeof connector.getDetails).toBe('function');
      expect(typeof connector.evaluate).toBe('function');
      expect(typeof connector.evaluateOneLog).toBe('function');
      expect(connector.getParameterSchema).toBeDefined();
    });
  });
});
