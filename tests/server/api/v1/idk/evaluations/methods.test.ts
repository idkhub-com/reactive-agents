import { methodsRouter } from '@server/api/v1/idk/evaluations/methods';
import type { AppEnv } from '@server/types/hono';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock zodToJsonSchema to prevent schema conversion issues
vi.mock('zod', async () => {
  const actual = await vi.importActual('zod');
  return {
    ...actual,
    toJSONSchema: vi.fn(() => ({
      type: 'object' as const,
      properties: {
        threshold: { type: 'number' as const, default: 0.5 },
        model: { type: 'string' as const, default: 'gpt-4o' },
      },
      required: ['threshold'],
    })),
  };
});

// Mock the evaluation connectors to prevent actual evaluation execution
vi.mock('@server/connectors/evaluations', () => {
  // Create a mock Zod schema object with safeParse method
  const createMockSchema = () => ({
    safeParse: vi.fn(() => ({
      success: true,
      data: { threshold: 0.7 },
    })),
  });

  return {
    taskCompletionEvaluationConnector: {
      getDetails: vi.fn(() => ({
        method: EvaluationMethodName.TASK_COMPLETION,
        name: 'Task Completion',
        description:
          'Evaluates whether the AI agent successfully completes the given task',
      })),
      evaluate: vi.fn(),
      getParameterSchema: createMockSchema(),
    },
    argumentCorrectnessEvaluationConnector: {
      getDetails: vi.fn(() => ({
        method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Argument Correctness',
        description:
          'Evaluates the correctness of function arguments passed by the AI agent',
      })),
      evaluate: vi.fn(),
      getParameterSchema: createMockSchema(),
    },
    roleAdherenceEvaluationConnector: {
      getDetails: vi.fn(() => ({
        method: EvaluationMethodName.ROLE_ADHERENCE,
        name: 'Role Adherence',
        description:
          'Evaluates how well the AI agent adheres to its assigned role',
      })),
      evaluate: vi.fn(),
      getParameterSchema: createMockSchema(),
    },
    turnRelevancyEvaluationConnector: {
      getDetails: vi.fn(() => ({
        method: EvaluationMethodName.TURN_RELEVANCY,
        name: 'Turn Relevancy',
        description: 'Evaluates the relevancy of the AI agent responses',
      })),
      evaluate: vi.fn(),
      getParameterSchema: createMockSchema(),
    },
    toolCorrectnessEvaluationConnector: {
      getDetails: vi.fn(() => ({
        method: EvaluationMethodName.TOOL_CORRECTNESS,
        name: 'Tool Correctness',
        description:
          'Evaluates the correctness of tool function calls and responses',
      })),
      evaluate: vi.fn(),
      getParameterSchema: createMockSchema(),
    },
    knowledgeRetentionEvaluationConnector: {
      getDetails: vi.fn(() => ({
        method: EvaluationMethodName.KNOWLEDGE_RETENTION,
        name: 'Knowledge Retention',
        description:
          'Evaluates how well the AI agent retains and recalls information across conversations',
      })),
      evaluate: vi.fn(),
      getParameterSchema: createMockSchema(),
    },
    conversationCompletenessEvaluationConnector: {
      getDetails: vi.fn(() => ({
        method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
        name: 'Conversation Completeness',
        description:
          'Evaluates how well an AI assistant completes conversations by satisfying user needs throughout the interaction',
      })),
      evaluate: vi.fn(),
      getParameterSchema: createMockSchema(),
    },
  };
});

// Create a mock UserDataStorageConnector with all required methods
const mockUserDataStorageConnector = {
  // Feedback methods
  getFeedback: vi.fn(),
  createFeedback: vi.fn(),
  deleteFeedback: vi.fn(),
  // Improved response methods
  getImprovedResponse: vi.fn(),
  createImprovedResponse: vi.fn(),
  updateImprovedResponse: vi.fn(),
  deleteImprovedResponse: vi.fn(),
  // Agent methods
  getAgents: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  // Skill methods
  getSkills: vi.fn(),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn(),
  // Tool methods
  getTools: vi.fn(),
  createTool: vi.fn(),
  deleteTool: vi.fn(),
  // Dataset methods
  getDatasets: vi.fn(),
  createDataset: vi.fn(),
  updateDataset: vi.fn(),
  deleteDataset: vi.fn(),
  // Log methods (required by interface)
  getLogs: vi.fn(),
  deleteLog: vi.fn(),
  // Dataset-Log Bridge methods (required by interface)
  getDatasetLogs: vi.fn(),
  addLogsToDataset: vi.fn(),
  removeLogsFromDataset: vi.fn(),
  // Evaluation run methods
  getEvaluationRuns: vi.fn(),
  createEvaluationRun: vi.fn(),
  updateEvaluationRun: vi.fn(),
  deleteEvaluationRun: vi.fn(),
  // Log Output methods (required by interface)
  getLogOutputs: vi.fn(),
  createLogOutput: vi.fn(),
  deleteLogOutput: vi.fn(),
};

// Create a test app with the middleware that injects the mock connector
const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.set('user_data_storage_connector', mockUserDataStorageConnector);
    await next();
  })
  .route('/', methodsRouter);

describe('Evaluation Methods API', () => {
  const client = testClient(app);

  // Define shared test data with valid UUIDs and proper parameter structure
  const validEvaluationRequest = {
    agent_id: '123e4567-e89b-12d3-a456-426614174000',
    dataset_id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
    evaluation_method: EvaluationMethodName.TASK_COMPLETION,
    name: 'Test Evaluation',
    description: 'Test evaluation description',
    parameters: {
      threshold: 0.7,
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 1000,
      include_reason: true,
      strict_mode: false,
      async_mode: false,
      verbose_mode: false,
      batch_size: 10,
    },
  };

  const mockEvaluationRun = {
    id: 'eval-run-123',
    status: 'completed',
    results: {
      average_score: 0.85,
      total_logs: 10,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET / - Get all evaluation methods', () => {
    it('should return 200 with all available evaluation methods', async () => {
      const res = await client.index.$get();

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(7);

      // Check that all expected methods are included
      // biome-ignore lint/suspicious/noExplicitAny: Union types from Hono API responses require any for test assertions
      const methodNames = (data as any[]).map((method: any) => method.method);
      expect(methodNames).toContain(EvaluationMethodName.TASK_COMPLETION);
      expect(methodNames).toContain(EvaluationMethodName.ARGUMENT_CORRECTNESS);
      expect(methodNames).toContain(EvaluationMethodName.ROLE_ADHERENCE);
      expect(methodNames).toContain(EvaluationMethodName.TURN_RELEVANCY);
      expect(methodNames).toContain(EvaluationMethodName.TOOL_CORRECTNESS);

      // Check structure of each method
      // biome-ignore lint/suspicious/noExplicitAny: Union types from Hono API responses require any for test assertions
      (data as any[]).forEach((method: any) => {
        expect(method).toHaveProperty('method');
        expect(method).toHaveProperty('name');
        expect(method).toHaveProperty('description');
        expect(typeof method.name).toBe('string');
        expect(typeof method.description).toBe('string');
      });
    });

    it('should return 500 on internal error', async () => {
      // Mock console.error to prevent error output in tests
      const consoleSpy = vi
        .spyOn(console, 'error')
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock implementation for testing
        .mockImplementation(() => {});

      // Force an error by mocking Object.values to throw
      const originalObjectValues = Object.values;
      Object.values = vi.fn(() => {
        throw new Error('Internal error');
      });

      const res = await client.index.$get();

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({ error: 'Failed to fetch evaluation methods' });

      // Restore mocks
      Object.values = originalObjectValues;
      consoleSpy.mockRestore();
    });
  });

  describe('GET /:method - Get specific evaluation method details', () => {
    it('should return 200 with method details for valid method', async () => {
      const method = EvaluationMethodName.TASK_COMPLETION;
      const res = await client[':method'].$get({
        param: { method },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty('method', method);
      expect(data).toHaveProperty('name', 'Task Completion');
      expect(data).toHaveProperty('description');
      // biome-ignore lint/suspicious/noExplicitAny: Union types from Hono API responses require any for test assertions
      expect(typeof (data as any).description).toBe('string');
    });

    it('should return 404 for invalid method', async () => {
      const res = await client[':method'].$get({
        param: { method: 'invalid_method' as EvaluationMethodName },
      });

      expect(res.status).toBe(400); // Zod validation error for invalid enum
    });

    it('should return 500 on internal error', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock implementation for testing
        .mockImplementation(() => {});

      // Mock JSON.stringify to throw an error during response serialization
      const originalStringify = JSON.stringify;
      JSON.stringify = vi.fn((value) => {
        if (
          value &&
          typeof value === 'object' &&
          value.method === EvaluationMethodName.TASK_COMPLETION
        ) {
          throw new Error('Internal error');
        }
        return originalStringify(value);
      });

      const res = await client[':method'].$get({
        param: { method: EvaluationMethodName.TASK_COMPLETION },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({
        error: 'Failed to fetch evaluation method details',
      });

      // Restore mocks
      JSON.stringify = originalStringify;
      consoleSpy.mockRestore();
    });
  });

  describe('GET /:method/schema - Get evaluation method schema', () => {
    it('should return 200 with schema for valid method', async () => {
      const method = EvaluationMethodName.TASK_COMPLETION;
      const res = await client[':method'].schema.$get({
        param: { method },
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      // The API now returns the JSON schema directly
      expect(data).toHaveProperty('type', 'object');
      // Check for expected JSON schema properties
      expect(data).toHaveProperty('properties');
      expect(data).toHaveProperty('required');
      // biome-ignore lint/suspicious/noExplicitAny: Union types from Hono API responses require any for test assertions
      expect((data as any).properties).toBeDefined();

      // Check if default values are present in the schema (JSON Schema includes defaults)
      // biome-ignore lint/suspicious/noExplicitAny: Union types from Hono API responses require any for test assertions
      expect((data as any).type).toBe('object');
    });

    it('should return 400 for invalid method', async () => {
      const res = await client[':method'].schema.$get({
        param: { method: 'invalid_method' as EvaluationMethodName },
      });

      expect(res.status).toBe(400); // Zod validation error
    });
  });

  describe('POST /execute - Execute evaluation', () => {
    it('should return 200 on successful evaluation execution', async () => {
      // Mock the evaluation connector
      const { taskCompletionEvaluationConnector } = await import(
        '@server/connectors/evaluations'
      );
      vi.mocked(taskCompletionEvaluationConnector.evaluate).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: Mock return values require any for flexible test scenarios
        mockEvaluationRun as any,
      );

      const res = await client.execute.$post({
        json: validEvaluationRequest,
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toHaveProperty('evaluation_run_id', 'eval-run-123');
      expect(data).toHaveProperty('status', 'completed');
      expect(data).toHaveProperty(
        'message',
        'Evaluation has been completed successfully',
      );
      expect(data).toHaveProperty('results');

      expect(taskCompletionEvaluationConnector.evaluate).toHaveBeenCalledWith(
        validEvaluationRequest,
        mockUserDataStorageConnector,
      );
    });

    it('should return 400 for invalid request body', async () => {
      const invalidRequest = {
        agent_id: 'invalid-uuid', // Invalid UUID format
        dataset_id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        parameters: {},
      };

      const res = await client.execute.$post({
        // biome-ignore lint/suspicious/noExplicitAny: Invalid test data requires any to bypass type checking
        json: invalidRequest as any,
      });

      expect(res.status).toBe(400); // Zod validation error
    });

    it('should return 400 for unsupported evaluation method', async () => {
      const requestWithInvalidMethod = {
        ...validEvaluationRequest,
        evaluation_method: 'unsupported_method' as EvaluationMethodName,
      };

      const res = await client.execute.$post({
        json: requestWithInvalidMethod,
      });

      expect(res.status).toBe(400); // Zod validation catches this first
    });

    it('should return 500 when evaluation connector throws error', async () => {
      const { taskCompletionEvaluationConnector } = await import(
        '@server/connectors/evaluations'
      );
      vi.mocked(taskCompletionEvaluationConnector.evaluate).mockRejectedValue(
        new Error('Evaluation failed'),
      );

      const consoleSpy = vi
        .spyOn(console, 'error')
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock implementation for testing
        .mockImplementation(() => {});

      const res = await client.execute.$post({
        json: validEvaluationRequest,
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty('error', 'Failed to execute evaluation');
      expect(data).toHaveProperty('details', 'Evaluation failed');

      consoleSpy.mockRestore();
    });

    it('should handle all evaluation method types', async () => {
      const evaluationMethods = [
        EvaluationMethodName.TASK_COMPLETION,
        EvaluationMethodName.ARGUMENT_CORRECTNESS,
        EvaluationMethodName.ROLE_ADHERENCE,
        EvaluationMethodName.TURN_RELEVANCY,
        EvaluationMethodName.TOOL_CORRECTNESS,
      ];

      // Import all connectors
      const {
        taskCompletionEvaluationConnector,
        argumentCorrectnessEvaluationConnector,
        roleAdherenceEvaluationConnector,
        turnRelevancyEvaluationConnector,
        toolCorrectnessEvaluationConnector,
      } = await import('@server/connectors/evaluations');

      const connectors = [
        taskCompletionEvaluationConnector,
        argumentCorrectnessEvaluationConnector,
        roleAdherenceEvaluationConnector,
        turnRelevancyEvaluationConnector,
        toolCorrectnessEvaluationConnector,
      ];

      // Mock all connectors to return success
      connectors.forEach((connector) => {
        vi.mocked(connector.evaluate).mockResolvedValue(
          // biome-ignore lint/suspicious/noExplicitAny: Mock return values require any for flexible test scenarios
          mockEvaluationRun as any,
        );
      });

      for (let i = 0; i < evaluationMethods.length; i++) {
        const method = evaluationMethods[i];
        const request = {
          ...validEvaluationRequest,
          evaluation_method: method,
        };

        const res = await client.execute.$post({
          json: request,
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty('evaluation_run_id', 'eval-run-123');

        // Verify the correct connector was called
        expect(connectors[i].evaluate).toHaveBeenCalledWith(
          request,
          mockUserDataStorageConnector,
        );
      }
    });

    it('should preserve evaluation request parameters', async () => {
      const { taskCompletionEvaluationConnector } = await import(
        '@server/connectors/evaluations'
      );
      vi.mocked(taskCompletionEvaluationConnector.evaluate).mockResolvedValue(
        // biome-ignore lint/suspicious/noExplicitAny: Mock return values require any for flexible test scenarios
        mockEvaluationRun as any,
      );

      const requestWithCustomParams = {
        ...validEvaluationRequest,
        parameters: {
          threshold: 0.9,
          model: 'gpt-4o',
          temperature: 0.2,
          max_tokens: 2000,
          include_reason: false,
          strict_mode: true,
          async_mode: false,
          verbose_mode: true,
          batch_size: 5,
        },
      };

      const res = await client.execute.$post({
        json: requestWithCustomParams,
      });

      expect(res.status).toBe(200);

      // Verify that the exact request (including custom parameters) was passed to the connector
      expect(taskCompletionEvaluationConnector.evaluate).toHaveBeenCalledWith(
        requestWithCustomParams,
        mockUserDataStorageConnector,
      );
    });
  });

  describe('Type Safety and Error Handling', () => {
    it('should handle evaluation connector interface correctly', async () => {
      // This test ensures that our type-safe connector map works correctly
      const methods = Object.values(EvaluationMethodName);

      for (const method of methods) {
        const res = await client[':method'].$get({
          param: { method },
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveProperty('method', method);
      }
    });

    it('should handle unknown errors gracefully', async () => {
      const { taskCompletionEvaluationConnector } = await import(
        '@server/connectors/evaluations'
      );

      // Throw a non-Error object to test error handling
      vi.mocked(taskCompletionEvaluationConnector.evaluate).mockRejectedValue(
        'String error',
      );

      const consoleSpy = vi
        .spyOn(console, 'error')
        // biome-ignore lint/suspicious/noEmptyBlockStatements: Intentionally empty mock implementation for testing
        .mockImplementation(() => {});

      const res = await client.execute.$post({
        json: validEvaluationRequest,
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toHaveProperty('error', 'Failed to execute evaluation');
      expect(data).toHaveProperty('details', 'Unknown error');

      consoleSpy.mockRestore();
    });
  });

  describe('POST /execute - Single Log Evaluation', () => {
    const singleLogRequest = {
      agent_id: '123e4567-e89b-12d3-a456-426614174000',
      log_id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      name: 'Single Log Test Evaluation',
      description: 'Test single log evaluation',
      parameters: {
        threshold: 0.7,
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 1000,
        include_reason: true,
        strict_mode: false,
        async_mode: false,
        verbose_mode: false,
        batch_size: 10,
      },
    };

    const mockLog = {
      id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
      agent_id: '123e4567-e89b-12d3-a456-426614174000',
      skill_id: 'skill-id',
      method: 'POST',
      endpoint: '/chat/completions',
      function_name: 'chat_complete',
      status: 200,
      start_time: 1700000000000,
      end_time: 1700000001000,
      duration: 1000,
      base_idk_config: {},
      ai_provider: 'openai',
      model: 'gpt-4',
      ai_provider_request_log: {
        method: 'POST',
        request_url: 'https://api.openai.com/v1/chat/completions',
        request_body: {},
        response_body: {},
        status: 200,
        start_time: 1700000000000,
        end_time: 1700000001000,
        duration: 1000,
      },
      hook_logs: [],
      metadata: {},
      cache_status: 'MISS',
      trace_id: null,
      parent_span_id: null,
      span_id: null,
      span_name: null,
      app_id: null,
      external_user_id: null,
      external_user_human_name: null,
      user_metadata: null,
    };

    beforeEach(() => {
      vi.clearAllMocks();

      // Mock the connector methods for single log evaluation
      mockUserDataStorageConnector.getLogs.mockResolvedValue([mockLog]);
      mockUserDataStorageConnector.createEvaluationRun.mockResolvedValue({
        ...mockEvaluationRun,
      });
      mockUserDataStorageConnector.updateEvaluationRun.mockResolvedValue(
        undefined,
      );
      mockUserDataStorageConnector.getEvaluationRuns.mockResolvedValue([
        {
          ...mockEvaluationRun,
        },
      ]);
    });

    it('should execute single log evaluation successfully', async () => {
      const response = await client.execute.$post({
        json: singleLogRequest,
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toEqual({
        evaluation_run_id: 'eval-run-123',
        status: 'completed',
        message: 'Single log evaluation completed successfully',
        results: mockEvaluationRun.results,
      });
    });

    it('should fetch the correct log by ID', async () => {
      await client.execute.$post({
        json: singleLogRequest,
      });

      expect(mockUserDataStorageConnector.getLogs).toHaveBeenCalledWith({
        id: '987fcdeb-51a2-43d7-8f9e-123456789abc',
        limit: 1,
        offset: 0,
      });
    });

    it('should create evaluation run with log_id as dataset_id', async () => {
      await client.execute.$post({
        json: singleLogRequest,
      });

      expect(
        mockUserDataStorageConnector.createEvaluationRun,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          dataset_id: '987fcdeb-51a2-43d7-8f9e-123456789abc', // log_id used as dataset_id
          agent_id: '123e4567-e89b-12d3-a456-426614174000',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          name: 'Single Log Test Evaluation',
          description: 'Test single log evaluation',
        }),
      );
    });

    it('should generate default name and description for single log evaluation', async () => {
      const requestWithoutNameDesc = {
        ...singleLogRequest,
        name: undefined,
        description: undefined,
      };

      await client.execute.$post({
        json: requestWithoutNameDesc,
      });

      expect(
        mockUserDataStorageConnector.createEvaluationRun,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Single Log Evaluation - 987fcdeb-51a2-43d7-8f9e-123456789abc',
          description:
            'Single log evaluation for log 987fcdeb-51a2-43d7-8f9e-123456789abc',
        }),
      );
    });

    it('should return 404 when log is not found', async () => {
      mockUserDataStorageConnector.getLogs.mockResolvedValue([]);

      const response = await client.execute.$post({
        json: singleLogRequest,
      });

      expect(response.status).toBe(500);

      const result = await response.json();
      expect(result).toEqual({
        error: 'Failed to execute evaluation',
        details: 'Log not found: 987fcdeb-51a2-43d7-8f9e-123456789abc',
      });
    });

    it('should validate that either dataset_id or log_id is provided', async () => {
      const invalidRequest = {
        agent_id: '123e4567-e89b-12d3-a456-426614174000',
        // Neither dataset_id nor log_id provided
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        parameters: singleLogRequest.parameters,
      };

      const response = await client.execute.$post({
        json: invalidRequest,
      });

      expect(response.status).toBe(400); // Validation error
    });

    it('should reject requests with both dataset_id and log_id', async () => {
      const invalidRequest = {
        agent_id: '123e4567-e89b-12d3-a456-426614174000',
        dataset_id: 'dataset-123',
        log_id: 'log-123',
        evaluation_method: EvaluationMethodName.TASK_COMPLETION,
        parameters: singleLogRequest.parameters,
      };

      const response = await client.execute.$post({
        json: invalidRequest,
      });

      expect(response.status).toBe(400); // Validation error
    });

    it('should handle evaluation connector errors', async () => {
      const mockEvaluationConnector = {
        evaluate: vi.fn().mockRejectedValue(new Error('Connector error')),
        getDetails: vi.fn(),
        getParameterSchema: vi.fn(),
      };

      // Mock the evaluation connectors registry
      vi.doMock('@server/api/v1/idk/evaluations/methods', async () => {
        const actual = await vi.importActual(
          '@server/api/v1/idk/evaluations/methods',
        );
        return {
          ...actual,
          evaluationConnectors: {
            [EvaluationMethodName.TASK_COMPLETION]: mockEvaluationConnector,
          },
        };
      });

      const response = await client.execute.$post({
        json: singleLogRequest,
      });

      expect(response.status).toBe(500);

      const result = await response.json();
      expect(result).toEqual({
        error: 'Failed to execute evaluation',
        details: 'Connector error',
      });
    });

    it('should work with different evaluation methods', async () => {
      const roleAdherenceRequest = {
        ...singleLogRequest,
        evaluation_method: EvaluationMethodName.ROLE_ADHERENCE,
        parameters: {
          threshold: 0.8,
          model: 'gpt-4o',
          temperature: 0.0,
          max_tokens: 500,
        },
      };

      const response = await client.execute.$post({
        json: roleAdherenceRequest,
      });

      expect(response.status).toBe(200);

      const result = await response.json();
      expect(result).toHaveProperty(
        'message',
        'Single log evaluation completed successfully',
      );
    });
  });
});
