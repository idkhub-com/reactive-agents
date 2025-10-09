import { knowledgeRetentionEvaluationConnector } from '@server/connectors/evaluations/knowledge-retention/knowledge-retention';
import { evaluateOneLogForKnowledgeRetention } from '@server/connectors/evaluations/knowledge-retention/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import {
  type EvaluationRun,
  EvaluationRunStatus,
} from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { KnowledgeRetentionEvaluationParameters } from '@shared/types/idkhub/evaluations/knowledge-retention';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type z from 'zod';

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

describe('Knowledge Retention Evaluation', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  it('should have correct connector configuration', () => {
    const details = knowledgeRetentionEvaluationConnector.getDetails();

    expect(details.method).toBe(EvaluationMethodName.KNOWLEDGE_RETENTION);
    expect(details.name).toBe('Knowledge Retention');
    expect(details.description).toContain('retains and recalls information');
  });

  it('should have parameter schema', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    expect(schema).toBeDefined();
    expect(typeof schema).toBe('object');
  });

  it('should validate parameters correctly', () => {
    const validParams = {
      threshold: 0.8,
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 1000,
    };

    const result =
      knowledgeRetentionEvaluationConnector.getParameterSchema.safeParse(
        validParams,
      );
    expect(result.success).toBe(true);
  });

  it('should reject invalid parameters', () => {
    const invalidParams = {
      temperature: 3.0, // Should be between 0 and 2
      max_tokens: 0, // Should be positive integer
    };

    const result =
      knowledgeRetentionEvaluationConnector.getParameterSchema.safeParse(
        invalidParams,
      );
    expect(result.success).toBe(false);
  });

  it('should validate max_tokens as positive integer', () => {
    const schema =
      knowledgeRetentionEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          KnowledgeRetentionEvaluationParameters,
          KnowledgeRetentionEvaluationParameters
        >
      >;
    // Test valid max_tokens values with required threshold
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 1 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 1000 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 5000 }).success).toBe(
      true,
    );

    // Test invalid max_tokens values
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 0 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: -100 }).success).toBe(
      false,
    );
  });

  it('should require threshold field', () => {
    const schema =
      knowledgeRetentionEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          KnowledgeRetentionEvaluationParameters,
          KnowledgeRetentionEvaluationParameters
        >
      >;

    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should validate minimal parameters with defaults', () => {
    const schema =
      knowledgeRetentionEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          KnowledgeRetentionEvaluationParameters,
          KnowledgeRetentionEvaluationParameters
        >
      >;

    const result = schema.safeParse({ threshold: 0.7 });
    expect(result.success).toBe(true);

    if (result.success) {
      // Fields with defaults should have default values when not provided
      expect(result.data.threshold).toBe(0.7);
      expect(result.data.model).toBe('gpt-4o');
      expect(result.data.temperature).toBe(0.1);
      expect(result.data.max_tokens).toBe(1000);
      expect(result.data.include_reason).toBe(true);
      expect(result.data.strict_mode).toBe(false);
      expect(result.data.async_mode).toBe(false);
      expect(result.data.verbose_mode).toBe(false);
      expect(result.data.batch_size).toBe(10);
    }
  });

  it('should validate threshold range correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid threshold values
    expect(schema.safeParse({ threshold: 0 }).success).toBe(true);
    expect(schema.safeParse({ threshold: 0.5 }).success).toBe(true);
    expect(schema.safeParse({ threshold: 1 }).success).toBe(true);

    // Test invalid threshold values
    expect(schema.safeParse({ threshold: -0.1 }).success).toBe(false);
    expect(schema.safeParse({ threshold: 1.1 }).success).toBe(false);
  });

  it('should validate temperature range correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid temperature values with required threshold
    expect(schema.safeParse({ threshold: 0.5, temperature: 0 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, temperature: 1 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, temperature: 2 }).success).toBe(
      true,
    );

    // Test invalid temperature values
    expect(
      schema.safeParse({ threshold: 0.5, temperature: -0.1 }).success,
    ).toBe(false);
    expect(schema.safeParse({ threshold: 0.5, temperature: 2.1 }).success).toBe(
      false,
    );
  });

  it('should validate valid parameters correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid parameter combinations
    expect(
      schema.safeParse({
        threshold: 0.8,
        model: 'gpt-4o',
      }).success,
    ).toBe(true);
    expect(
      schema.safeParse({
        threshold: 0.6,
        temperature: 0.5,
        max_tokens: 2000,
      }).success,
    ).toBe(true);

    // Test that unknown fields are rejected (strict mode)
    expect(schema.safeParse({ unknown_field: 'value' }).success).toBe(false);
  });

  it('should validate boolean parameters correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid boolean values with required threshold
    expect(
      schema.safeParse({ threshold: 0.5, include_reason: true }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, include_reason: false }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, strict_mode: true }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, strict_mode: false }).success,
    ).toBe(true);
    expect(schema.safeParse({ threshold: 0.5, async_mode: true }).success).toBe(
      true,
    );
    expect(
      schema.safeParse({ threshold: 0.5, async_mode: false }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, verbose_mode: true }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ threshold: 0.5, verbose_mode: false }).success,
    ).toBe(true);
  });

  it('should validate integer parameters correctly', () => {
    const schema = knowledgeRetentionEvaluationConnector.getParameterSchema;

    // Test valid integer values with required threshold
    expect(schema.safeParse({ threshold: 0.5, batch_size: 10 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 50 }).success).toBe(
      true,
    );
    expect(schema.safeParse({ threshold: 0.5, batch_size: 20 }).success).toBe(
      true,
    );

    // Test invalid integer values
    expect(schema.safeParse({ threshold: 0.5, batch_size: 0 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ threshold: 0.5, max_tokens: 0 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ threshold: 0.5, batch_size: -1 }).success).toBe(
      false,
    );
  });

  describe('evaluateOneLogForKnowledgeRetention', () => {
    it('should evaluate a single log and update evaluation run statistics', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        agent_id: 'test-agent-id',
        skill_id: 'test-skill-id',
        method: 'POST',
        endpoint: '/v1/chat/completions',
        function_name: 'chat-complete',
        status: 200,
        start_time: Date.now(),
        end_time: Date.now() + 1000,
        duration: 1000,
        base_idk_config: {},
        ai_provider: 'openai',
        model: 'gpt-4o',
        ai_provider_request_log: {
          provider: 'openai',
          function_name: 'create_model_response',
          method: 'POST',
          request_url: 'http://localhost:3000/v1/responses',
          status: 200,
          request_body: {
            model: 'gpt-4o',
            input: [
              {
                role: 'user',
                content:
                  'User mentioned they like pizza. Tell me about italian cuisine.',
              },
            ],
          },
          response_body: {
            id: 'resp-123',
            object: 'response',
            created_at: Date.now(),
            error: null,
            incomplete_details: null,
            instructions: null,
            metadata: null,
            model: 'gpt-4o',
            output: [
              {
                id: 'msg-123',
                type: 'message',
                role: 'assistant',
                content: [
                  {
                    annotations: [],
                    text: 'Italian cuisine is diverse. Since you mentioned liking pizza, you might also enjoy pasta dishes.',
                    type: 'output_text',
                  },
                ],
              },
            ],
            parallel_tool_calls: null,
            previous_response_id: null,
            reasoning: null,
            temperature: null,
            tools: [],
            usage: {
              input_tokens: 10,
              output_tokens: 20,
              total_tokens: 30,
              output_tokens_details: {
                reasoning_tokens: 0,
              },
            },
            user: null,
          },
          raw_request_body: '{}',
          raw_response_body: '{}',
          cache_mode: 'enabled',
          cache_status: 'miss',
        },
        hook_logs: [],
        metadata: {
          conversation_history: ['User likes pizza'],
        },
        embedding: null,
        cache_status: 'miss',
        trace_id: null,
        parent_span_id: null,
        span_id: null,
        span_name: null,
        app_id: null,
        external_user_id: null,
        external_user_human_name: null,
        user_metadata: null,
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
                  score: 0.8,
                  reasoning:
                    "Assistant demonstrated good knowledge retention by referencing user's previously mentioned pizza preference.",
                  metadata: {
                    knowledgeRetention: {
                      extractedKnowledge: ['User likes pizza'],
                      assistantTurnsWithoutAttrition: 1,
                      totalAssistantTurns: 1,
                      retentionAccuracy: 0.9,
                      contextConsistency: 0.8,
                    },
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
        text: () => Promise.resolve(JSON.stringify(mockLLMResponse)),
      });

      // Mock evaluation run retrieval
      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.KNOWLEDGE_RETENTION,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          results: {
            total_logs: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.9,
            threshold_used: 0.6,
            evaluation_outputs: ['existing-output-id'],
          },
          metadata: {
            parameters: {
              threshold: 0.6,
              model: 'gpt-4o',
              temperature: 0.1,
              max_tokens: 1000,
              timeout: 3000,
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
          score: 0.8,
          reasoning: 'Good knowledge retention demonstrated',
          passed: true,
          threshold: 0.6,
          knowledgeRetention: {
            retentionAccuracy: 0.9,
            contextConsistency: 0.8,
          },
        },
        score: 0.8,
        metadata: {
          knowledgeRetention: {
            extractedKnowledge: ['User likes pizza'],
            assistantTurnsWithoutAttrition: 1,
            totalAssistantTurns: 1,
            retentionAccuracy: 0.9,
            contextConsistency: 0.8,
          },
        },
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
          metadata: {
            knowledgeRetention: {
              retentionAccuracy: 0.95,
              contextConsistency: 0.9,
              totalAssistantTurns: 1,
              assistantTurnsWithoutAttrition: 1,
            },
          },
          created_at: new Date().toISOString(),
          evaluation_run_id: '',
        },
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.8,
          metadata: {
            knowledgeRetention: {
              retentionAccuracy: 0.9,
              contextConsistency: 0.8,
              totalAssistantTurns: 1,
              assistantTurnsWithoutAttrition: 1,
            },
          },
          created_at: new Date().toISOString(),
          evaluation_run_id: '',
        },
      ]);

      // Mock evaluation run update
      mockedUpdateEvaluationRun.mockResolvedValue(
        {} as unknown as EvaluationRun,
      );

      await evaluateOneLogForKnowledgeRetention(
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
          score: 0.8,
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
            average_score: expect.closeTo(0.85, 0.01), // Account for floating point precision
            threshold_used: 0.6,
            average_retention_accuracy: 0.925, // (0.95 + 0.9) / 2
            average_context_consistency: expect.closeTo(0.85, 0.01), // Account for floating point precision
            total_assistant_turns: 2,
            assistant_turns_without_attrition: 2,
            overall_retention_rate: 1.0, // 2/2
          }),
          metadata: expect.objectContaining({
            total_logs: 2,
            passed_count: 2,
            failed_count: 0,
            average_score: expect.closeTo(0.85, 0.01), // Account for floating point precision
            threshold_used: 0.6,
          }),
        }),
      );
    });

    it('should handle threshold checking with knowledge retention threshold', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        agent_id: 'test-agent-id',
        skill_id: 'test-skill-id',
        method: 'POST',
        endpoint: '/v1/chat/completions',
        function_name: 'chat-complete',
        status: 200,
        start_time: Date.now(),
        end_time: Date.now() + 1000,
        duration: 1000,
        base_idk_config: {},
        ai_provider: 'openai',
        model: 'gpt-4o',
        ai_provider_request_log: {
          provider: 'openai',
          function_name: 'create_model_response',
          method: 'POST',
          request_url: 'http://localhost:3000/v1/responses',
          status: 200,
          request_body: {
            model: 'gpt-4o',
            input: [{ role: 'user', content: 'What did I tell you earlier?' }],
          },
          response_body: {
            id: 'resp-456',
            object: 'response',
            created_at: Date.now(),
            error: null,
            incomplete_details: null,
            instructions: null,
            metadata: null,
            model: 'gpt-4o',
            output: [
              {
                id: 'msg-456',
                type: 'message',
                role: 'assistant',
                content: [
                  {
                    annotations: [],
                    text: "I'm not sure what you're referring to.",
                    type: 'output_text',
                  },
                ],
              },
            ],
            parallel_tool_calls: null,
            previous_response_id: null,
            reasoning: null,
            temperature: null,
            tools: [],
            usage: {
              input_tokens: 8,
              output_tokens: 10,
              total_tokens: 18,
              output_tokens_details: {
                reasoning_tokens: 0,
              },
            },
            user: null,
          },
          raw_request_body: '{}',
          raw_response_body: '{}',
          cache_mode: 'enabled',
          cache_status: 'miss',
        },
        hook_logs: [],
        metadata: {},
        embedding: null,
        cache_status: 'miss',
        trace_id: null,
        parent_span_id: null,
        span_id: null,
        span_name: null,
        app_id: null,
        external_user_id: null,
        external_user_human_name: null,
        user_metadata: null,
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
                    'Assistant failed to retain previously mentioned information.',
                  metadata: {
                    knowledgeRetention: {
                      retentionAccuracy: 0.2,
                      contextConsistency: 0.3,
                      totalAssistantTurns: 1,
                      assistantTurnsWithoutAttrition: 0,
                    },
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
        text: () => Promise.resolve(JSON.stringify(mockLLMResponse)),
      });

      mockedGetEvaluationRuns.mockResolvedValue([
        {
          id: evaluationRunId,
          dataset_id: 'test-dataset-id',
          agent_id: 'test-agent-id',
          skill_id: 'test-skill-id',
          evaluation_method: EvaluationMethodName.KNOWLEDGE_RETENTION,
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
        score: 0.3,
        metadata: {
          knowledgeRetention: {
            retentionAccuracy: 0.2,
            contextConsistency: 0.3,
            totalAssistantTurns: 1,
            assistantTurnsWithoutAttrition: 0,
          },
        },
        created_at: new Date().toISOString(),
        evaluation_run_id: '',
      });

      mockedGetLogOutputs.mockResolvedValue([
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.3,
          metadata: {
            knowledgeRetention: {
              retentionAccuracy: 0.2,
              contextConsistency: 0.3,
              totalAssistantTurns: 1,
              assistantTurnsWithoutAttrition: 0,
            },
          },
          created_at: new Date().toISOString(),
          evaluation_run_id: '',
        },
      ]);

      mockedUpdateEvaluationRun.mockResolvedValue(
        {} as unknown as EvaluationRun,
      );

      await evaluateOneLogForKnowledgeRetention(
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
            average_retention_accuracy: 0.2,
            average_context_consistency: 0.3,
            total_assistant_turns: 1,
            assistant_turns_without_attrition: 0,
            overall_retention_rate: 0.0, // 0/1
          }),
        }),
      );
    });

    it('should handle evaluation run not found error', async () => {
      const evaluationRunId = 'non-existent-run-id';
      const mockLog = {
        id: 'test-log-id',
        input: 'test input',
        output: 'test output',
      } as unknown as IdkRequestLog;

      mockedGetEvaluationRuns.mockResolvedValue([]);

      await expect(
        evaluateOneLogForKnowledgeRetention(
          evaluationRunId,
          mockLog,
          mockUserDataStorageConnector,
        ),
      ).rejects.toThrow(`Evaluation run ${evaluationRunId} not found`);
    });
  });
});
