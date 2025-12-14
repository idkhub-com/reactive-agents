import { LatencyEvaluationParameters } from '@server/connectors/evaluations/latency/types';
import type { UserDataStorageConnector } from '@server/types/connector';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';

/**
 * Calculate latency score based on measured latency and thresholds
 *
 * Score formula:
 * - If latency <= target: score = 1.0
 * - If latency >= max: score = 0.0
 * - Otherwise: linear interpolation between 1.0 and 0.0
 */
function calculateLatencyScore(
  latency_ms: number,
  target_latency_ms: number,
  max_latency_ms: number,
): number {
  if (latency_ms <= target_latency_ms) {
    return 1.0;
  }
  if (latency_ms >= max_latency_ms) {
    return 0.0;
  }

  // Linear interpolation between target and max
  const range = max_latency_ms - target_latency_ms;
  const position = latency_ms - target_latency_ms;
  return 1.0 - position / range;
}

/**
 * Extract latency from log
 *
 * For streaming requests with first_token_time: Uses TTFT (first_token_time - start_time)
 * Otherwise: Uses total duration as proxy
 */
function extractLatency(log: Log): number | null {
  // If we have first_token_time, use it for precise TTFT measurement
  if (log.first_token_time !== null && log.first_token_time !== undefined) {
    return log.first_token_time - log.start_time;
  }

  // Fallback to duration for non-streaming or if first_token_time wasn't captured
  return log.duration;
}

export function evaluateLog(
  evaluation: SkillOptimizationEvaluation,
  log: Log,
  _storageConnector: UserDataStorageConnector,
): Promise<SkillOptimizationEvaluationResult> {
  const start_time = Date.now();

  try {
    const params = LatencyEvaluationParameters.parse(evaluation.params);

    const latency_ms = extractLatency(log);

    // If we couldn't extract latency, return 0.5 (neutral score)
    if (latency_ms === null) {
      const execution_time = Date.now() - start_time;
      return Promise.resolve({
        evaluation_id: evaluation.id,
        method: EvaluationMethodName.LATENCY,
        score: 0.5,
        extra_data: {
          error: 'Could not extract latency from log',
          execution_time,
        },
        display_info: [
          {
            label: 'Error',
            content: 'Could not extract latency from log',
          },
        ],
        judge_model_name: null,
        judge_model_provider: null,
      });
    }

    const score = calculateLatencyScore(
      latency_ms,
      params.target_latency_ms,
      params.max_latency_ms,
    );

    const execution_time = Date.now() - start_time;

    // Format latency performance for display
    const latencyType =
      log.first_token_time !== null
        ? 'Time to First Token (TTFT)'
        : 'Total Response Time';

    const performance =
      latency_ms <= params.target_latency_ms
        ? '✓ Excellent - Below target'
        : latency_ms >= params.max_latency_ms
          ? '✗ Poor - Exceeds maximum'
          : '⚠ Acceptable - Between target and maximum';

    const result: SkillOptimizationEvaluationResult = {
      evaluation_id: evaluation.id,
      method: EvaluationMethodName.LATENCY,
      score,
      extra_data: {
        latency_ms,
        target_latency_ms: params.target_latency_ms,
        max_latency_ms: params.max_latency_ms,
        has_first_token_time: log.first_token_time !== null,
        execution_time,
      },
      display_info: [
        {
          label: 'Performance',
          content: performance,
        },
        {
          label: 'Latency Measurement',
          content: `${latencyType}: ${latency_ms}ms\nTarget: ${params.target_latency_ms}ms\nMaximum: ${params.max_latency_ms}ms\nScore: ${(score * 100).toFixed(1)}%`,
        },
      ],
      judge_model_name: null,
      judge_model_provider: null,
    };

    return Promise.resolve(result);
  } catch (err) {
    const execution_time = Date.now() - start_time;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return Promise.resolve({
      evaluation_id: evaluation.id,
      method: EvaluationMethodName.LATENCY,
      score: 0.5,
      extra_data: {
        error: errorMessage,
        execution_time,
      },
      display_info: [
        {
          label: 'Error',
          content: errorMessage,
        },
      ],
      judge_model_name: null,
      judge_model_provider: null,
    });
  }
}
