import {
  evaluateOneLogForTaskCompletion,
  evaluateTaskCompletion,
} from '@server/connectors/evaluations/task-completion/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import { HttpMethod } from '@server/types/http';
import {
  type EvaluationRun,
  EvaluationRunStatus,
} from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the constants
vi.mock('@server/constants', () => ({
  OPENAI_API_KEY: 'test-api-key',
  API_URL: 'http://localhost:3000',
  BEARER_TOKEN: 'idk',
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the user data storage connector
const mockUserDataStorageConnector = {
  getEvaluationRuns: vi.fn(),
  createLogOutput: vi.fn(),
  getLogOutputs: vi.fn(),
  updateEvaluationRun: vi.fn(),
  createEvaluationRun: vi.fn(),
  getDatasetLogs: vi.fn(),
} as unknown as UserDataStorageConnector;

const mockedGetEvaluationRuns = vi.mocked(
  mockUserDataStorageConnector.getEvaluationRuns,
);
const mockedCreateLogOutput = vi.mocked(
  mockUserDataStorageConnector.createLogOutput,
);
const mockedGetLogOutputs = vi.mocked(
  mockUserDataStorageConnector.getLogOutputs,
);
const mockedUpdateEvaluationRun = vi.mocked(
  mockUserDataStorageConnector.updateEvaluationRun,
);

describe('Task Completion Evaluator', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('evaluateTaskCompletion', () => {
    it('should evaluate task completion with dataset successfully', async () => {
      // Mock the extraction call (first LLM judge call)
      const mockExtractionResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 1.0,
                  reasoning: 'Structured data extracted successfully',
                  metadata: {
                    task: 'Create a new user with provided details',
                    outcome:
                      'User was created successfully with all required fields',
                  },
                }),
              },
            ],
          },
        ],
      };

      // Mock the evaluation call (second LLM judge call)
      const mockEvaluationResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.9,
                  reasoning:
                    'Task completed successfully with all requirements met',
                  metadata: { task_type: 'api_completion' },
                }),
              },
            ],
          },
        ],
      };

      // Mock both API calls in sequence (extraction -> evaluation)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExtractionResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvaluationResponse),
        });

      // Mock user data storage connector
      const mockUserDataStorageConnector = {
        getDatasetLogs: vi.fn().mockResolvedValue([
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            agent_id: 'agent-123',
            skill_id: 'skill-123',
            method: HttpMethod.POST,
            endpoint: '/api/users',
            function_name: 'createUser',
            status: 200,
            start_time: Date.now(),
            end_time: Date.now() + 1000,
            duration: 1000,
            base_idk_config: {},
            ai_provider: 'openai',
            model: 'gpt-4',
            ai_provider_request_log: {
              provider: 'openai',
              request_url: '/api/users',
              method: HttpMethod.POST,
              request_body: { name: 'John', email: 'john@example.com' },
              response_body: {
                id: 'user_123',
                name: 'John',
                email: 'john@example.com',
              },
              cache_status: 'MISS',
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
          },
        ]),
        createEvaluationRun: vi.fn().mockResolvedValue({
          id: 'eval-run-123',
          dataset_id: 'dataset-123',
          agent_id: 'agent-123',
          evaluation_method: 'task-completion',
          name: 'Test Evaluation',
          description: 'Test description',
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
        updateEvaluationRun: vi.fn().mockResolvedValue({}),
        createLogOutput: vi.fn().mockResolvedValue({}),
        getEvaluationRuns: vi.fn().mockResolvedValue([]),
      };

      const result = await evaluateTaskCompletion(
        'agent-123', // agentId
        'skill-1', // skillId
        'dataset-123', // datasetId
        {
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          threshold: 0.5,
          strict_mode: false,
          verbose_mode: true,
          include_reason: true,
          async_mode: false,
          batch_size: 5,
        },
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        {
          name: 'Test Task Completion Evaluation',
          description: 'Testing task completion evaluation',
        },
      );

      expect(result.averageResult).toBeDefined();
      expect(result.evaluationRun).toBeDefined();
      expect(result.evaluationRun.id).toBe('eval-run-123');

      // Verify that logs were fetched
      expect(mockUserDataStorageConnector.getDatasetLogs).toHaveBeenCalledWith(
        'dataset-123',
        {},
      );

      // Verify that evaluation run was created
      expect(
        mockUserDataStorageConnector.createEvaluationRun,
      ).toHaveBeenCalled();

      // Verify that LLM judge was called (extraction and evaluation)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle evaluation errors gracefully', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockUserDataStorageConnector = {
        getDatasetLogs: vi.fn().mockResolvedValue([
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            agent_id: 'agent-123',
            skill_id: 'skill-123',
            method: HttpMethod.POST,
            endpoint: '/api/test',
            function_name: 'testFunction',
            status: 200,
            start_time: Date.now(),
            end_time: Date.now() + 1000,
            duration: 1000,
            base_idk_config: {},
            ai_provider: 'openai',
            model: 'gpt-4',
            ai_provider_request_log: {
              provider: 'openai',
              request_url: '/api/test',
              method: HttpMethod.POST,
              request_body: { test: 'data' },
              response_body: { result: 'test result' },
              cache_status: 'MISS',
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
          },
        ]),
        createEvaluationRun: vi.fn().mockResolvedValue({
          id: 'eval-run-123',
          dataset_id: 'dataset-123',
          agent_id: 'agent-123',
          evaluation_method: 'task-completion',
          name: 'Test Evaluation',
          description: 'Test description',
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
        updateEvaluationRun: vi.fn().mockResolvedValue({}),
        createLogOutput: vi.fn().mockResolvedValue({}),
        getEvaluationRuns: vi.fn().mockResolvedValue([]),
      };

      const result = await evaluateTaskCompletion(
        'agent-123', // agentId
        'skill-1', // skillId
        'dataset-123', // datasetId
        {
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          threshold: 0.5,
          strict_mode: false,
          verbose_mode: true,
          include_reason: true,
          async_mode: false,
          batch_size: 5,
        },
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        {
          name: 'Test Error Handling Evaluation',
          description: 'Testing error handling',
        },
      );

      expect(result.averageResult).toBeDefined();
      expect(result.evaluationRun).toBeDefined();

      // Verify that log outputs were created even with errors
      expect(mockUserDataStorageConnector.createLogOutput).toHaveBeenCalled();
    });

    it('should validate required parameters', async () => {
      const mockUserDataStorageConnector = {
        getDatasetLogs: vi.fn(),
        createEvaluationRun: vi.fn(),
        updateEvaluationRun: vi.fn(),
        createLogOutput: vi.fn(),
        getEvaluationRuns: vi.fn(),
      };

      // Test missing dataset ID
      await expect(
        evaluateTaskCompletion(
          'agent-123', // agentId
          'skill-1', // skillId
          '', // empty datasetId
          {
            model: 'gpt-4o',
            include_reason: true,
            strict_mode: false,
            async_mode: false,
            verbose_mode: true,
            temperature: 0.1,
            max_tokens: 1000,
            batch_size: 5,
            threshold: 0.5,
          },
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
          {
            name: 'Test Validation',
            description: 'Testing validation',
          },
        ),
      ).rejects.toThrow();

      // Test missing agent ID
      await expect(
        evaluateTaskCompletion(
          '', // empty agentId
          'skill-1', // skillId
          'dataset-123', // datasetId
          {
            model: 'gpt-4o',
            include_reason: true,
            strict_mode: false,
            async_mode: false,
            verbose_mode: true,
            temperature: 0.1,
            max_tokens: 1000,
            batch_size: 5,
            threshold: 0.5,
          },
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
          {
            name: 'Test Validation',
            description: 'Testing validation',
          },
        ),
      ).rejects.toThrow();
    });

    it('should handle empty dataset gracefully', async () => {
      const mockUserDataStorageConnector = {
        getDatasetLogs: vi.fn().mockResolvedValue([]), // Empty dataset
        createEvaluationRun: vi.fn().mockResolvedValue({
          id: 'eval-run-123',
          dataset_id: 'dataset-123',
          agent_id: 'agent-123',
          evaluation_method: 'task-completion',
          name: 'Test Evaluation',
          description: 'Test description',
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }),
        updateEvaluationRun: vi.fn().mockResolvedValue({}),
        createLogOutput: vi.fn().mockResolvedValue({}),
        getEvaluationRuns: vi.fn().mockResolvedValue([]),
      };

      const result = await evaluateTaskCompletion(
        'agent-123', // agentId
        'skill-1', // skillId
        'dataset-123', // datasetId
        {
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          threshold: 0.5,
          strict_mode: false,
          verbose_mode: true,
          include_reason: true,
          async_mode: false,
          batch_size: 5,
        },
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        {
          name: 'Test Empty Dataset Evaluation',
          description: 'Testing empty dataset handling',
        },
      );

      expect(result.averageResult).toBeDefined();
      expect(result.averageResult.average_score).toBeNaN();
      expect(result.averageResult.total_logs).toBe(0);
      expect(result.averageResult.passed_count).toBe(0);
      expect(result.averageResult.failed_count).toBe(0);
    });
  });

  describe('evaluateOneLogForTaskCompletion', () => {
    it('should evaluate a single log and update evaluation run statistics', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        ai_provider_request_log: {
          request_body: {
            messages: [
              {
                role: 'user',
                content:
                  'Create a new user account for john@example.com with admin privileges',
              },
            ],
          },
          response_body: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content:
                    'I have successfully created a new user account for john@example.com with admin privileges. The user ID is 12345.',
                },
              },
            ],
          },
        },
        metadata: {
          task: 'Create user account',
          expected_outcome: 'User account created successfully',
        },
      } as unknown as IdkRequestLog;

      // Mock extraction LLM response (first call)
      const mockExtractionResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 1.0,
                  reasoning: 'Task and outcome extracted successfully',
                  metadata: {
                    task: 'Create user account for john@example.com with admin privileges',
                    outcome: 'User account created successfully with ID 12345',
                  },
                }),
              },
            ],
          },
        ],
      };

      // Mock evaluation LLM response (second call)
      const mockEvaluationResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.9,
                  reasoning:
                    'Task completed successfully with all requirements met',
                }),
              },
            ],
          },
        ],
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockExtractionResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockEvaluationResponse),
        });

      // Mock evaluation run retrieval
      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          results: {
            total_logs: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.85,
            threshold_used: 0.7,
            evaluation_outputs: ['existing-output-id'],
          },
          metadata: {
            parameters: {
              threshold: 0.7,
              model: 'gpt-4o',
              temperature: 0.1,
              max_tokens: 1000,
            },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      // Mock log output creation
      mockedCreateLogOutput.mockResolvedValue({
        id: 'new-output-id',
        log_id: 'test-log-id',
        output: {
          score: 0.9,
          reasoning: 'Task completed successfully',
          passed: true,
          threshold: 0.7,
        },
        score: 0.9,
        metadata: {},
        created_at: new Date().toISOString(),
      });

      // Mock existing log outputs retrieval
      mockedGetLogOutputs.mockResolvedValue([
        {
          id: 'existing-output-id',
          log_id: 'existing-log-id',
          output: {},
          score: 0.85,
          metadata: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.9,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ]);

      // Mock evaluation run update
      mockedUpdateEvaluationRun.mockResolvedValue(
        {} as unknown as EvaluationRun,
      );

      await evaluateOneLogForTaskCompletion(
        evaluationRunId,
        mockLog,
        mockUserDataStorageConnector,
      );

      // Verify evaluation run was retrieved
      expect(mockedGetEvaluationRuns).toHaveBeenCalledWith({
        id: evaluationRunId,
      });

      // Verify log outputs were retrieved for recalculation
      expect(mockedGetLogOutputs).toHaveBeenCalledWith(evaluationRunId, {});

      // Verify evaluation run was updated with new statistics
      expect(mockedUpdateEvaluationRun).toHaveBeenCalledWith(
        evaluationRunId,
        expect.objectContaining({
          results: expect.objectContaining({
            total_logs: 2,
            passed_count: 2,
            failed_count: 0,
            average_score: 0.875, // (0.85 + 0.9) / 2
            threshold_used: 0.7,
          }),
          metadata: expect.objectContaining({
            total_logs: 2,
            passed_count: 2,
            failed_count: 0,
            average_score: 0.875,
            threshold_used: 0.7,
          }),
        }),
      );
    });

    it('should handle threshold checking correctly', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        ai_provider_request_log: {
          request_body: {
            messages: [{ role: 'user', content: 'Complete this task' }],
          },
          response_body: {
            choices: [{ message: { content: 'Task partially completed' } }],
          },
        },
      } as unknown as IdkRequestLog;

      // Mock extraction and evaluation responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              output: [
                {
                  type: 'message',
                  content: [
                    {
                      type: 'output_text',
                      text: JSON.stringify({
                        score: 1.0,
                        reasoning: 'Task extracted successfully',
                        metadata: {
                          task: 'Complete task',
                          outcome: 'Partially done',
                        },
                      }),
                    },
                  ],
                },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              output: [
                {
                  type: 'message',
                  content: [
                    {
                      type: 'output_text',
                      text: JSON.stringify({
                        score: 0.4, // Below threshold
                        reasoning: 'Task only partially completed',
                      }),
                    },
                  ],
                },
              ],
            }),
        });

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.TASK_COMPLETION,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          results: {},
          metadata: {
            parameters: {
              threshold: 0.6, // Higher threshold
              model: 'gpt-4o',
            },
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      mockedCreateLogOutput.mockResolvedValue({
        id: 'new-output-id',
        log_id: 'test-log-id',
        output: {},
        score: 0.4,
        metadata: {},
        created_at: new Date().toISOString(),
      });

      mockedGetLogOutputs.mockResolvedValue([
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.4,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ]);

      mockedUpdateEvaluationRun.mockResolvedValue(
        {} as unknown as EvaluationRun,
      );

      await evaluateOneLogForTaskCompletion(
        evaluationRunId,
        mockLog,
        mockUserDataStorageConnector,
      );

      // Verify that the log failed the threshold check
      expect(mockedUpdateEvaluationRun).toHaveBeenCalledWith(
        evaluationRunId,
        expect.objectContaining({
          results: expect.objectContaining({
            total_logs: 1,
            passed_count: 0, // Score 0.4 < threshold 0.6
            failed_count: 1,
            average_score: 0.4,
            threshold_used: 0.6,
          }),
        }),
      );
    });

    it('should handle evaluation run not found error', async () => {
      const evaluationRunId = 'non-existent-run-id';
      const mockLog = {
        id: 'test-log-id',
      } as unknown as IdkRequestLog;

      mockedGetEvaluationRuns.mockResolvedValue([]);

      await expect(
        evaluateOneLogForTaskCompletion(
          evaluationRunId,
          mockLog,
          mockUserDataStorageConnector,
        ),
      ).rejects.toThrow(`Evaluation run ${evaluationRunId} not found`);
    });
  });
});
