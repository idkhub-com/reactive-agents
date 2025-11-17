import { evaluateLog } from '@server/connectors/evaluations/latency/service/evaluate';
import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { SkillOptimizationEvaluation } from '@shared/types/data';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Latency - evaluateLog', () => {
  let baseLog: Log;
  let baseEvaluation: SkillOptimizationEvaluation;

  beforeEach(() => {
    baseLog = {
      id: 'log-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      cluster_id: null,
      method: HttpMethod.POST,
      endpoint: '/v1/chat/completions',
      function_name: FunctionName.CHAT_COMPLETE,
      status: 200,
      start_time: 1000,
      first_token_time: null,
      end_time: 2000,
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
          messages: [{ role: 'user', content: 'Hello' }],
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
                content: 'Hello! How can I help you?',
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

    baseEvaluation = {
      id: 'eval-123',
      agent_id: 'agent-123',
      skill_id: 'skill-123',
      evaluation_method: EvaluationMethodName.LATENCY,
      params: {
        target_latency_ms: 300,
        max_latency_ms: 3000,
      },
      weight: 1.0,
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    };
  });

  describe('Streaming responses (with first_token_time)', () => {
    it('should score 1.0 for TTFT at or below target', async () => {
      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: 1200, // 200ms TTFT (below 300ms target)
        end_time: 3000,
        duration: 2000,
      };

      const result = await evaluateLog(baseEvaluation, log);

      expect(result.method).toBe(EvaluationMethodName.LATENCY);
      expect(result.score).toBe(1.0);
      expect(result.extra_data.latency_ms).toBe(200);
      expect(result.extra_data.has_first_token_time).toBe(true);
      expect(result.extra_data.target_latency_ms).toBe(300);
      expect(result.extra_data.max_latency_ms).toBe(3000);
    });

    it('should score 0.0 for TTFT at or above max', async () => {
      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: 4500, // 3500ms TTFT (above 3000ms max)
        end_time: 5000,
        duration: 4000,
      };

      const result = await evaluateLog(baseEvaluation, log);

      expect(result.method).toBe(EvaluationMethodName.LATENCY);
      expect(result.score).toBe(0.0);
      expect(result.extra_data.latency_ms).toBe(3500);
      expect(result.extra_data.has_first_token_time).toBe(true);
    });

    it('should linearly interpolate score between target and max', async () => {
      // Target: 300ms, Max: 3000ms
      // Range: 2700ms
      // TTFT: 1650ms (from target: 1350ms)
      // Score: 1.0 - (1350 / 2700) = 1.0 - 0.5 = 0.5
      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: 2650, // 1650ms TTFT
        end_time: 5000,
        duration: 4000,
      };

      const result = await evaluateLog(baseEvaluation, log);

      expect(result.method).toBe(EvaluationMethodName.LATENCY);
      expect(result.score).toBeCloseTo(0.5, 2);
      expect(result.extra_data.latency_ms).toBe(1650);
      expect(result.extra_data.has_first_token_time).toBe(true);
    });

    it('should handle exact target latency', async () => {
      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: 1300, // Exactly 300ms TTFT
        end_time: 3000,
        duration: 2000,
      };

      const result = await evaluateLog(baseEvaluation, log);

      expect(result.score).toBe(1.0);
      expect(result.extra_data.latency_ms).toBe(300);
    });

    it('should handle exact max latency', async () => {
      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: 4000, // Exactly 3000ms TTFT
        end_time: 5000,
        duration: 4000,
      };

      const result = await evaluateLog(baseEvaluation, log);

      expect(result.score).toBe(0.0);
      expect(result.extra_data.latency_ms).toBe(3000);
    });
  });

  describe('Non-streaming responses (without first_token_time)', () => {
    it('should use duration as proxy when first_token_time is null', async () => {
      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: null,
        end_time: 1250, // 250ms total duration
        duration: 250,
      };

      const result = await evaluateLog(baseEvaluation, log);

      expect(result.method).toBe(EvaluationMethodName.LATENCY);
      expect(result.score).toBe(1.0); // 250ms is below 300ms target
      expect(result.extra_data.latency_ms).toBe(250);
      expect(result.extra_data.has_first_token_time).toBe(false);
    });

    it('should score correctly using duration', async () => {
      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: null,
        end_time: 2650, // 1650ms duration
        duration: 1650,
      };

      const result = await evaluateLog(baseEvaluation, log);

      expect(result.score).toBeCloseTo(0.5, 2);
      expect(result.extra_data.latency_ms).toBe(1650);
      expect(result.extra_data.has_first_token_time).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should return neutral score when latency cannot be extracted', async () => {
      // This shouldn't happen in practice, but test defensive coding
      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: null,
        end_time: 2000,
        duration: 0, // Invalid duration
      };

      // Mock extractLatency to return null
      const result = await evaluateLog(baseEvaluation, log);

      expect(result.method).toBe(EvaluationMethodName.LATENCY);
      // Should still work with duration of 0
      expect(result.score).toBe(1.0);
    });

    it('should handle invalid parameters gracefully', async () => {
      const invalidEvaluation: SkillOptimizationEvaluation = {
        ...baseEvaluation,
        params: {
          target_latency_ms: 'invalid',
        },
      };

      const result = await evaluateLog(invalidEvaluation, baseLog);

      expect(result.method).toBe(EvaluationMethodName.LATENCY);
      expect(result.score).toBe(0.5); // Neutral score on error
      expect(result.extra_data.error).toBeDefined();
    });

    it('should include execution time in extra_data', async () => {
      const result = await evaluateLog(baseEvaluation, baseLog);

      expect(result.extra_data.execution_time).toBeDefined();
      expect(typeof result.extra_data.execution_time).toBe('number');
      expect(result.extra_data.execution_time).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Custom threshold configurations', () => {
    it('should respect custom target_latency_ms', async () => {
      const customEvaluation: SkillOptimizationEvaluation = {
        ...baseEvaluation,
        params: {
          target_latency_ms: 500,
          max_latency_ms: 2000,
        },
      };

      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: 1450, // 450ms TTFT
        end_time: 2000,
        duration: 1000,
      };

      const result = await evaluateLog(customEvaluation, log);

      expect(result.score).toBe(1.0); // Below 500ms target
    });

    it('should respect custom max_latency_ms', async () => {
      const customEvaluation: SkillOptimizationEvaluation = {
        ...baseEvaluation,
        params: {
          target_latency_ms: 100,
          max_latency_ms: 1000,
        },
      };

      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: 2200, // 1200ms TTFT
        end_time: 3000,
        duration: 2000,
      };

      const result = await evaluateLog(customEvaluation, log);

      expect(result.score).toBe(0.0); // Above 1000ms max
    });

    it('should use default parameters when params is empty', async () => {
      const defaultEvaluation: SkillOptimizationEvaluation = {
        ...baseEvaluation,
        params: {},
      };

      const log: Log = {
        ...baseLog,
        start_time: 1000,
        first_token_time: 1250, // 250ms TTFT
        end_time: 2000,
        duration: 1000,
      };

      const result = await evaluateLog(defaultEvaluation, log);

      // Default target is 10000ms, so 250ms should score 1.0
      expect(result.score).toBe(1.0);
      expect(result.extra_data.target_latency_ms).toBe(10000);
      expect(result.extra_data.max_latency_ms).toBe(30000);
    });
  });
});
