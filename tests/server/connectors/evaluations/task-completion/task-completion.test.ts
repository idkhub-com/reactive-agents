import { evaluateTaskCompletion } from '@server/connectors/evaluations/task-completion/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import { HttpMethod } from '@server/types/http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the constants
vi.mock('@server/constants', () => ({
  OPENAI_API_KEY: 'test-api-key',
  API_URL: 'http://localhost:3000',
  BEARER_TOKEN: 'idk',
}));

// Mock OpenAI SDK
vi.mock('openai', () => {
  const MockOpenAI = vi.fn().mockImplementation(() => ({
    withOptions: vi.fn().mockReturnThis(),
    chat: {
      completions: {
        parse: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                parsed: {
                  task: 'Create a new user with provided details',
                  outcome:
                    'User was created successfully with all required fields',
                },
              },
            },
          ],
        }),
      },
    },
  }));

  return {
    default: MockOpenAI,
    OpenAI: MockOpenAI,
  };
});

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Task Completion Evaluator', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('evaluateTaskCompletion', () => {
    it('should evaluate task completion with dataset successfully', async () => {
      // Mock the verdict generation call (extraction is handled by OpenAI SDK mock)
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

      // Mock verdict generation API call (extraction is handled by OpenAI SDK mock)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockEvaluationResponse)),
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
              request_url: 'http://localhost:3000/v1/chat/completions',
              method: HttpMethod.POST,
              request_body: {
                model: 'gpt-4',
                messages: [
                  {
                    role: 'user',
                    content:
                      'Create a new user with name John and email john@example.com',
                  },
                ],
              },
              response_body: {
                id: 'chatcmpl-123',
                object: 'chat.completion',
                created: 1677652288,
                model: 'gpt-4',
                choices: [
                  {
                    index: 0,
                    finish_reason: 'stop',
                    message: {
                      role: 'assistant',
                      content:
                        'User was created successfully with all required fields',
                    },
                  },
                ],
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
          task: '',
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

      // Verify that LLM judge was called for verdict generation
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle evaluation errors gracefully', async () => {
      // Mock network error
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Network error',
          json: async () => ({}),
        } as Response);
      });

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
              request_url: 'http://localhost:3000/v1/chat/completions',
              method: HttpMethod.POST,
              request_body: {
                model: 'gpt-4',
                messages: [{ role: 'user', content: 'Test request' }],
              },
              response_body: {
                id: 'chatcmpl-456',
                object: 'chat.completion',
                created: 1677652288,
                model: 'gpt-4',
                choices: [
                  {
                    index: 0,
                    finish_reason: 'stop',
                    message: {
                      role: 'assistant',
                      content: 'Test response',
                    },
                  },
                ],
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
          task: '',
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
    }, 10000);

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
            task: '',
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
            task: '',
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
          task: '',
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
});
