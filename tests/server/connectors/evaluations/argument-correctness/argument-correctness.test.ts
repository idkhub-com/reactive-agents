import { evaluateArgumentCorrectness } from '@server/connectors/evaluations/argument-correctness/service/evaluate';

import type { UserDataStorageConnector } from '@server/types/connector';
import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
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
  getLogs: vi.fn(),
  getDatasetLogs: vi.fn(),
  createEvaluationRun: vi.fn(),
  createLogOutput: vi.fn(),
  updateEvaluationRun: vi.fn(),
  getEvaluationRuns: vi.fn(),
  getLogOutputs: vi.fn(),
  getAgents: vi.fn(),
} as unknown as UserDataStorageConnector;

const mockedGetDatasetLogs = vi.mocked(
  mockUserDataStorageConnector.getDatasetLogs,
);
const mockedCreateEvaluationRun = vi.mocked(
  mockUserDataStorageConnector.createEvaluationRun,
);
const mockedCreateLogOutput = vi.mocked(
  mockUserDataStorageConnector.createLogOutput,
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
    it('should evaluate argument correctness with Log successfully', async () => {
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
        id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
        dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
        agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
        skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.RUNNING,
        results: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockedGetDatasetLogs.mockResolvedValue([
        {
          id: 'log-1',
          agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
          skill_id: 'skill-123',
          method: HttpMethod.POST,
          endpoint: '/api/test',
          function_name: FunctionName.CHAT_COMPLETE,
          status: 200,
          start_time: Date.now(),
          end_time: Date.now() + 1000,
          duration: 1000,
          base_idk_config: {},
          ai_provider: AIProvider.OPENAI,
          model: 'gpt-4',
          ai_provider_request_log: {
            provider: AIProvider.OPENAI,
            function_name: FunctionName.CHAT_COMPLETE,
            request_url: '/api/test',
            method: HttpMethod.POST,
            status: 200,
            request_body: { input: 'Find user by email' },
            response_body: { result: 'User found: alice@example.com' },
            raw_request_body: JSON.stringify({ input: 'Find user by email' }),
            raw_response_body: JSON.stringify({
              result: 'User found: alice@example.com',
            }),
            cache_mode: CacheMode.SIMPLE,
            cache_status: CacheStatus.MISS,
          },
          hook_logs: [],
          metadata: {
            tools: JSON.stringify([
              {
                name: 'database_query',
                purpose: 'Execute SQL query to find user',
                success: true,
              },
            ]),
          },
          cache_status: CacheStatus.MISS,
          trace_id: null,
          parent_span_id: null,
          span_id: null,
          span_name: null,
          app_id: null,
          external_user_id: null,
          external_user_human_name: null,
          user_metadata: null,
          embedding: null,
        },
      ]);

      mockedCreateLogOutput.mockResolvedValue({
        id: 'test-output-id',
        log_id: 'log-1',
        output: {},
        score: 0.9,
        metadata: {},
        created_at: new Date().toISOString(),
        evaluation_run_id: '',
      });

      mockedUpdateEvaluationRun.mockResolvedValue({
        id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
        dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
        agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
        skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.COMPLETED,
        results: {
          total_logs: 1,
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
          id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
          dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
          agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
          skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
          evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_logs: 1,
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
        'e1f2a3b4-c5d6-4890-9234-56789abcdef0', // agentId
        '97e27a2c-1856-443c-87c8-cb734eb12700', // skillId
        'd0e1f2a3-b4c5-4789-9123-456789abcdef', // datasetId
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
        },
        mockUserDataStorageConnector,
        {
          name: 'Test Argument Correctness Evaluation',
          description: 'Test evaluation description',
        },
      );

      expect(result.averageResult.average_score).toBe(0.9);
      expect(result.averageResult.total_logs).toBe(1);
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
        id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
        dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
        agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
        skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.RUNNING,
        results: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockedGetDatasetLogs.mockResolvedValue([
        {
          id: 'log-1',
          agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
          skill_id: 'skill-123',
          method: HttpMethod.POST,
          endpoint: '/api/test',
          function_name: FunctionName.CHAT_COMPLETE,
          status: 200,
          start_time: Date.now(),
          end_time: Date.now() + 1000,
          duration: 1000,
          base_idk_config: {},
          ai_provider: AIProvider.OPENAI,
          model: 'gpt-4',
          ai_provider_request_log: {
            provider: AIProvider.OPENAI,
            function_name: FunctionName.CHAT_COMPLETE,
            request_url: '/api/test',
            method: HttpMethod.POST,
            status: 200,
            request_body: { input: 'Find user and send email' },
            response_body: { result: 'User found and email sent' },
            raw_request_body: JSON.stringify({
              input: 'Find user and send email',
            }),
            raw_response_body: JSON.stringify({
              result: 'User found and email sent',
            }),
            cache_mode: CacheMode.SIMPLE,
            cache_status: CacheStatus.MISS,
          },
          hook_logs: [],
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
          },
          cache_status: CacheStatus.MISS,
          trace_id: null,
          parent_span_id: null,
          span_id: null,
          span_name: null,
          app_id: null,
          external_user_id: null,
          external_user_human_name: null,
          user_metadata: null,
          embedding: null,
        },
      ]);

      mockedCreateLogOutput.mockResolvedValue({
        id: 'test-output-id',
        log_id: 'log-1',
        output: {},
        score: 0.8,
        metadata: {},
        created_at: new Date().toISOString(),
        evaluation_run_id: '',
      });

      mockedUpdateEvaluationRun.mockResolvedValue({
        id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
        dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
        agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
        skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.COMPLETED,
        results: {
          total_logs: 1,
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
          id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
          dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
          agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
          skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
          evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_logs: 1,
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
        'e1f2a3b4-c5d6-4890-9234-56789abcdef0', // agentId
        '97e27a2c-1856-443c-87c8-cb734eb12700', // skillId
        'd0e1f2a3-b4c5-4789-9123-456789abcdef', // datasetId
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
        },
        mockUserDataStorageConnector,
        {
          name: 'Test Multiple Tools Evaluation',
          description: 'Test evaluation with multiple tools',
        },
      );

      expect(result.averageResult.average_score).toBe(0.8);
      expect(result.averageResult.total_logs).toBe(1);
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
        id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
        dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
        agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
        skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.RUNNING,
        results: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockedGetDatasetLogs.mockResolvedValue([
        {
          id: 'log-1',
          agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
          skill_id: 'skill-123',
          method: HttpMethod.POST,
          endpoint: '/api/test',
          function_name: FunctionName.CHAT_COMPLETE,
          status: 200,
          start_time: Date.now(),
          end_time: Date.now() + 1000,
          duration: 1000,
          base_idk_config: {},
          ai_provider: AIProvider.OPENAI,
          model: 'gpt-4',
          ai_provider_request_log: {
            provider: AIProvider.OPENAI,
            function_name: FunctionName.CHAT_COMPLETE,
            request_url: '/api/test',
            method: HttpMethod.POST,
            status: 200,
            request_body: { input: 'Find user by email' },
            response_body: { result: 'User found' },
            raw_request_body: JSON.stringify({ input: 'Find user by email' }),
            raw_response_body: JSON.stringify({ result: 'User found' }),
            cache_mode: CacheMode.SIMPLE,
            cache_status: CacheStatus.MISS,
          },
          hook_logs: [],
          metadata: {
            tools: JSON.stringify([
              {
                name: 'database_query',
                purpose: 'Execute SQL query',
                success: true,
              },
            ]),
          },
          cache_status: CacheStatus.MISS,
          trace_id: null,
          parent_span_id: null,
          span_id: null,
          span_name: null,
          app_id: null,
          external_user_id: null,
          external_user_human_name: null,
          user_metadata: null,
          embedding: null,
        },
      ]);

      mockedCreateLogOutput.mockResolvedValue({
        id: 'test-output-id',
        log_id: 'log-1',
        output: {},
        score: 0.9,
        metadata: {},
        created_at: new Date().toISOString(),
        evaluation_run_id: '',
      });

      mockedUpdateEvaluationRun.mockResolvedValue({
        id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
        dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
        agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
        skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.COMPLETED,
        results: {
          total_logs: 1,
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
          id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
          dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
          agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
          skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
          evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_logs: 1,
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
        'e1f2a3b4-c5d6-4890-9234-56789abcdef0', // agentId
        '97e27a2c-1856-443c-87c8-cb734eb12700', // skillId
        'd0e1f2a3-b4c5-4789-9123-456789abcdef', // datasetId
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
        },
        mockUserDataStorageConnector,
        {
          name: 'Test Strict Mode Evaluation',
          description: 'Test evaluation with strict mode enabled',
        },
      );

      expect(result.averageResult.threshold_used).toBe(1.0); // Should be 1.0 in strict mode
      expect(result.averageResult.average_score).toBe(0.9);
    });

    it('should handle argument correctness evaluation errors gracefully', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Network error',
          json: async () => ({}),
        } as Response);
      });

      // Mock storage connector calls
      mockedCreateEvaluationRun.mockResolvedValue({
        id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
        dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
        agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
        skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.RUNNING,
        results: {},
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockedGetDatasetLogs.mockResolvedValue([
        {
          id: 'log-1',
          agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
          skill_id: 'skill-123',
          method: HttpMethod.POST,
          endpoint: '/api/test',
          function_name: FunctionName.CHAT_COMPLETE,
          status: 200,
          start_time: Date.now(),
          end_time: Date.now() + 1000,
          duration: 1000,
          base_idk_config: {},
          ai_provider: AIProvider.OPENAI,
          model: 'gpt-4',
          ai_provider_request_log: {
            provider: AIProvider.OPENAI,
            function_name: FunctionName.CHAT_COMPLETE,
            request_url: '/api/test',
            method: HttpMethod.POST,
            status: 200,
            request_body: { input: 'Find user by email' },
            response_body: { result: 'User found' },
            raw_request_body: JSON.stringify({ input: 'Find user by email' }),
            raw_response_body: JSON.stringify({ result: 'User found' }),
            cache_mode: CacheMode.SIMPLE,
            cache_status: CacheStatus.MISS,
          },
          hook_logs: [],
          metadata: {
            tools: JSON.stringify([
              {
                name: 'database_query',
                purpose: 'Execute SQL query',
                success: true,
              },
            ]),
          },
          cache_status: CacheStatus.MISS,
          trace_id: null,
          parent_span_id: null,
          span_id: null,
          span_name: null,
          app_id: null,
          external_user_id: null,
          external_user_human_name: null,
          user_metadata: null,
          embedding: null,
        },
      ]);

      mockedCreateLogOutput.mockResolvedValue({
        id: 'test-output-id',
        log_id: 'log-1',
        output: {},
        score: 0.5, // Fallback score
        metadata: {
          fallback: true,
          errorType: 'api_error',
          errorDetails: 'Network error',
        },
        created_at: new Date().toISOString(),
        evaluation_run_id: '',
      });

      mockedUpdateEvaluationRun.mockResolvedValue({
        id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
        dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
        agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
        skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
        evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Test Evaluation Run',
        description: 'Test description',
        status: EvaluationRunStatus.COMPLETED,
        results: {
          total_logs: 1,
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
          id: 'f2a3b4c5-d6e7-4901-9345-6789abcdef01',
          dataset_id: 'd0e1f2a3-b4c5-4789-9123-456789abcdef',
          agent_id: 'e1f2a3b4-c5d6-4890-9234-56789abcdef0',
          skill_id: '97e27a2c-1856-443c-87c8-cb734eb12700',
          evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_logs: 1,
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
        'e1f2a3b4-c5d6-4890-9234-56789abcdef0', // agentId
        '97e27a2c-1856-443c-87c8-cb734eb12700', // skillId
        'd0e1f2a3-b4c5-4789-9123-456789abcdef', // datasetId
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
        },
        mockUserDataStorageConnector,
        {
          name: 'Test Error Handling Evaluation',
          description: 'Test evaluation error handling',
        },
      );

      expect(result.averageResult.average_score).toBe(0.5); // Fallback score
      expect(result.averageResult.total_logs).toBe(1);
    }, 10000);
  });
});
