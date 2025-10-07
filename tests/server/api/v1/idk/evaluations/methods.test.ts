import { methodsRouter } from '@server/api/v1/idk/evaluations/methods';
import { argumentCorrectnessEvaluationConnector } from '@server/connectors/evaluations/argument-correctness';
import { roleAdherenceEvaluationConnector } from '@server/connectors/evaluations/role-adherence';
import { taskCompletionEvaluationConnector } from '@server/connectors/evaluations/task-completion';
import { toolCorrectnessEvaluationConnector } from '@server/connectors/evaluations/tool-correctness';
import { turnRelevancyEvaluationConnector } from '@server/connectors/evaluations/turn-relevancy';
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

// Mock all individual evaluation connectors
vi.mock('@server/connectors/evaluations/task-completion', () => ({
  taskCompletionEvaluationConnector: {
    getDetails: vi.fn(() => ({
      method: EvaluationMethodName.TASK_COMPLETION,
      name: 'Task Completion',
      description:
        'Evaluates whether the AI agent successfully completes the given task',
    })),
    evaluate: vi.fn(),
    getParameterSchema: {
      safeParse: vi.fn(() => ({ success: true, data: { threshold: 0.7 } })),
    },
  },
}));

vi.mock('@server/connectors/evaluations/argument-correctness', () => ({
  argumentCorrectnessEvaluationConnector: {
    getDetails: vi.fn(() => ({
      method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
      name: 'Argument Correctness',
      description:
        'Evaluates the correctness of function arguments passed by the AI agent',
    })),
    evaluate: vi.fn(),
    getParameterSchema: {
      safeParse: vi.fn(() => ({ success: true, data: { threshold: 0.7 } })),
    },
  },
}));

vi.mock('@server/connectors/evaluations/role-adherence', () => ({
  roleAdherenceEvaluationConnector: {
    getDetails: vi.fn(() => ({
      method: EvaluationMethodName.ROLE_ADHERENCE,
      name: 'Role Adherence',
      description:
        'Evaluates how well the AI agent adheres to its assigned role',
    })),
    evaluate: vi.fn(),
    getParameterSchema: {
      safeParse: vi.fn(() => ({ success: true, data: { threshold: 0.7 } })),
    },
  },
}));

vi.mock('@server/connectors/evaluations/turn-relevancy', () => ({
  turnRelevancyEvaluationConnector: {
    getDetails: vi.fn(() => ({
      method: EvaluationMethodName.TURN_RELEVANCY,
      name: 'Turn Relevancy',
      description: 'Evaluates the relevancy of the AI agent responses',
    })),
    evaluate: vi.fn(),
    getParameterSchema: {
      safeParse: vi.fn(() => ({ success: true, data: { threshold: 0.7 } })),
    },
  },
}));

vi.mock('@server/connectors/evaluations/tool-correctness', () => ({
  toolCorrectnessEvaluationConnector: {
    getDetails: vi.fn(() => ({
      method: EvaluationMethodName.TOOL_CORRECTNESS,
      name: 'Tool Correctness',
      description:
        'Evaluates the correctness of tool function calls and responses',
    })),
    evaluate: vi.fn(),
    getParameterSchema: {
      safeParse: vi.fn(() => ({ success: true, data: { threshold: 0.7 } })),
    },
  },
}));

vi.mock('@server/connectors/evaluations/knowledge-retention', () => ({
  knowledgeRetentionEvaluationConnector: {
    getDetails: vi.fn(() => ({
      method: EvaluationMethodName.KNOWLEDGE_RETENTION,
      name: 'Knowledge Retention',
      description:
        'Evaluates how well the AI agent retains and recalls information across conversations',
    })),
    evaluate: vi.fn(),
    getParameterSchema: {
      safeParse: vi.fn(() => ({ success: true, data: { threshold: 0.7 } })),
    },
  },
}));

vi.mock('@server/connectors/evaluations/conversation-completeness', () => ({
  conversationCompletenessEvaluationConnector: {
    getDetails: vi.fn(() => ({
      method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
      name: 'Conversation Completeness',
      description:
        'Evaluates how well an AI assistant completes conversations by satisfying user needs throughout the interaction',
    })),
    evaluate: vi.fn(),
    getParameterSchema: {
      safeParse: vi.fn(() => ({ success: true, data: { threshold: 0.7 } })),
    },
  },
}));

// Mock the main evaluations module to export all connectors
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
    skill_id: 'd4a9623f-1ae7-482a-b8f0-7304e839b4d8',
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
      expect(data).toHaveLength(9);

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
      const mockEvaluate =
        taskCompletionEvaluationConnector.evaluate as ReturnType<typeof vi.fn>;
      mockEvaluate.mockResolvedValue(
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
      const mockEvaluate =
        taskCompletionEvaluationConnector.evaluate as ReturnType<typeof vi.fn>;
      mockEvaluate.mockRejectedValue(new Error('Evaluation failed'));

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
      const connectors = [
        taskCompletionEvaluationConnector,
        argumentCorrectnessEvaluationConnector,
        roleAdherenceEvaluationConnector,
        turnRelevancyEvaluationConnector,
        toolCorrectnessEvaluationConnector,
      ];

      const evaluationMethods = [
        EvaluationMethodName.TASK_COMPLETION,
        EvaluationMethodName.ARGUMENT_CORRECTNESS,
        EvaluationMethodName.ROLE_ADHERENCE,
        EvaluationMethodName.TURN_RELEVANCY,
        EvaluationMethodName.TOOL_CORRECTNESS,
      ];

      // Mock all connectors to return success
      connectors.forEach((connector) => {
        const mockEvaluate = connector.evaluate as ReturnType<typeof vi.fn>;
        mockEvaluate.mockResolvedValue(
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
        const mockEvaluate = connectors[i].evaluate as ReturnType<typeof vi.fn>;
        expect(mockEvaluate).toHaveBeenCalledWith(
          request,
          mockUserDataStorageConnector,
        );
      }
    });

    it('should preserve evaluation request parameters', async () => {
      const mockEvaluate =
        taskCompletionEvaluationConnector.evaluate as ReturnType<typeof vi.fn>;
      mockEvaluate.mockResolvedValue(
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
      expect(mockEvaluate).toHaveBeenCalledWith(
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
      // Throw a non-Error object to test error handling
      const mockEvaluate =
        taskCompletionEvaluationConnector.evaluate as ReturnType<typeof vi.fn>;
      mockEvaluate.mockRejectedValue('String error');

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
});
