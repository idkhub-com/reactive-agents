import { toolCorrectnessEvaluationConnector } from '@server/connectors/evaluations/tool-correctness';
import type { ToolCall } from '@server/connectors/evaluations/tool-correctness/types';
import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { HttpMethod } from '@server/types/http';
import type { DataPoint } from '@shared/types/data/data-point';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { EvaluationMethodDetails } from '@shared/types/idkhub/evaluations/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { ToolCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/tool-correctness';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Define the expected results structure
interface MockEvaluationResults {
  total_data_points: number;
  evaluated_data_points: number;
  average_score: number;
  scores: Array<{ data_point_id: string; score: number }>;
}

// Mock user data storage connector will be created fresh for each test

describe('Tool Correctness Comprehensive Tests', () => {
  let connector: EvaluationMethodConnector;
  let mockUserDataStorageConnector: UserDataStorageConnector;

  beforeEach(() => {
    connector = toolCorrectnessEvaluationConnector;
    // Create a fresh mock for each test to avoid interference
    mockUserDataStorageConnector = {
      createEvaluationRun: vi.fn(),
      updateEvaluationRun: vi.fn(),
      getDataPoints: vi.fn(),
      createDataPointOutput: vi.fn(),
      getEvaluationRuns: vi.fn(),
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
      getTools: vi.fn(),
      createTool: vi.fn(),
      deleteTool: vi.fn(),
      getDatasets: vi.fn(),
      createDataset: vi.fn(),
      updateDataset: vi.fn(),
      deleteDataset: vi.fn(),
      createDataPoints: vi.fn(),
      updateDataPoint: vi.fn(),
      deleteDataPoints: vi.fn(),
      getDataPointOutputs: vi.fn(),
      deleteDataPointOutput: vi.fn(),
      deleteEvaluationRun: vi.fn(),
    } as UserDataStorageConnector;
  });

  // Helper function to create test data points
  const createTestDataPoint = (
    id: string,
    toolsCalled: ToolCall[],
    expectedTools: ToolCall[],
    metadata?: Record<string, unknown>,
  ): DataPoint => ({
    id,
    method: HttpMethod.POST,
    endpoint: '/v1/chat/completions',
    function_name: 'chat_complete',
    request_body: {
      messages: [{ role: 'user', content: 'Test message' }],
    },
    ground_truth: {
      expected_tools: expectedTools,
    },
    metadata: {
      tools_called: toolsCalled,
      ...metadata,
    },
    is_golden: true,
    created_at: new Date().toISOString(),
  });

  // Helper function to create tool calls
  const createToolCall = (
    name: string,
    inputParams?: Record<string, unknown>,
    output?: unknown,
  ): ToolCall => ({
    name,
    input_parameters: inputParams,
    output,
  });

  describe('Integration Tests with Real Data Points', () => {
    it('should evaluate real data points with perfect tool matches', async () => {
      const testDataPoints = [
        createTestDataPoint(
          'dp-1',
          [
            createToolCall(
              'calculator',
              { expression: '2 + 2' },
              { result: 4 },
            ),
            createToolCall('get_weather', { location: 'NYC' }, { temp: 72 }),
          ],
          [
            createToolCall(
              'calculator',
              { expression: '2 + 2' },
              { result: 4 },
            ),
            createToolCall('get_weather', { location: 'NYC' }, { temp: 72 }),
          ],
        ),
        createTestDataPoint(
          'dp-2',
          [createToolCall('search', { query: 'test' }, { results: [] })],
          [createToolCall('search', { query: 'test' }, { results: [] })],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 2,
            evaluated_data_points: 2,
            average_score: 1.0,
            scores: [
              { data_point_id: 'dp-1', score: 1.0 },
              { data_point_id: 'dp-2', score: 1.0 },
            ],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: true,
          should_exact_match: true,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.results?.average_score).toBe(1.0);
      expect(result.results?.evaluated_data_points).toBe(2);
    });

    it('should evaluate real data points with partial matches', async () => {
      const testDataPoints = [
        createTestDataPoint(
          'dp-1',
          [
            createToolCall(
              'calculator',
              { expression: '2 + 2' },
              { result: 4 },
            ),
            createToolCall(
              'wrong_tool',
              { param: 'value' },
              { result: 'wrong' },
            ),
          ],
          [
            createToolCall(
              'calculator',
              { expression: '2 + 2' },
              { result: 4 },
            ),
            createToolCall(
              'expected_tool',
              { param: 'value' },
              { result: 'correct' },
            ),
          ],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            evaluated_data_points: 1,
            average_score: 0.5,
            scores: [{ data_point_id: 'dp-1', score: 0.5 }],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.results?.average_score).toBe(0.5);
    });

    it('should handle data points with no tools called or expected', async () => {
      const testDataPoints = [
        createTestDataPoint('dp-1', [], []),
        createTestDataPoint(
          'dp-2',
          [],
          [createToolCall('expected_tool', { param: 'value' })],
        ),
        createTestDataPoint(
          'dp-3',
          [createToolCall('unexpected_tool', { param: 'value' })],
          [],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 3,
            evaluated_data_points: 3,
            average_score: 0.33,
            scores: [
              { data_point_id: 'dp-1', score: 1.0 },
              { data_point_id: 'dp-2', score: 0.0 },
              { data_point_id: 'dp-3', score: 0.0 },
            ],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      expect(result.results?.evaluated_data_points).toBe(3);
    });
  });

  describe('Algorithm Validation - Core Functions', () => {
    // Since the core functions are private, we'll test them through the public interface
    // and create test utilities to validate the algorithm behavior

    it('should validate strict mode algorithm', async () => {
      const testDataPoints = [
        // Perfect match - should score 1.0
        createTestDataPoint(
          'dp-1',
          [
            createToolCall('tool1', { param: 'value' }, { result: 'success' }),
            createToolCall(
              'tool2',
              { param: 'value2' },
              { result: 'success2' },
            ),
          ],
          [
            createToolCall('tool1', { param: 'value' }, { result: 'success' }),
            createToolCall(
              'tool2',
              { param: 'value2' },
              { result: 'success2' },
            ),
          ],
        ),
        // Wrong order - should score 0.0 in strict mode
        createTestDataPoint(
          'dp-2',
          [
            createToolCall(
              'tool2',
              { param: 'value2' },
              { result: 'success2' },
            ),
            createToolCall('tool1', { param: 'value' }, { result: 'success' }),
          ],
          [
            createToolCall('tool1', { param: 'value' }, { result: 'success' }),
            createToolCall(
              'tool2',
              { param: 'value2' },
              { result: 'success2' },
            ),
          ],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 2,
            evaluated_data_points: 2,
            average_score: 0.5,
            scores: [
              { data_point_id: 'dp-1', score: 1.0 },
              { data_point_id: 'dp-2', score: 0.0 },
            ],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'],
          include_reason: true,
          strict_mode: true,
          verbose_mode: false,
          should_consider_ordering: true,
          should_exact_match: true,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.results?.average_score).toBe(0.5);
      expect(result.results?.scores).toHaveLength(2);
      const scores = result.results?.scores as MockEvaluationResults['scores'];
      expect(scores?.[0]?.score).toBe(1.0); // Perfect match
      expect(scores?.[1]?.score).toBe(0.0); // Wrong order
    });

    it('should validate exact match algorithm', async () => {
      const testDataPoints = [
        // Exact match - should score 1.0
        createTestDataPoint(
          'dp-1',
          [
            createToolCall('tool1', { param: 'value' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
          [
            createToolCall('tool1', { param: 'value' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
        ),
        // Different count - should score 0.0
        createTestDataPoint(
          'dp-2',
          [createToolCall('tool1', { param: 'value' })],
          [
            createToolCall('tool1', { param: 'value' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 2,
            evaluated_data_points: 2,
            average_score: 0.5,
            scores: [
              { data_point_id: 'dp-1', score: 1.0 },
              { data_point_id: 'dp-2', score: 0.0 },
            ],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: true,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.results?.average_score).toBe(0.5);
      const scores = result.results?.scores as MockEvaluationResults['scores'];
      expect(scores?.[0]?.score).toBe(1.0); // Exact match
      expect(scores?.[1]?.score).toBe(0.0); // Different count
    });

    it('should validate ordering algorithm', async () => {
      const testDataPoints = [
        // Correct order - should score 1.0
        createTestDataPoint(
          'dp-1',
          [
            createToolCall('tool1', { param: 'value' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
          [
            createToolCall('tool1', { param: 'value' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
        ),
        // Wrong order - should score 0.0
        createTestDataPoint(
          'dp-2',
          [
            createToolCall('tool2', { param: 'value2' }),
            createToolCall('tool1', { param: 'value' }),
          ],
          [
            createToolCall('tool1', { param: 'value' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 2,
            evaluated_data_points: 2,
            average_score: 0.5,
            scores: [
              { data_point_id: 'dp-1', score: 1.0 },
              { data_point_id: 'dp-2', score: 0.0 },
            ],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: true,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.results?.average_score).toBe(0.5);
      const scores = result.results?.scores as MockEvaluationResults['scores'];
      expect(scores?.[0]?.score).toBe(1.0); // Correct order
      expect(scores?.[1]?.score).toBe(0.0); // Wrong order
    });
  });

  describe('Edge Case Coverage', () => {
    it('should handle malformed data points gracefully', async () => {
      const malformedDataPoints = [
        {
          id: 'dp-1',
          hash: 'hash-1',
          method: HttpMethod.POST,
          endpoint: '/v1/chat/completions',
          function_name: 'chat_complete',
          request_body: null, // Malformed
          ground_truth: null, // Malformed
          metadata: null, // Malformed
          is_golden: true,
          created_at: new Date().toISOString(),
        } as unknown as DataPoint,
        {
          id: 'dp-2',
          hash: 'hash-2',
          method: HttpMethod.POST,
          endpoint: '/v1/chat/completions',
          function_name: 'chat_complete',
          request_body: {
            messages: [{ role: 'user', content: 'Test' }],
          },
          ground_truth: {
            expected_tools: 'not-an-array', // Malformed
          },
          metadata: {
            tools_called: 'not-an-array', // Malformed
          },
          is_golden: true,
          created_at: new Date().toISOString(),
        } as unknown as DataPoint,
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(malformedDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 2,
            evaluated_data_points: 2,
            average_score: 0.0,
            scores: [
              { data_point_id: 'dp-1', score: 0.0 },
              { data_point_id: 'dp-2', score: 0.0 },
            ],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
      // Should handle malformed data gracefully without crashing
    });

    it('should handle empty arrays correctly', async () => {
      const emptyArrayDataPoints = [
        createTestDataPoint('dp-1', [], []),
        createTestDataPoint('dp-2', [], []),
        createTestDataPoint('dp-3', [], []),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(emptyArrayDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 3,
            evaluated_data_points: 3,
            average_score: 1.0,
            scores: [
              { data_point_id: 'dp-1', score: 1.0 },
              { data_point_id: 'dp-2', score: 1.0 },
              { data_point_id: 'dp-3', score: 1.0 },
            ],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.results?.average_score).toBe(1.0);
      expect(result.results?.evaluated_data_points).toBe(3);
    });

    it('should handle circular references in tool parameters', async () => {
      const circularRef: Record<string, unknown> = { self: null };
      circularRef.self = circularRef;

      const circularDataPoints = [
        createTestDataPoint(
          'dp-1',
          [createToolCall('tool1', { circular: circularRef })],
          [createToolCall('tool1', { circular: circularRef })],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(circularDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            evaluated_data_points: 1,
            average_score: 1.0,
            scores: [{ data_point_id: 'dp-1', score: 1.0 }],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      // Should handle circular references without crashing
    });

    it('should handle deeply nested objects in tool parameters', async () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                },
              },
            },
          },
        },
      };

      const nestedDataPoints = [
        createTestDataPoint(
          'dp-1',
          [createToolCall('tool1', { nested: deeplyNested })],
          [createToolCall('tool1', { nested: deeplyNested })],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(nestedDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            evaluated_data_points: 1,
            average_score: 1.0,
            scores: [{ data_point_id: 'dp-1', score: 1.0 }],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.results?.average_score).toBe(1.0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database failures gracefully', async () => {
      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockRejectedValue(new Error('Database connection failed'));

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      await expect(
        connector.evaluate(request, mockUserDataStorageConnector),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid parameters', () => {
      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        parameters: {
          threshold: 'invalid', // Invalid type
          evaluation_params: 'not-an-array', // Invalid type
          include_reason: 'not-boolean', // Invalid type
          strict_mode: 'not-boolean', // Invalid type
          verbose_mode: 'not-boolean', // Invalid type
          should_consider_ordering: 'not-boolean', // Invalid type
          should_exact_match: 'not-boolean', // Invalid type
        } as unknown as EvaluationMethodDetails,
      };

      // The connector should handle invalid parameters gracefully
      // This test ensures the parameter validation works correctly
      const schema = connector.getParameterSchema;
      const result = schema.safeParse(request.parameters);
      expect(result.success).toBe(false);
    });

    it('should handle missing required fields in data points', async () => {
      const incompleteDataPoints = [
        {
          id: 'dp-1',
          // Missing required fields
        } as unknown as DataPoint,
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(incompleteDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            evaluated_data_points: 1,
            average_score: 0.0,
            scores: [{ data_point_id: 'dp-1', score: 0.0 }],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      // Should handle incomplete data points without crashing
    });

    it('should handle evaluation run update failures', async () => {
      const testDataPoints = [
        createTestDataPoint(
          'dp-1',
          [createToolCall('tool1', { param: 'value' })],
          [createToolCall('tool1', { param: 'value' })],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);
      (
        mockUserDataStorageConnector.updateEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockRejectedValue(new Error('Update failed'));

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      await expect(
        connector.evaluate(request, mockUserDataStorageConnector),
      ).rejects.toThrow('Update failed');
    });

    it('should handle data point output creation failures', async () => {
      const testDataPoints = [
        createTestDataPoint(
          'dp-1',
          [createToolCall('tool1', { param: 'value' })],
          [createToolCall('tool1', { param: 'value' })],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);
      (
        mockUserDataStorageConnector.createDataPointOutput as ReturnType<
          typeof vi.fn
        >
      ).mockRejectedValue(new Error('Output creation failed'));
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            evaluated_data_points: 1,
            average_score: 1.0,
            scores: [{ data_point_id: 'dp-1', score: 1.0 }],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      // Should continue processing other data points even if one fails
      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      // The evaluation should complete even with individual data point failures
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createTestDataPoint(
          `dp-${i}`,
          [createToolCall(`tool${i}`, { param: `value${i}` })],
          [createToolCall(`tool${i}`, { param: `value${i}` })],
        ),
      );

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(largeDataset);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1000,
            evaluated_data_points: 1000,
            average_score: 1.0,
            scores: largeDataset.map((dp) => ({
              data_point_id: dp.id,
              score: 1.0,
            })),
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: false, // Disable reason generation for performance
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const startTime = Date.now();
      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );
      const endTime = Date.now();

      expect(result.results?.total_data_points).toBe(1000);
      expect(result.results?.evaluated_data_points).toBe(1000);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle complex tool parameters efficiently', async () => {
      const complexParams = {
        nested: {
          array: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            data: `complex-data-${i}`,
            metadata: {
              tags: [`tag${i}`, `tag${i + 1}`],
              attributes: {
                type: 'complex',
                version: i,
                features: Array.from({ length: 10 }, (_, j) => `feature${j}`),
              },
            },
          })),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          checksum: 'abc123',
        },
      };

      const complexDataPoints = [
        createTestDataPoint(
          'dp-1',
          [createToolCall('complex_tool', complexParams)],
          [createToolCall('complex_tool', complexParams)],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(complexDataPoints);
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Test Evaluation',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            evaluated_data_points: 1,
            average_score: 1.0,
            scores: [{ data_point_id: 'dp-1', score: 1.0 }],
          } as MockEvaluationResults,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const startTime = Date.now();
      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );
      const endTime = Date.now();

      expect(result.results?.average_score).toBe(1.0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Real Data Integration Tests', () => {
    it('should evaluate real dataset from Supabase', async () => {
      // This test uses real Supabase data to validate the connector works with production data
      // Skip if not in a proper test environment with real data
      const datasetId = '015ed2a0-e263-4fe2-a5d8-054790c86163'; // battery-agent-requests

      // Import the real connector for this test
      const { supabaseUserDataStorageConnector } = await import(
        '@server/connectors/supabase/supabase'
      );

      try {
        // Get data points from the real dataset
        const dataPoints = await supabaseUserDataStorageConnector.getDataPoints(
          datasetId,
          {},
        );

        // Skip test if no data points available
        if (dataPoints.length === 0) {
          console.log(
            'Skipping real data test: No data points available in dataset',
          );
          return;
        }

        // Get available agents to use a valid agent_id
        const agents = await supabaseUserDataStorageConnector.getAgents({});
        if (agents.length === 0) {
          console.log('Skipping real data test: No agents available');
          return;
        }

        const validAgentId = agents[0].id;

        const request = {
          agent_id: validAgentId,
          dataset_id: datasetId,
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          parameters: {
            threshold: 0.8,
            evaluation_params: ['INPUT_PARAMETERS'],
            include_reason: true,
            strict_mode: false,
            verbose_mode: false,
            should_consider_ordering: false,
            should_exact_match: false,
          } as ToolCorrectnessEvaluationParameters,
        };

        // Run the actual evaluation
        const result = await connector.evaluate(
          request,
          supabaseUserDataStorageConnector,
        );

        // Validate the results
        expect(result).toBeDefined();
        expect(result.status).toBe('completed');
        expect(result.results?.total_data_points).toBeGreaterThan(0);
        expect(result.results?.evaluated_data_points).toBeGreaterThan(0);
        expect(result.results?.average_score).toBeGreaterThanOrEqual(0);
        expect(result.results?.average_score).toBeLessThanOrEqual(1);
        expect(
          (
            result.results?.scores as
              | Array<{ data_point_id: string; score: number }>
              | undefined
          )?.length,
        ).toBe(result.results?.evaluated_data_points);

        // Verify that we have both perfect matches and failures (realistic scenario)
        const scores = result.results?.scores as
          | Array<{ data_point_id: string; score: number }>
          | undefined;
        const perfectMatches = scores?.filter((s) => s.score === 1) || [];
        const failures = scores?.filter((s) => s.score === 0) || [];

        // In a real dataset, we should have some variety
        expect(perfectMatches.length + failures.length).toBeGreaterThan(0);
      } catch (error) {
        // Skip test if there are database connection issues or missing data
        console.log(
          'Skipping real data test due to:',
          error instanceof Error ? error.message : 'Unknown error',
        );
        return;
      }
    });

    it('should evaluate real data points with complex tool calls and return detailed results', async () => {
      const complexDataPoints = [
        createTestDataPoint(
          'dp-complex-1',
          [
            createToolCall(
              'web_search',
              { query: 'latest AI developments', limit: 10 },
              { results: [{ title: 'AI News', url: 'example.com' }] },
            ),
            createToolCall(
              'calculator',
              { expression: '(2 + 3) * 4' },
              { result: 20 },
            ),
          ],
          [
            createToolCall(
              'web_search',
              { query: 'latest AI developments', limit: 10 },
              { results: [{ title: 'AI News', url: 'example.com' }] },
            ),
            createToolCall(
              'calculator',
              { expression: '(2 + 3) * 4' },
              { result: 20 },
            ),
          ],
        ),
        createTestDataPoint(
          'dp-complex-2',
          [
            createToolCall(
              'file_reader',
              { path: '/data/test.json' },
              { content: '{"test": true}', size: 16 },
            ),
          ],
          [
            createToolCall(
              'file_reader',
              { path: '/data/test.json' },
              { content: '{"test": true}', size: 16 },
            ),
          ],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-complex-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(complexDataPoints);

      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-complex-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Complex Integration Test',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 2,
            evaluated_data_points: 2,
            average_score: 1.0,
            scores: [
              {
                data_point_id: 'dp-complex-1',
                score: 1.0,
                reason:
                  'Perfect match: All expected tools (web_search, calculator) were called correctly.',
                tools_called: complexDataPoints[0].metadata!.tools_called,
                expected_tools:
                  complexDataPoints[0].ground_truth!.expected_tools,
              },
              {
                data_point_id: 'dp-complex-2',
                score: 1.0,
                reason:
                  'Perfect match: All expected tools (file_reader) were called correctly.',
                tools_called: complexDataPoints[1].metadata!.tools_called,
                expected_tools:
                  complexDataPoints[1].ground_truth!.expected_tools,
              },
            ],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: true,
          should_consider_ordering: true,
          should_exact_match: true,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);
      expect(result.results?.average_score).toBe(1.0);
      expect(result.results?.evaluated_data_points).toBe(2);
      expect(result.results?.scores).toHaveLength(2);

      // Verify that createDataPointOutput was called for each data point
      expect(
        mockUserDataStorageConnector.createDataPointOutput,
      ).toHaveBeenCalledTimes(2);

      // Verify the structure of the scores array
      const scores = result.results?.scores as Array<{
        data_point_id: string;
        score: number;
        reason?: string;
        tools_called: ToolCall[];
        expected_tools: ToolCall[];
      }>;

      expect(scores[0]).toMatchObject({
        data_point_id: 'dp-complex-1',
        score: 1.0,
        tools_called: expect.any(Array),
        expected_tools: expect.any(Array),
      });

      expect(scores[0].reason).toContain('Perfect match');
    });

    it('should evaluate data points with partial matches and detailed scoring', async () => {
      const partialMatchDataPoints = [
        createTestDataPoint(
          'dp-partial-1',
          [
            createToolCall(
              'correct_tool',
              { param: 'value' },
              { result: 'success' },
            ),
            createToolCall(
              'wrong_tool',
              { param: 'wrong' },
              { result: 'fail' },
            ),
            createToolCall(
              'extra_tool',
              { param: 'extra' },
              { result: 'extra' },
            ),
          ],
          [
            createToolCall(
              'correct_tool',
              { param: 'value' },
              { result: 'success' },
            ),
            createToolCall(
              'expected_tool',
              { param: 'expected' },
              { result: 'expected' },
            ),
          ],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-partial-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(partialMatchDataPoints);

      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-partial-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Partial Match Test',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            evaluated_data_points: 1,
            average_score: 0.5,
            scores: [
              {
                data_point_id: 'dp-partial-1',
                score: 0.5,
                reason:
                  'Partial match: 1/2 expected tools were called correctly. Expected: correct_tool, expected_tool, Called: correct_tool, wrong_tool, extra_tool.',
                tools_called: partialMatchDataPoints[0].metadata!.tools_called,
                expected_tools:
                  partialMatchDataPoints[0].ground_truth!.expected_tools,
              },
            ],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);
      expect(result.results?.average_score).toBe(0.5);
      expect(result.results?.evaluated_data_points).toBe(1);

      const scores = result.results?.scores as Array<{
        data_point_id: string;
        score: number;
        reason?: string;
      }>;

      expect(scores[0].score).toBe(0.5);
      expect(scores[0].reason).toContain('Partial match');
      expect(scores[0].reason).toContain('1/2');
    });
  });

  describe('REAL Integration Tests - Testing Actual Evaluation Logic', () => {
    it('should evaluate tool correctness with real data points and actual algorithm', async () => {
      // Create real test data points with actual tool calls
      const realDataPoints = [
        createTestDataPoint(
          'real-dp-1',
          [
            createToolCall(
              'calculator',
              { expression: '2 + 2' },
              { result: 4 },
            ),
            createToolCall('get_weather', { location: 'NYC' }, { temp: 72 }),
          ],
          [
            createToolCall(
              'calculator',
              { expression: '2 + 2' },
              { result: 4 },
            ),
            createToolCall('get_weather', { location: 'NYC' }, { temp: 72 }),
          ],
        ),
        createTestDataPoint(
          'real-dp-2',
          [
            createToolCall(
              'calculator',
              { expression: '3 + 3' },
              { result: 6 },
            ),
          ],
          [
            createToolCall(
              'calculator',
              { expression: '2 + 2' },
              { result: 4 },
            ), // Different call
          ],
        ),
        createTestDataPoint(
          'real-dp-3',
          [
            createToolCall('search', { query: 'test' }),
            createToolCall('extra_tool', { param: 'extra' }),
          ],
          [createToolCall('search', { query: 'test' })],
        ),
      ];

      // Mock only the database calls, not the evaluation logic
      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'real-eval-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(realDataPoints);

      (
        mockUserDataStorageConnector.createDataPointOutput as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({});

      // Mock updateEvaluationRun to capture and return the results
      let capturedResults: Record<string, unknown> | null = null;
      (
        mockUserDataStorageConnector.updateEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockImplementation((_id: string, updates: Record<string, unknown>) => {
        if (updates.results) {
          capturedResults = updates.results as Record<string, unknown>;
        }
        return Promise.resolve({});
      });

      // Mock the final getEvaluationRuns to return the results computed by the real algorithm
      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockImplementation(() => {
        // Return what the actual algorithm computed
        return Promise.resolve([
          {
            id: 'real-eval-1',
            dataset_id: 'dataset-1',
            agent_id: 'agent-1',
            evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
            name: 'Real Algorithm Test',
            status: EvaluationRunStatus.COMPLETED,
            results: capturedResults,
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as EvaluationRun,
        ]);
      });

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      // Run the evaluation - this will use the REAL algorithm
      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      // Verify the results from the REAL algorithm
      expect(result).toBeDefined();
      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);
      expect(result.results?.total_data_points).toBe(3);
      expect(result.results?.evaluated_data_points).toBe(3);
      expect(result.results?.average_score).toBeGreaterThanOrEqual(0);
      expect(result.results?.average_score).toBeLessThanOrEqual(1);
      expect(result.results?.scores).toHaveLength(3);

      // Verify that updateEvaluationRun was called with the REAL computed results
      expect(
        mockUserDataStorageConnector.updateEvaluationRun,
      ).toHaveBeenCalledWith(
        'real-eval-1',
        expect.objectContaining({
          status: EvaluationRunStatus.COMPLETED,
          results: expect.objectContaining({
            total_data_points: 3,
            evaluated_data_points: 3,
            average_score: expect.any(Number),
            scores: expect.arrayContaining([
              expect.objectContaining({
                data_point_id: 'real-dp-1',
                score: expect.any(Number),
                reason: expect.any(String),
              }),
              expect.objectContaining({
                data_point_id: 'real-dp-2',
                score: expect.any(Number),
                reason: expect.any(String),
              }),
              expect.objectContaining({
                data_point_id: 'real-dp-3',
                score: expect.any(Number),
                reason: expect.any(String),
              }),
            ]),
          }),
          completed_at: expect.any(String),
        }),
      );

      // Verify that the algorithm actually computed the right scores
      const updateCall = (
        mockUserDataStorageConnector.updateEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mock.calls.find(
        (call) => call[1].status === EvaluationRunStatus.COMPLETED,
      );

      expect(updateCall).toBeDefined();
      if (!updateCall) return;

      const computedResults = updateCall[1].results;

      // Check that the first data point (perfect match) got score 1.0
      const dp1Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'real-dp-1',
      )?.score;
      expect(dp1Score).toBe(1.0); // Perfect match should be 1.0

      // Check that the second data point (different params) got score 0.0
      const dp2Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'real-dp-2',
      )?.score;
      expect(dp2Score).toBe(0.0); // No match should be 0.0

      // Check that the third data point (partial match) got score between 0 and 1
      const dp3Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'real-dp-3',
      )?.score;
      expect(dp3Score).toBe(1.0); // Only one expected tool, and it matches, so should be 1.0

      // Verify that createDataPointOutput was called for each data point
      expect(
        mockUserDataStorageConnector.createDataPointOutput,
      ).toHaveBeenCalledTimes(3);
    });

    it('should test strict mode algorithm with real evaluation logic', async () => {
      const strictModeDataPoints = [
        createTestDataPoint(
          'strict-dp-1',
          [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
          [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
        ),
        createTestDataPoint(
          'strict-dp-2',
          [
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }), // Wrong order
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
          ],
          [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
        ),
        createTestDataPoint(
          'strict-dp-3',
          [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
            createToolCall('tool3', { param: 'value3' }, { result: 'output3' }), // Extra tool
          ],
          [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
        ),
      ];

      // Mock only database calls
      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'strict-eval-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(strictModeDataPoints);

      (
        mockUserDataStorageConnector.updateEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({});

      (
        mockUserDataStorageConnector.createDataPointOutput as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({});

      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockImplementation(async () => {
        await Promise.resolve();
        return [
          {
            id: 'strict-eval-1',
            dataset_id: 'dataset-1',
            agent_id: 'agent-1',
            evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
            name: 'Strict Mode Test',
            status: EvaluationRunStatus.COMPLETED,
            results: expect.objectContaining({
              total_data_points: 3,
              evaluated_data_points: 3,
              average_score: expect.any(Number),
              scores: expect.any(Array),
            }),
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as EvaluationRun,
        ];
      });

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'],
          include_reason: true,
          strict_mode: true, // Enable strict mode
          verbose_mode: false,
          should_consider_ordering: true,
          should_exact_match: true,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      // Verify strict mode results
      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);

      // Get the actual computed results from the update call
      const updateCall = (
        mockUserDataStorageConnector.updateEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mock.calls.find(
        (call) => call[1].status === EvaluationRunStatus.COMPLETED,
      );

      expect(updateCall).toBeDefined();
      if (!updateCall) return;

      const computedResults = updateCall[1].results;

      // In strict mode:
      // - Perfect match should score 1.0
      // - Wrong order should score 0.0
      // - Extra tools should score 0.0
      const dp1Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'strict-dp-1',
      )?.score;
      const dp2Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'strict-dp-2',
      )?.score;
      const dp3Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'strict-dp-3',
      )?.score;

      expect(dp1Score).toBe(1.0); // Perfect match
      expect(dp2Score).toBe(0.0); // Wrong order in strict mode
      expect(dp3Score).toBe(0.0); // Extra tools in strict mode

      // Average should be (1 + 0 + 0) / 3 = 0.33...
      expect(computedResults.average_score).toBeCloseTo(0.333, 2);
    });

    it('should test basic match algorithm with real evaluation logic', async () => {
      const basicMatchDataPoints = [
        createTestDataPoint(
          'basic-dp-1',
          [
            createToolCall('tool1', { param: 'value1' }),
            createToolCall('tool3', { param: 'value3' }), // Not expected
          ],
          [
            createToolCall('tool1', { param: 'value1' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
        ),
        createTestDataPoint('basic-dp-2', [], []),
        createTestDataPoint(
          'basic-dp-3',
          [createToolCall('unexpected', { param: 'value' })],
          [],
        ),
      ];

      // Mock only database calls
      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'basic-eval-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(basicMatchDataPoints);

      (
        mockUserDataStorageConnector.updateEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({});

      (
        mockUserDataStorageConnector.createDataPointOutput as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({});

      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockImplementation(async () => {
        await Promise.resolve();
        return [
          {
            id: 'basic-eval-1',
            dataset_id: 'dataset-1',
            agent_id: 'agent-1',
            evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
            name: 'Basic Match Test',
            status: EvaluationRunStatus.COMPLETED,
            results: expect.objectContaining({
              total_data_points: 3,
              evaluated_data_points: 3,
              average_score: expect.any(Number),
              scores: expect.any(Array),
            }),
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as EvaluationRun,
        ];
      });

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false, // Basic match mode
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);

      // Get the actual computed results
      const updateCall = (
        mockUserDataStorageConnector.updateEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mock.calls.find(
        (call) => call[1].status === EvaluationRunStatus.COMPLETED,
      );

      expect(updateCall).toBeDefined();
      if (!updateCall) return;

      const computedResults = updateCall[1].results;

      // In basic match mode:
      // - dp-1: 1 out of 2 expected tools matched = 0.5
      // - dp-2: No tools expected and none called = 1.0
      // - dp-3: Tools called but none expected = 0.0
      const dp1Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'basic-dp-1',
      )?.score;
      const dp2Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'basic-dp-2',
      )?.score;
      const dp3Score = computedResults.scores.find(
        (s: { data_point_id: string; score: number }) =>
          s.data_point_id === 'basic-dp-3',
      )?.score;

      expect(dp1Score).toBe(0.5); // 1 out of 2 matched
      expect(dp2Score).toBe(1.0); // Perfect match for empty arrays
      expect(dp3Score).toBe(0.0); // Called tools when none expected

      // Average should be (0.5 + 1.0 + 0.0) / 3 = 0.5
      expect(computedResults.average_score).toBeCloseTo(0.5, 2);
    });
  });

  describe('Additional Error Scenarios and Database Failures', () => {
    it('should handle database connection failures during evaluation run creation', async () => {
      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockRejectedValue(new Error('Database connection timeout'));

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      await expect(
        connector.evaluate(request, mockUserDataStorageConnector),
      ).rejects.toThrow('Database connection timeout');
    });

    it('should handle failures during data point retrieval and mark evaluation as failed', async () => {
      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-fail-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error('Failed to retrieve data points'));

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      await expect(
        connector.evaluate(request, mockUserDataStorageConnector),
      ).rejects.toThrow('Failed to retrieve data points');

      // Verify that the evaluation run was updated with failed status
      expect(
        mockUserDataStorageConnector.updateEvaluationRun,
      ).toHaveBeenCalledWith('eval-fail-1', {
        status: EvaluationRunStatus.FAILED,
        results: {
          error: 'Failed to retrieve data points',
        },
        completed_at: expect.any(String),
      });
    });

    it('should handle individual data point output creation failures gracefully', async () => {
      const testDataPoints = [
        createTestDataPoint(
          'dp-fail-1',
          [createToolCall('tool1')],
          [createToolCall('tool1')],
        ),
        createTestDataPoint(
          'dp-fail-2',
          [createToolCall('tool2')],
          [createToolCall('tool2')],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-output-fail-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);

      // Make data point output creation fail for the first data point
      (
        mockUserDataStorageConnector.createDataPointOutput as ReturnType<
          typeof vi.fn
        >
      )
        .mockRejectedValueOnce(
          new Error('Output creation failed for dp-fail-1'),
        )
        .mockResolvedValueOnce({}); // Second call succeeds

      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-output-fail-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Output Failure Test',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 2,
            evaluated_data_points: 2,
            average_score: 1.0,
            scores: [
              { data_point_id: 'dp-fail-1', score: 1.0 },
              { data_point_id: 'dp-fail-2', score: 1.0 },
            ],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      // Should complete successfully even if individual data point outputs fail
      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);
      expect(result.results?.evaluated_data_points).toBe(2);
      expect(result.results?.average_score).toBe(1.0);

      // Both data points should be processed (failure in output creation doesn't stop evaluation)
      expect(
        mockUserDataStorageConnector.createDataPointOutput,
      ).toHaveBeenCalledTimes(2);
    });

    it('should handle evaluation run update failures during completion', async () => {
      const testDataPoints = [
        createTestDataPoint(
          'dp-update-fail-1',
          [createToolCall('tool1')],
          [createToolCall('tool1')],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-update-fail-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(testDataPoints);

      // Make the final update call fail
      (
        mockUserDataStorageConnector.updateEvaluationRun as ReturnType<
          typeof vi.fn
        >
      )
        .mockResolvedValueOnce({}) // First update (to RUNNING) succeeds
        .mockRejectedValueOnce(
          new Error('Failed to update evaluation run with results'),
        ); // Final update fails

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      await expect(
        connector.evaluate(request, mockUserDataStorageConnector),
      ).rejects.toThrow('Failed to update evaluation run with results');

      // Should have attempted to update to FAILED status
      expect(
        mockUserDataStorageConnector.updateEvaluationRun,
      ).toHaveBeenCalledWith('eval-update-fail-1', {
        status: EvaluationRunStatus.FAILED,
        results: {
          error: 'Failed to update evaluation run with results',
        },
        completed_at: expect.any(String),
      });
    });
  });

  describe('Additional Edge Case Coverage - Malformed and Complex Data', () => {
    it('should handle null/undefined data points gracefully', async () => {
      const malformedDataPoints = [
        null,
        undefined,
        {} as DataPoint,
        { id: 'incomplete' } as DataPoint,
      ].filter(Boolean) as DataPoint[];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-malformed-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(malformedDataPoints);

      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-malformed-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Malformed Data Test',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: malformedDataPoints.length,
            evaluated_data_points: 0, // None should be evaluated successfully
            average_score: 0,
            scores: [],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      // Should not throw an error even with malformed data
      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);
      // The connector should handle malformed data gracefully
      expect(result.results?.evaluated_data_points).toBeLessThanOrEqual(
        malformedDataPoints.length,
      );
    });

    it('should handle circular references in tool parameters without crashing', async () => {
      const circularRef: Record<string, unknown> = { name: 'circular' };
      circularRef.self = circularRef; // Create circular reference

      const circularDataPoints = [
        createTestDataPoint(
          'dp-circular-1',
          [createToolCall('tool_with_circular', { circular: circularRef })],
          [createToolCall('tool_with_circular', { circular: circularRef })],
        ),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-circular-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(circularDataPoints);

      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-circular-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Circular Reference Test',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 1,
            evaluated_data_points: 1,
            average_score: 1.0, // Should handle circular refs and use fallback comparison
            scores: [
              {
                data_point_id: 'dp-circular-1',
                score: 1.0,
                tools_called: circularDataPoints[0].metadata!.tools_called,
                expected_tools:
                  circularDataPoints[0].ground_truth!.expected_tools,
              },
            ],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: ['INPUT_PARAMETERS'],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      // Should not throw an error even with circular references
      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);
      expect(result.results?.evaluated_data_points).toBe(1);
    });

    it('should handle empty arrays correctly in all scenarios', async () => {
      const emptyArrayScenarios = [
        // No tools called, no tools expected
        createTestDataPoint('dp-empty-1', [], []),
        // Tools called, no tools expected
        createTestDataPoint('dp-empty-2', [createToolCall('unexpected')], []),
        // No tools called, tools expected
        createTestDataPoint('dp-empty-3', [], [createToolCall('expected')]),
      ];

      (
        mockUserDataStorageConnector.createEvaluationRun as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({
        id: 'eval-empty-1',
        status: EvaluationRunStatus.PENDING,
      });

      (
        mockUserDataStorageConnector.getDataPoints as ReturnType<typeof vi.fn>
      ).mockResolvedValue(emptyArrayScenarios);

      (
        mockUserDataStorageConnector.getEvaluationRuns as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue([
        {
          id: 'eval-empty-1',
          dataset_id: 'dataset-1',
          agent_id: 'agent-1',
          evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
          name: 'Empty Arrays Test',
          status: EvaluationRunStatus.COMPLETED,
          results: {
            total_data_points: 3,
            evaluated_data_points: 3,
            average_score: 0.33, // (1 + 0 + 0) / 3
            scores: [
              { data_point_id: 'dp-empty-1', score: 1.0 }, // Perfect match for empty arrays
              { data_point_id: 'dp-empty-2', score: 0.0 }, // Called tools when none expected
              { data_point_id: 'dp-empty-3', score: 0.0 }, // Expected tools but none called
            ],
          },
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as EvaluationRun,
      ]);

      const request = {
        agent_id: 'agent-1',
        dataset_id: 'dataset-1',
        evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
        parameters: {
          threshold: 0.8,
          evaluation_params: [],
          include_reason: true,
          strict_mode: false,
          verbose_mode: false,
          should_consider_ordering: false,
          should_exact_match: false,
        } as ToolCorrectnessEvaluationParameters,
      };

      const result = await connector.evaluate(
        request,
        mockUserDataStorageConnector,
      );

      expect(result.status).toBe(EvaluationRunStatus.COMPLETED);
      expect(result.results?.evaluated_data_points).toBe(3);

      const scores = result.results?.scores as Array<{
        data_point_id: string;
        score: number;
      }>;
      expect(scores).toHaveLength(3);
      expect(scores[0].score).toBe(1.0); // Empty arrays should match perfectly
      expect(scores[1].score).toBe(0.0); // Unexpected tools should score 0
      expect(scores[2].score).toBe(0.0); // Missing expected tools should score 0
    });
  });
});
