import { evaluateArgumentCorrectness } from '@server/connectors/evaluations/argument-correctness/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import { HttpMethod } from '@server/types/http';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
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
  getDataPoints: vi.fn(),
  createEvaluationRun: vi.fn(),
  createDataPointOutput: vi.fn(),
  updateEvaluationRun: vi.fn(),
  getEvaluationRuns: vi.fn(),
  getAgents: vi.fn(),
} as unknown as UserDataStorageConnector;

// Type the mock functions properly
const mockedGetDataPoints = vi.mocked(
  mockUserDataStorageConnector.getDataPoints,
);
const mockedCreateEvaluationRun = vi.mocked(
  mockUserDataStorageConnector.createEvaluationRun,
);
const mockedCreateDataPointOutput = vi.mocked(
  mockUserDataStorageConnector.createDataPointOutput,
);
const mockedUpdateEvaluationRun = vi.mocked(
  mockUserDataStorageConnector.updateEvaluationRun,
);
const mockedGetEvaluationRuns = vi.mocked(
  mockUserDataStorageConnector.getEvaluationRuns,
);

describe('Argument Correctness Evaluator', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  describe('evaluateArgumentCorrectness', () => {
    it('should evaluate argument correctness with DataPoint successfully', async () => {
      // Mock the LLM judge call
      const mockLLMResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.9,
                  reasoning:
                    'Tool arguments are correct and appropriate for the task',
                  perTool: [
                    {
                      tool: 'database_query',
                      correct: true,
                      reasoning: 'SQL query is properly formatted and safe',
                    },
                  ],
                }),
              },
            ],
          },
        ],
      };

      // Mock the API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLLMResponse),
      });

      // Mock the storage connector calls
      mockedCreateEvaluationRun.mockResolvedValue({
        id: 'test-run-id',
        dataset_id: 'test-dataset-id',
        agent_id: 'test-agent-id',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.RUNNING,
        results: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockedGetDataPoints.mockResolvedValue([
        {
          id: 'dp-1',
          method: HttpMethod.POST,
          endpoint: '/api/test',
          function_name: 'test_function',
          request_body: { input: 'Find user by email' },
          ground_truth: { result: 'User found: alice@example.com' },
          is_golden: false,
          metadata: {
            tools: JSON.stringify([
              {
                name: 'database_query',
                purpose: 'Execute SQL query to find user',
                success: true,
              },
            ]),
            agent_id: 'test-agent-id',
          },
          created_at: '2025-01-01T00:00:00Z',
        },
      ]);

      mockedCreateDataPointOutput.mockResolvedValue({
        id: 'test-output-id',
        data_point_id: 'dp-1',
        output: {},
        score: 0.9,
        metadata: {},
        created_at: new Date().toISOString(),
      });

      mockedUpdateEvaluationRun.mockResolvedValue({
        id: 'test-run-id',
        dataset_id: 'test-dataset-id',
        agent_id: 'test-agent-id',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.COMPLETED,
        results: {
          total_data_points: 1,
          passed_count: 1,
          failed_count: 0,
          average_score: 0.9,
          threshold_used: 0.5,
          evaluation_outputs: ['test-output-id'],
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: 'test-run-id',
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.9,
            threshold_used: 0.5,
            evaluation_outputs: ['test-output-id'],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ]);

      const result = await evaluateArgumentCorrectness(
        { id: 'test-dataset-id', limit: 5 },
        {
          threshold: 0.5,
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          include_reason: true,
          strict_mode: false,
          async_mode: false,
          verbose_mode: true,
          batch_size: 5,
          agent_id: 'test-agent-id',
        },
        mockUserDataStorageConnector,
      );

      expect(result.averageResult.average_score).toBe(0.9);
      expect(result.averageResult.total_data_points).toBe(1);
      expect(result.averageResult.passed_count).toBe(1);
      expect(result.averageResult.failed_count).toBe(0);
      expect(result.averageResult.threshold_used).toBe(0.5);

      // Verify that the LLM judge was called with the correct prompt
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/v1/responses',
        expect.objectContaining({
          body: expect.stringContaining('expert evaluator for agentic systems'),
        }),
      );
    });

    it('should evaluate argument correctness with multiple tools successfully', async () => {
      // Mock the LLM judge call
      const mockLLMResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.8,
                  reasoning: 'Most tool arguments are correct',
                  perTool: [
                    {
                      tool: 'database_query',
                      correct: true,
                      reasoning: 'SQL query is correct',
                    },
                    {
                      tool: 'email_sender',
                      correct: false,
                      reasoning: 'Email template has incorrect variables',
                    },
                  ],
                }),
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLLMResponse),
      });

      // Mock storage connector calls
      mockedCreateEvaluationRun.mockResolvedValue({
        id: 'test-run-id',
        dataset_id: 'test-dataset-id',
        agent_id: 'test-agent-id',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.RUNNING,
        results: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockedGetDataPoints.mockResolvedValue([
        {
          id: 'dp-1',
          request_body: { input: 'Find user and send email' },
          metadata: {
            tools: JSON.stringify([
              {
                name: 'database_query',
                purpose: 'Execute SQL query to find user',
                success: true,
              },
              {
                name: 'email_sender',
                purpose: 'Send email to user',
                success: false,
              },
            ]),
            agent_id: 'test-agent-id',
          },
          created_at: '2025-01-01T00:00:00Z',
          method: HttpMethod.POST,
          endpoint: '/api/test',
          function_name: 'test_function',
          is_golden: false,
        },
      ]);

      mockedCreateDataPointOutput.mockResolvedValue({
        id: 'test-output-id',
        data_point_id: 'dp-1',
        output: {},
        score: 0.8,
        metadata: {},
        created_at: new Date().toISOString(),
      });

      mockedUpdateEvaluationRun.mockResolvedValue({
        id: 'test-run-id',
        dataset_id: 'test-dataset-id',
        agent_id: 'test-agent-id',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.COMPLETED,
        results: {
          total_data_points: 1,
          passed_count: 1,
          failed_count: 0,
          average_score: 0.8,
          threshold_used: 0.5,
          evaluation_outputs: ['test-output-id'],
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: 'test-run-id',
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.8,
            threshold_used: 0.5,
            evaluation_outputs: ['test-output-id'],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ]);

      const result = await evaluateArgumentCorrectness(
        { id: 'test-dataset-id', limit: 5 },
        {
          threshold: 0.5,
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          include_reason: true,
          strict_mode: false,
          async_mode: false,
          verbose_mode: true,
          batch_size: 5,
          agent_id: 'test-agent-id',
        },
        mockUserDataStorageConnector,
      );

      expect(result.averageResult.average_score).toBe(0.8);
      expect(result.averageResult.total_data_points).toBe(1);
      expect(result.averageResult.passed_count).toBe(1);
      expect(result.averageResult.failed_count).toBe(0);
    });

    it('should handle strict mode correctly', async () => {
      // Mock the LLM judge call
      const mockLLMResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.9,
                  reasoning: 'Tool arguments are correct',
                  perTool: [
                    {
                      tool: 'database_query',
                      correct: true,
                      reasoning: 'SQL query is correct',
                    },
                  ],
                }),
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLLMResponse),
      });

      // Mock storage connector calls
      mockedCreateEvaluationRun.mockResolvedValue({
        id: 'test-run-id',
        dataset_id: 'test-dataset-id',
        agent_id: 'test-agent-id',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.RUNNING,
        results: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockedGetDataPoints.mockResolvedValue([
        {
          id: 'dp-1',
          method: HttpMethod.POST,
          endpoint: '/api/test',
          function_name: 'test_function',
          request_body: { input: 'Find user by email' },
          ground_truth: { result: 'User found' },
          is_golden: false,
          metadata: {
            tools: JSON.stringify([
              {
                name: 'database_query',
                purpose: 'Execute SQL query',
                success: true,
              },
            ]),
            agent_id: 'test-agent-id',
          },
          created_at: '2025-01-01T00:00:00Z',
        },
      ]);

      mockedCreateDataPointOutput.mockResolvedValue({
        id: 'test-output-id',
        data_point_id: 'dp-1',
        output: {},
        score: 0.9,
        metadata: {},
        created_at: new Date().toISOString(),
      });

      mockedUpdateEvaluationRun.mockResolvedValue({
        id: 'test-run-id',
        dataset_id: 'test-dataset-id',
        agent_id: 'test-agent-id',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.COMPLETED,
        results: {
          total_data_points: 1,
          passed_count: 1,
          failed_count: 0,
          average_score: 0.9,
          threshold_used: 1.0, // Should be 1.0 in strict mode
          evaluation_outputs: ['test-output-id'],
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: 'test-run-id',
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.9,
            threshold_used: 1.0,
            evaluation_outputs: ['test-output-id'],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ]);

      const result = await evaluateArgumentCorrectness(
        { id: 'test-dataset-id', limit: 5 },
        {
          threshold: 0.5,
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          include_reason: true,
          strict_mode: true, // Enable strict mode
          async_mode: false,
          verbose_mode: true,
          batch_size: 5,
          agent_id: 'test-agent-id',
        },
        mockUserDataStorageConnector,
      );

      expect(result.averageResult.threshold_used).toBe(1.0); // Should be 1.0 in strict mode
      expect(result.averageResult.average_score).toBe(0.9);
    });

    it('should handle argument correctness evaluation errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Mock storage connector calls
      mockedCreateEvaluationRun.mockResolvedValue({
        id: 'test-run-id',
        dataset_id: 'test-dataset-id',
        agent_id: 'test-agent-id',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.RUNNING,
        results: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockedGetDataPoints.mockResolvedValue([
        {
          id: 'dp-1',
          method: HttpMethod.POST,
          endpoint: '/api/test',
          function_name: 'test_function',
          request_body: { input: 'Find user by email' },
          ground_truth: { result: 'User found' },
          is_golden: false,
          metadata: {
            tools: JSON.stringify([
              {
                name: 'database_query',
                purpose: 'Execute SQL query',
                success: true,
              },
            ]),
            agent_id: 'test-agent-id',
          },
          created_at: '2025-01-01T00:00:00Z',
        },
      ]);

      mockedCreateDataPointOutput.mockResolvedValue({
        id: 'test-output-id',
        data_point_id: 'dp-1',
        output: {},
        score: 0.5, // Fallback score
        metadata: {
          fallback: true,
          errorType: 'api_error',
          errorDetails: 'Network error',
        },
        created_at: new Date().toISOString(),
      });

      mockedUpdateEvaluationRun.mockResolvedValue({
        id: 'test-run-id',
        dataset_id: 'test-dataset-id',
        agent_id: 'test-agent-id',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.COMPLETED,
        results: {
          total_data_points: 1,
          passed_count: 1,
          failed_count: 0,
          average_score: 0.5,
          threshold_used: 0.5,
          evaluation_outputs: ['test-output-id'],
        },
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: 'test-run-id',
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.5,
            threshold_used: 0.5,
            evaluation_outputs: ['test-output-id'],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
      ]);

      const result = await evaluateArgumentCorrectness(
        { id: 'test-dataset-id', limit: 5 },
        {
          threshold: 0.5,
          model: 'gpt-4o',
          temperature: 0.1,
          max_tokens: 1000,
          include_reason: true,
          strict_mode: false,
          async_mode: false,
          verbose_mode: true,
          batch_size: 5,
          agent_id: 'test-agent-id',
        },
        mockUserDataStorageConnector,
      );

      expect(result.averageResult.average_score).toBe(0.5); // Fallback score
      expect(result.averageResult.total_data_points).toBe(1);
    });
  });
});
