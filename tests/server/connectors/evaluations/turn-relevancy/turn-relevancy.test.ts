import { evaluateOneLogForTurnRelevancy } from '@server/connectors/evaluations/turn-relevancy/service/evaluate';
import {
  createTurnRelevancyEvaluator,
  evaluateTurnRelevancy,
} from '@server/connectors/evaluations/turn-relevancy/service/turn-relevancy-criteria';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
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

describe('Turn Relevancy Evaluator', () => {
  let evaluator: ReturnType<typeof createTurnRelevancyEvaluator>;

  beforeEach(() => {
    evaluator = createTurnRelevancyEvaluator();
    mockFetch.mockClear();
  });

  it('creates evaluator instance', () => {
    expect(evaluator).toBeDefined();
    expect(typeof evaluator.evaluateTurnRelevancy).toBe('function');
  });

  it('evaluates turn relevancy successfully', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.9,
                reasoning: 'Turn is relevant to prior context',
                metadata: {
                  relevant: true,
                  relevance_reasons: ['mentions earlier topic'],
                },
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await evaluator.evaluateTurnRelevancy({
      conversation_history: 'User asked about weather in Paris.',
      current_turn: 'Tomorrow will be sunny in Paris with 22°C.',
    });

    expect(result.score).toBe(0.9);
    expect(result.reasoning).toBe('Turn is relevant to prior context');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/responses',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('parses JSON reasoning when provided', async () => {
    const mockResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.85,
                reasoning: JSON.stringify({
                  score: 0.85,
                  reasoning: 'Structured turn relevancy result',
                  metadata: {
                    relevant: true,
                    relevance_reasons: ['topic continuity'],
                  },
                }),
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await evaluateTurnRelevancy({
      conversation_history: "Let's discuss project timeline.",
      current_turn: 'The next milestone is scheduled for Friday.',
    });

    expect(result.score).toBe(0.85);
    expect(result.metadata?.parsed_with_schema).toBe(true);
  });

  it('handles errors with fallback', async () => {
    mockFetch.mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Network error',
        json: async () => ({}),
      } as Response);
    });
    const result = await evaluateTurnRelevancy({
      conversation_history: 'A',
      current_turn: 'B',
    });
    expect(result.score).toBe(0.5);
    expect(result.reasoning).toContain('Evaluation failed');
    expect(result.metadata?.fallback).toBe(true);
  }, 10000);

  describe('evaluateOneLogForTurnRelevancy', () => {
    // Mock user data storage connector
    const mockUserDataStorageConnector = {
      getEvaluationRuns: vi.fn(),
      createLogOutput: vi.fn(),
      getLogOutputs: vi.fn(),
      updateEvaluationRun: vi.fn(),
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

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should evaluate a single log and update evaluation run statistics', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        metadata: {
          conversation_history: 'User: What is the weather like today?',
          current_turn: 'It looks like it will be sunny with 25°C.',
        },
      } as unknown as IdkRequestLog;

      // Mock LLM judge response
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
                    'The response is highly relevant to the weather inquiry.',
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

      // Mock evaluation run retrieval
      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          results: {
            total_logs: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.8,
            threshold_used: 0.5,
          },
          metadata: {
            parameters: {
              threshold: 0.5,
              model: 'gpt-4o',
              temperature: 0.1,
              max_tokens: 1000,
              conversation_history: '',
              current_turn: '',
            },
          },
        },
      ] as EvaluationRun[]);

      // Mock log output creation
      mockedCreateLogOutput.mockResolvedValue({
        id: 'new-output-id',
        log_id: 'test-log-id',
        output: {
          score: 0.9,
          reasoning: 'The response is highly relevant to the weather inquiry.',
          passed: true,
          threshold: 0.5,
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
          score: 0.8,
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
      mockedUpdateEvaluationRun.mockResolvedValue({} as EvaluationRun);

      await evaluateOneLogForTurnRelevancy(
        evaluationRunId,
        mockLog,
        mockUserDataStorageConnector,
      );

      // Verify evaluation run was retrieved
      expect(mockedGetEvaluationRuns).toHaveBeenCalledWith({
        id: evaluationRunId,
      });

      // Verify log output was created
      expect(mockedCreateLogOutput).toHaveBeenCalledWith(
        evaluationRunId,
        expect.objectContaining({
          log_id: 'test-log-id',
        }),
      );

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
            average_score: expect.closeTo(0.85, 0.01), // (0.8 + 0.9) / 2
            threshold_used: 0.5,
          }),
          metadata: expect.objectContaining({
            total_logs: 2,
            passed_count: 2,
            failed_count: 0,
            average_score: expect.closeTo(0.85, 0.01),
            threshold_used: 0.5,
          }),
        }),
      );
    });

    it('should handle threshold checking correctly', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        metadata: {
          conversation_history: 'User: How are you doing today?',
          current_turn: 'The stock market is performing well.',
        },
      } as unknown as IdkRequestLog;

      const mockLLMResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.3, // Below threshold
                  reasoning:
                    'Response is not relevant to the conversational greeting.',
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

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          results: {},
          metadata: {
            parameters: {
              threshold: 0.6, // Higher threshold
              model: 'gpt-4o',
              conversation_history: '',
              current_turn: '',
            },
          },
        },
      ] as EvaluationRun[]);

      mockedCreateLogOutput.mockResolvedValue({
        id: 'new-output-id',
        log_id: 'test-log-id',
        output: {},
        score: 0.3,
        metadata: {},
        created_at: new Date().toISOString(),
      });

      mockedGetLogOutputs.mockResolvedValue([
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.3,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ]);

      mockedUpdateEvaluationRun.mockResolvedValue({} as EvaluationRun);

      await evaluateOneLogForTurnRelevancy(
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
            passed_count: 0, // Score 0.3 < threshold 0.6
            failed_count: 1,
            average_score: 0.3,
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
        evaluateOneLogForTurnRelevancy(
          evaluationRunId,
          mockLog,
          mockUserDataStorageConnector,
        ),
      ).rejects.toThrow(`Evaluation run ${evaluationRunId} not found`);
    });

    it('should handle turn relevancy specific metadata correctly', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        metadata: {
          conversation_history: 'User: Tell me about Python programming.',
          current_turn: 'Python is a versatile programming language.',
          instructions: 'Be helpful and informative',
        },
      } as unknown as IdkRequestLog;

      const mockLLMResponse = {
        output: [
          {
            type: 'message',
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  score: 0.95,
                  reasoning:
                    'Highly relevant response about Python programming.',
                  metadata: {
                    relevant: true,
                    relevance_reasons: ['direct topic match', 'informative'],
                  },
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

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          results: {},
          metadata: {
            parameters: {
              threshold: 0.5,
              model: 'gpt-4o',
              verbose_mode: true,
              include_reason: true,
              conversation_history: '',
              current_turn: '',
            },
          },
        },
      ] as EvaluationRun[]);

      mockedCreateLogOutput.mockResolvedValue({
        id: 'new-output-id',
        log_id: 'test-log-id',
        output: {},
        score: 0.95,
        metadata: {},
        created_at: new Date().toISOString(),
      });

      mockedGetLogOutputs.mockResolvedValue([
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.95,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ]);

      mockedUpdateEvaluationRun.mockResolvedValue({} as EvaluationRun);

      await evaluateOneLogForTurnRelevancy(
        evaluationRunId,
        mockLog,
        mockUserDataStorageConnector,
      );

      // Verify log output was created with turn relevancy specific data
      expect(mockedCreateLogOutput).toHaveBeenCalledWith(
        evaluationRunId,
        expect.objectContaining({
          log_id: 'test-log-id',
          metadata: expect.objectContaining({
            conversation_history: 'User: Tell me about Python programming.',
            current_turn: 'Python is a versatile programming language.',
            instructions: 'Be helpful and informative',
            verbose_mode: true,
            include_reason: true,
          }),
        }),
      );

      // Verify statistics include additional turn relevancy metrics
      expect(mockedUpdateEvaluationRun).toHaveBeenCalledWith(
        evaluationRunId,
        expect.objectContaining({
          results: expect.objectContaining({
            total_logs: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.95,
            threshold_used: 0.5,
            min_score: 0.95,
            max_score: 0.95,
            median_score: 0.95,
            valid_results_count: 1,
            error_results_count: 0,
          }),
          metadata: expect.objectContaining({
            total_logs: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.95,
            min_score: 0.95,
            max_score: 0.95,
            median_score: 0.95,
            valid_results_count: 1,
            error_results_count: 0,
          }),
        }),
      );
    });
  });
});
