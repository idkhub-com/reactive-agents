import type { EvaluationMethodConnector } from '@server/types/connector';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

/**
 * Run realtime evaluations for a single log using skill optimization evaluations
 */
export async function runEvaluationsForLog(
  log: IdkRequestLog,
  skillOptimizationEvaluations: SkillOptimizationEvaluation[],
  evaluationConnectorsMap: Partial<
    Record<EvaluationMethodName, EvaluationMethodConnector>
  >,
): Promise<SkillOptimizationEvaluationResult[]> {
  if (skillOptimizationEvaluations.length === 0) {
    return [];
  }

  console.log(
    `Triggering skill optimization evaluations for log ${log.id}: ${skillOptimizationEvaluations.length} evaluation(s)`,
  );

  // Execute all evaluations in parallel for better performance
  const evaluationPromises = skillOptimizationEvaluations.map(
    async (evaluation) => {
      try {
        const connector = evaluationConnectorsMap[evaluation.evaluation_method];
        if (!connector || !connector.evaluateLog) {
          console.warn(
            `No connector found for evaluation method: ${evaluation.evaluation_method}`,
          );
          return;
        }

        // Use the evaluation ID for skill optimization evaluations
        return await connector.evaluateLog(evaluation, log);
      } catch (error) {
        console.error(
          `Error in skill optimization evaluation ${evaluation.evaluation_method} for log ${log.id}:`,
          error,
        );
        // Don't throw - we want other evaluations to continue even if one fails
      }
    },
  );

  try {
    return (await Promise.allSettled(evaluationPromises))
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter(
        (value): value is SkillOptimizationEvaluationResult =>
          value !== undefined,
      );
  } catch (e) {
    if (e instanceof Error) {
      throw new Error('Error in skill optimization evaluations batch:', e);
    }
    throw new Error(
      'Error in skill optimization evaluations batch: unknown error',
    );
  }
}

/**
 * Check if a request should trigger realtime evaluations
 */
export function shouldTriggerRealtimeEvaluation(
  status: number,
  url: URL,
): boolean {
  // Only trigger on successful responses
  if (status !== 200) {
    return false;
  }

  // Only evaluate actual AI provider calls, not internal IDK API calls
  if (!url.pathname.startsWith('/v1/')) {
    return false;
  }

  // Don't evaluate IDK internal API calls
  if (url.pathname.startsWith('/v1/idk')) {
    return false;
  }

  return true;
}
