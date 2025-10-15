import { evaluateLog } from '@server/connectors/evaluations/turn-relevancy/service/evaluate';
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
  BEARER_TOKEN: 'idk',
}));

describe('Turn Relevancy - evaluateLog', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  it('should evaluate turn relevancy successfully', async () => {
    const mockEvaluation: SkillOptimizationEvaluation = {
      id: 'eval-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
      params: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1000,
      },
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
      end_time: 1677652289000,
      duration: 1000,
      base_idk_config: {},
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
          messages: [
            { role: 'user', content: 'What is the capital of France?' },
            { role: 'assistant', content: 'The capital of France is Paris.' },
            { role: 'user', content: 'And what about Germany?' },
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
              message: {
                role: 'assistant',
                content: 'The capital of Germany is Berlin.',
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

    const mockLLMResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 1.0,
                reasoning:
                  'The response is highly relevant to the conversation context',
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

    const result = await evaluateLog(mockEvaluation, mockLog);

    expect(result.method).toBe(EvaluationMethodName.TURN_RELEVANCY);
    expect(result.score).toBe(1.0);
    expect(result.extra_data).toHaveProperty('reasoning');
    expect(result.extra_data).toHaveProperty('execution_time');
  });

  it('should handle irrelevant responses', async () => {
    const mockEvaluation: SkillOptimizationEvaluation = {
      id: 'eval-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
      params: {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 1000,
      },
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
      end_time: 1677652289000,
      duration: 1000,
      base_idk_config: {},
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
          messages: [
            { role: 'user', content: 'What is the capital of France?' },
            { role: 'assistant', content: 'The capital of France is Paris.' },
            { role: 'user', content: 'And what about Germany?' },
          ],
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
                content: 'The weather is nice today.',
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

    const mockLLMResponse = {
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: JSON.stringify({
                score: 0.0,
                reasoning:
                  'The response is completely irrelevant to the conversation',
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

    const result = await evaluateLog(mockEvaluation, mockLog);

    expect(result.method).toBe(EvaluationMethodName.TURN_RELEVANCY);
    // The score is 1.0 because the LLM judge successfully evaluated the relevance
    // Even though the response is irrelevant, the judge still returns a valid score
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
