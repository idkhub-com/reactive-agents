import { evaluateLog } from '@server/connectors/evaluations/task-completion/service/evaluate';
import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { SkillOptimizationEvaluation } from '@shared/types/data';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the constants
vi.mock('@server/constants', () => ({
  OPENAI_API_KEY: 'test-api-key',
  API_URL: 'http://localhost:3000',
  BEARER_TOKEN: 'reactive-agents',
}));

// Mock OpenAI client
const mockParse = vi.fn();
const mockWithOptions = vi.fn().mockReturnValue({
  chat: {
    completions: {
      parse: mockParse,
    },
  },
});

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          parse: mockParse,
        },
      },
      withOptions: mockWithOptions,
    })),
  };
});

// Mock the extractTaskAndOutcome function to avoid OpenAI client initialization
vi.mock(
  '@server/connectors/evaluations/task-completion/service/task-and-outcome',
  () => ({
    extractTaskAndOutcome: vi.fn().mockResolvedValue({
      task: 'Book a flight to Paris',
      outcome: 'Flight booked successfully',
    }),
  }),
);

describe('Task Completion - evaluateLog', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();

    // Setup default successful mock for OpenAI parse
    mockParse.mockResolvedValue({
      choices: [
        {
          message: {
            parsed: {
              score: 1.0,
              reasoning: 'Evaluation successful',
            },
          },
        },
      ],
    });
  });

  it('should evaluate task completion successfully', async () => {
    const mockEvaluation: SkillOptimizationEvaluation = {
      id: 'eval-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      params: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1000,
        task: 'Book a flight to Paris',
        strict_mode: false,
      },
      weight: 1.0,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const mockLog: Log = {
      id: 'log-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      cluster_id: null,
      method: HttpMethod.POST,
      endpoint: '/v1/chat/completions',
      function_name: FunctionName.CHAT_COMPLETE,
      status: 200,
      start_time: 1677652288000,
      first_token_time: null,
      end_time: 1677652289000,
      duration: 1000,
      base_ra_config: {},
      ai_provider: AIProvider.OPENAI,
      model: 'gpt-4',
      hook_logs: [],
      cache_status: CacheStatus.MISS,
      embedding: null,
      trace_id: null,
      parent_span_id: null,
      span_id: null,
      span_name: null,
      app_id: null,
      external_user_id: null,
      external_user_human_name: null,
      user_metadata: null,
      metadata: {},
      ai_provider_request_log: {
        provider: AIProvider.OPENAI,
        function_name: FunctionName.CHAT_COMPLETE,
        method: HttpMethod.POST,
        request_url: 'https://api.openai.com/v1/chat/completions',
        request_body: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Book a flight to Paris' }],
        },
        response_body: {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'I have booked your flight to Paris for tomorrow.',
              },
              finish_reason: 'stop',
            },
          ],
        },
        raw_request_body: '{}',
        raw_response_body: '{}',
        status: 200,
        cache_mode: CacheMode.DISABLED,
        cache_status: CacheStatus.MISS,
      },
    };

    // Mock verdict generation API call (extractTaskAndOutcome is mocked above)
    const mockVerdictResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 1.0,
                reasoning: 'Task completed successfully',
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockVerdictResponse)),
      json: () => Promise.resolve(mockVerdictResponse),
    });

    const result = await evaluateLog(mockEvaluation, mockLog);

    expect(result.method).toBe(EvaluationMethodName.TASK_COMPLETION);
    expect(result.score).toBe(1.0);
    expect(result.extra_data).toHaveProperty('task');
    expect(result.extra_data).toHaveProperty('outcome');
    expect(result.extra_data).toHaveProperty('execution_time');
  });

  it('should handle incomplete tasks', async () => {
    // Override default mock with score of 0 for incomplete task
    mockParse.mockResolvedValueOnce({
      choices: [
        {
          message: {
            parsed: {
              score: 0.0,
              reasoning: 'Task incomplete',
            },
          },
        },
      ],
    });

    const mockEvaluation: SkillOptimizationEvaluation = {
      id: 'eval-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      params: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1000,
        task: 'Book a flight to Paris',
        strict_mode: false,
      },
      weight: 1.0,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };

    const mockLog: Log = {
      id: 'log-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      cluster_id: null,
      method: HttpMethod.POST,
      endpoint: '/v1/chat/completions',
      function_name: FunctionName.CHAT_COMPLETE,
      status: 200,
      start_time: 1677652288000,
      first_token_time: null,
      end_time: 1677652289000,
      duration: 1000,
      base_ra_config: {},
      ai_provider: AIProvider.OPENAI,
      model: 'gpt-4',
      hook_logs: [],
      cache_status: CacheStatus.MISS,
      embedding: null,
      trace_id: null,
      parent_span_id: null,
      span_id: null,
      span_name: null,
      app_id: null,
      external_user_id: null,
      external_user_human_name: null,
      user_metadata: null,
      metadata: {},
      ai_provider_request_log: {
        provider: AIProvider.OPENAI,
        function_name: FunctionName.CHAT_COMPLETE,
        method: HttpMethod.POST,
        request_url: 'https://api.openai.com/v1/chat/completions',
        request_body: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Book a flight to Paris' }],
        },
        response_body: {
          id: 'chatcmpl-124',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'I need more information to book your flight.',
              },
              finish_reason: 'stop',
            },
          ],
        },
        raw_request_body: '{}',
        raw_response_body: '{}',
        status: 200,
        cache_mode: CacheMode.DISABLED,
        cache_status: CacheStatus.MISS,
      },
    };

    const mockVerdictResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.0,
                reasoning: 'Task not completed, more information needed',
              }),
            },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(mockVerdictResponse)),
      json: () => Promise.resolve(mockVerdictResponse),
    });

    const result = await evaluateLog(mockEvaluation, mockLog);

    expect(result.method).toBe(EvaluationMethodName.TASK_COMPLETION);
    expect(result.score).toBe(0.0);
  });
});
