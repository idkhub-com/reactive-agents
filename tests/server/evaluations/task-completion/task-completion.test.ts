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

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Task Completion Evaluator', () => {
  beforeEach(() => {
    mockFetch.mockClear();
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
        { id: 'dataset-123' },
        {
          agent_id: 'agent-123',
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          threshold: 0.5,
          strict_mode: false,
          verbose_mode: true,
          include_reason: true,
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
        { limit: 10, offset: 0 },
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
        { id: 'dataset-123' },
        {
          agent_id: 'agent-123',
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          threshold: 0.5,
          strict_mode: false,
          verbose_mode: true,
          include_reason: true,
        },
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
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
          {} as { id?: string }, // Missing id
          {
            agent_id: 'agent-123',
            model: 'gpt-4o',
          },
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        ),
      ).rejects.toThrow('Dataset ID is required for evaluation');

      // Test missing agent ID
      await expect(
        evaluateTaskCompletion(
          { id: 'dataset-123' },
          {
            model: 'gpt-4o',
          } as { agent_id?: string }, // Missing agent_id
          mockUserDataStorageConnector as unknown as UserDataStorageConnector,
        ),
      ).rejects.toThrow('Agent ID is required for evaluation');
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
        { id: 'dataset-123' },
        {
          agent_id: 'agent-123',
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          threshold: 0.5,
          strict_mode: false,
          verbose_mode: true,
          include_reason: true,
        },
        mockUserDataStorageConnector as unknown as UserDataStorageConnector,
      );

      expect(result.averageResult).toBeDefined();
      expect(result.averageResult.average_score).toBeNaN();
      expect(result.averageResult.total_logs).toBe(0);
      expect(result.averageResult.passed_count).toBe(0);
      expect(result.averageResult.failed_count).toBe(0);
    });
  });
});
