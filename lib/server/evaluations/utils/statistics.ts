import type { LogOutput } from '@shared/types/data/log-output';

/**
 * Basic evaluation statistics calculated from log outputs
 */
export interface EvaluationStatistics {
  totalLogs: number;
  averageScore: number;
  passedCount: number;
  failedCount: number;
  scores: number[];
}

/**
 * Calculate basic evaluation statistics from log outputs
 */
export function calculateEvaluationStatistics(
  logOutputs: LogOutput[],
  threshold: number,
): EvaluationStatistics {
  // Filter out null/undefined scores
  const scores = logOutputs
    .map((output) => output.score)
    .filter((score): score is number => score !== null && score !== undefined);

  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;

  const passedCount = scores.filter((score) => score >= threshold).length;
  const failedCount = scores.length - passedCount;

  return {
    totalLogs: logOutputs.length,
    averageScore,
    passedCount,
    failedCount,
    scores,
  };
}

/**
 * Extract evaluation outputs IDs from log outputs
 */
export function extractEvaluationOutputIds(logOutputs: LogOutput[]): string[] {
  return logOutputs.map((output) => output.id);
}
