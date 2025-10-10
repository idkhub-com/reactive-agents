import { evaluateOneLogForRoleAdherence } from '@server/connectors/evaluations/role-adherence/service/evaluate';
import {
  createRoleAdherenceEvaluator,
  evaluateRoleAdherence,
} from '@server/connectors/evaluations/role-adherence/service/role-adherence-criteria';
import type { UserDataStorageConnector } from '@server/types/connector';
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

describe('Role Adherence Evaluator', () => {
  let evaluator: ReturnType<typeof createRoleAdherenceEvaluator>;

  beforeEach(() => {
    evaluator = createRoleAdherenceEvaluator();
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  it('should create a role adherence evaluator instance', () => {
    expect(evaluator).toBeDefined();
    expect(typeof evaluator.evaluateRoleAdherence).toBe('function');
  });

  it('should evaluate role adherence successfully', async () => {
    const mockEvaluationResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.9,
                reasoning: 'Output aligns closely with role requirements',
                metadata: { metric: 'role_adherence' },
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockEvaluationResponse)),
      json: () => Promise.resolve(mockEvaluationResponse),
    });

    const result = await evaluator.evaluateRoleAdherence({
      role_definition:
        'You are a concise financial analyst. Avoid personal opinions.',
      assistant_output:
        'Based on Q2 reports, revenue increased 12%. Risks include FX volatility.',
      criteria: {
        strict_mode: false,
        verbose_mode: true,
        include_reason: true,
      },
    });

    expect(result.score).toBe(0.9);
    expect(result.reasoning).toBe(
      'Output aligns closely with role requirements',
    );

    // Verify template was used
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/v1/responses',
      expect.objectContaining({
        body: expect.stringContaining(
          'expert evaluator assessing whether an AI assistant',
        ),
      }),
    );
  });

  it('should parse JSON reasoning when provided', async () => {
    const mockEvaluationResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.85,
                reasoning: JSON.stringify({
                  criteria: {
                    adhered_to_role: true,
                    adherence_level: 0.85,
                    violations: [],
                  },
                  score: 0.85,
                  overall_success: true,
                }),
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockEvaluationResponse)),
      json: () => Promise.resolve(mockEvaluationResponse),
    });

    const result = await evaluator.evaluateRoleAdherence({
      role_definition:
        'You are a helpful travel planner. Avoid medical advice.',
      assistant_output:
        'Consider visiting Kyoto in spring; visa depends on nationality.',
    });

    expect(result.score).toBe(0.85);
    expect(result.metadata?.parsed_with_schema).toBe(true);
  });

  it('should work with the standalone evaluateRoleAdherence function', async () => {
    const mockEvaluationResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.8,
                reasoning: 'Good adherence with minor tone deviation',
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockEvaluationResponse)),
      json: () => Promise.resolve(mockEvaluationResponse),
    });

    const result = await evaluateRoleAdherence({
      role_definition: 'You are a cybersecurity advisor. Never reveal secrets.',
      assistant_output:
        'Use MFA and strong passwords. Avoid sharing confidential keys.',
    });

    expect(result.score).toBe(0.8);
    expect(result.reasoning).toBe('Good adherence with minor tone deviation');
  });

  it('should handle evaluation errors gracefully with fallback', async () => {
    mockFetch.mockImplementation(() => {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Network error',
        json: async () => ({}),
      } as Response);
    });

    const result = await evaluateRoleAdherence({
      role_definition: 'You are a math tutor. Provide step-by-step reasoning.',
      assistant_output: 'Answer: 42',
    });

    expect(result.score).toBe(0.5);
    expect(result.reasoning).toContain('Evaluation failed');
    expect(result.metadata?.fallback).toBe(true);
  }, 10000);

  describe('evaluateOneLogForRoleAdherence', () => {
    it('should evaluate a single log and update evaluation run statistics', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        ai_provider_request_log: {
          request_body: {
            messages: [
              {
                role: 'user',
                content: 'How should I secure my passwords?',
              },
            ],
          },
          response_body: {
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: 'Use strong, unique passwords and enable 2FA.',
                },
              },
            ],
          },
        },
        metadata: {
          role_definition:
            'You are a cybersecurity expert. Be professional and thorough.',
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
                  score: 0.85,
                  reasoning:
                    'Response adheres well to cybersecurity expert role with professional tone.',
                }),
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockLLMResponse)),
        json: () => Promise.resolve(mockLLMResponse),
      });

      // Mock evaluation run retrieval
      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.ROLE_ADHERENCE,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          results: {
            total_logs: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.9,
            threshold_used: 0.7,
            evaluation_outputs: ['existing-output-id'],
          },
          metadata: {
            parameters: {
              threshold: 0.7,
              model: 'gpt-4o',
              temperature: 0.1,
              max_tokens: 1000,
              role_definition: 'You are a cybersecurity expert.',
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
          score: 0.85,
          reasoning: 'Response adheres well to role',
          passed: true,
          threshold: 0.7,
        },
        score: 0.85,
        metadata: {},
        created_at: new Date().toISOString(),
        evaluation_run_id: '',
      });

      // Mock existing log outputs retrieval
      mockedGetLogOutputs.mockResolvedValue([
        {
          id: 'existing-output-id',
          log_id: 'existing-log-id',
          output: {},
          score: 0.9,
          metadata: {},
          created_at: new Date().toISOString(),
          evaluation_run_id: '',
        },
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.85,
          metadata: {},
          created_at: new Date().toISOString(),
          evaluation_run_id: '',
        },
      ]);

      // Mock evaluation run update
      mockedUpdateEvaluationRun.mockResolvedValue(
        {} as unknown as EvaluationRun,
      );

      await evaluateOneLogForRoleAdherence(
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
            average_score: 0.875, // (0.9 + 0.85) / 2
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
          response_body: {
            choices: [
              {
                message: { content: 'Generic response without role context.' },
              },
            ],
          },
        },
        metadata: {
          role_definition: 'You are a professional consultant.',
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
                  score: 0.4, // Below threshold
                  reasoning: 'Response does not demonstrate role adherence.',
                }),
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockLLMResponse)),
        json: () => Promise.resolve(mockLLMResponse),
      });

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.ROLE_ADHERENCE,
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
        evaluation_run_id: '',
      });

      mockedGetLogOutputs.mockResolvedValue([
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.4,
          metadata: {},
          created_at: new Date().toISOString(),
          evaluation_run_id: '',
        },
      ]);

      mockedUpdateEvaluationRun.mockResolvedValue(
        {} as unknown as EvaluationRun,
      );

      await evaluateOneLogForRoleAdherence(
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
        evaluateOneLogForRoleAdherence(
          evaluationRunId,
          mockLog,
          mockUserDataStorageConnector,
        ),
      ).rejects.toThrow(`Evaluation run ${evaluationRunId} not found`);
    });
  });
});
