import { conversationCompletenessEvaluationConnector } from '@server/connectors/evaluations/conversation-completeness/conversation-completeness';
import { evaluateOneLogForConversationCompleteness } from '@server/connectors/evaluations/conversation-completeness/service/evaluate';
import type { UserDataStorageConnector } from '@server/types/connector';
import {
  type EvaluationRun,
  EvaluationRunStatus,
} from '@shared/types/data/evaluation-run';
import type { ConversationCompletenessEvaluationParameters } from '@shared/types/idkhub/evaluations/conversation-completeness';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
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

describe('Conversation Completeness Evaluation', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    vi.clearAllMocks();
  });

  it('should have correct connector configuration', () => {
    const details = conversationCompletenessEvaluationConnector.getDetails();

    expect(details.method).toBe(EvaluationMethodName.CONVERSATION_COMPLETENESS);
    expect(details.name).toBe('Conversation Completeness');
    expect(details.description).toContain(
      'Evaluates how well an AI assistant completes conversations',
    );
  });

  it('should have parameter schema', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    expect(schema).toBeDefined();
    expect(typeof schema.safeParse).toBe('function');
  });

  it('should validate parameters correctly', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    const validParams = {
      threshold: 0.7,
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 1000,
      timeout: 30000,
      include_reason: true,
      strict_mode: false,
      async_mode: true,
      verbose_mode: false,
      batch_size: 10,
    };

    const result = schema.safeParse(validParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBe(0.7);
      expect(result.data.model).toBe('gpt-4o-mini');
    }
  });

  it('should reject invalid parameters', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid threshold (should be between 0 and 1)
    const invalidThreshold = {
      threshold: 1.5,
      model: 'gpt-4o-mini',
    };

    const result = schema.safeParse(invalidThreshold);
    expect(result.success).toBe(false);
  });

  it('should use default values when fields are not provided', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    const minimalParams = {
      threshold: 0.8,
    };

    const result = schema.safeParse(minimalParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBe(0.8);
      expect(result.data.model).toBe('gpt-4');
      expect(result.data.temperature).toBe(0.1);
      expect(result.data.include_reason).toBe(true);
    }
  });

  it('should require at least threshold when validating', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Empty object should fail because threshold is required
    const emptyParams = {};

    const result = schema.safeParse(emptyParams);
    expect(result.success).toBe(false);
  });

  it('should accept minimal parameters with defaults applied', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    const minimalParams = {
      threshold: 0.6,
    };

    const result = schema.safeParse(minimalParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBe(0.6);
      expect(result.data.model).toBe('gpt-4');
      expect(result.data.temperature).toBe(0.1);
      expect(result.data.timeout).toBe(30000);
    }
  });

  it('should validate temperature range', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Temperature too high
    const highTemp = {
      temperature: 3.0,
    };

    const result = schema.safeParse(highTemp);
    expect(result.success).toBe(false);
  });

  it('should validate max_tokens as positive integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid max_tokens
    const invalidTokens = {
      max_tokens: -100,
    };

    const result = schema.safeParse(invalidTokens);
    expect(result.success).toBe(false);
  });

  it('should validate timeout as positive integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid timeout
    const invalidTimeout = {
      timeout: 0,
    };

    const result = schema.safeParse(invalidTimeout);
    expect(result.success).toBe(false);
  });

  it('should validate batch_size as positive integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid batch_size
    const invalidBatchSize = {
      batch_size: 0,
    };

    const result = schema.safeParse(invalidBatchSize);
    expect(result.success).toBe(false);
  });

  it('should validate limit as positive integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid limit
    const invalidLimit = {
      limit: -10,
    };

    const result = schema.safeParse(invalidLimit);
    expect(result.success).toBe(false);
  });

  it('should validate offset as non-negative integer', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;

    // Invalid offset
    const invalidOffset = {
      offset: -5,
    };

    const result = schema.safeParse(invalidOffset);
    expect(result.success).toBe(false);
  });

  it('should handle boolean parameters correctly', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema as z.ZodType<
        unknown,
        unknown,
        z.core.$ZodTypeInternals<
          ConversationCompletenessEvaluationParameters,
          ConversationCompletenessEvaluationParameters
        >
      >;
    const booleanParams = {
      threshold: 0.5,
      include_reason: true,
      strict_mode: false,
      async_mode: true,
      verbose_mode: false,
    };

    const result = schema.safeParse(booleanParams);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_reason).toBe(true);
      expect(result.data.strict_mode).toBe(false);
      expect(result.data.async_mode).toBe(true);
      expect(result.data.verbose_mode).toBe(false);
    }
  });

  it('should reject unknown parameters', () => {
    const schema =
      conversationCompletenessEvaluationConnector.getParameterSchema;
    const unknownParams = {
      threshold: 0.7,
      unknown_field: 'should be rejected',
    };

    const result = schema.safeParse(unknownParams);
    expect(result.success).toBe(false);
  });

  describe('evaluateOneLogForConversationCompleteness', () => {
    it('should evaluate a single log and update evaluation run statistics', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        input: 'User wants help with their project',
        output:
          'I can help you with your project. What specifically do you need?',
        ai_provider_request_log: {
          request_body: {
            context: 'User conversation about project help',
          },
        },
        metadata: {
          ground_truth: {
            text: 'Helpful response that addresses user needs',
          },
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
                  score: 0.8,
                  reasoning:
                    'The conversation shows good completeness with relevant follow-up questions.',
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
          evaluation_method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
          name: 'Test Evaluation Run',
          description: 'Test description',
          status: EvaluationRunStatus.RUNNING,
          results: {
            total_logs: 1,
            passed_count: 1,
            failed_count: 0,
            average_score: 0.9,
            threshold_used: 0.5,
            evaluation_outputs: ['existing-output-id'],
          },
          metadata: {
            parameters: {
              threshold: 0.5,
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
          score: 0.8,
          reasoning: 'The conversation shows good completeness',
          passed: true,
          threshold: 0.5,
        },
        score: 0.8,
        metadata: {},
        created_at: new Date().toISOString(),
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
        },
        {
          id: 'new-output-id',
          log_id: 'test-log-id',
          output: {},
          score: 0.8,
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ]);

      // Mock evaluation run update
      mockedUpdateEvaluationRun.mockResolvedValue(
        {} as unknown as EvaluationRun,
      );

      await evaluateOneLogForConversationCompleteness(
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
            threshold_used: 0.5,
          }),
          metadata: expect.objectContaining({
            total_logs: 2,
            passed_count: 2,
            failed_count: 0,
            average_score: expect.closeTo(0.85, 0.01), // Account for floating point precision
            threshold_used: 0.5,
          }),
        }),
      );
    });

    it('should handle threshold checking correctly', async () => {
      const evaluationRunId = 'test-evaluation-run-id';
      const mockLog = {
        id: 'test-log-id',
        input: 'Simple question',
        output: 'Simple answer',
        ai_provider_request_log: {
          request_body: { context: 'Simple conversation' },
        },
        metadata: {
          ground_truth: { text: 'Simple answer that lacks depth' },
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
                  reasoning: 'Conversation lacks depth and completeness',
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
          evaluation_method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
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

      await evaluateOneLogForConversationCompleteness(
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
        input: 'test input',
        output: 'test output',
      } as unknown as IdkRequestLog;

      mockedGetEvaluationRuns.mockResolvedValue([]);

      await expect(
        evaluateOneLogForConversationCompleteness(
          evaluationRunId,
          mockLog,
          mockUserDataStorageConnector,
        ),
      ).rejects.toThrow(`Evaluation run ${evaluationRunId} not found`);
    });
  });
});
