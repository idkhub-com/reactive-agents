import type { UserDataStorageConnector } from '@server/types/connector';
import type { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { EvaluationStatistics } from './statistics';

/**
 * Common fields that should be included in both results and metadata
 */
interface BaseEvaluationResults {
  total_logs: number;
  passed_count: number;
  failed_count: number;
  average_score: number;
  threshold_used: number;
  evaluation_outputs: string[];
}

/**
 * Options for updating an evaluation run
 */
export interface UpdateEvaluationRunOptions {
  evaluationRunId: string;
  statistics: EvaluationStatistics;
  threshold: number;
  evaluationOutputIds: string[];
  userDataStorageConnector: UserDataStorageConnector;
  additionalResults?: Record<string, unknown>;
  additionalMetadata?: Record<string, unknown>;
  preserveExistingResults?: boolean;
  status?: EvaluationRunStatus;
  completedAt?: string;
}

/**
 * Update an evaluation run with statistics and preserve existing data
 */
export async function updateEvaluationRunWithStatistics(
  options: UpdateEvaluationRunOptions,
): Promise<void> {
  const {
    evaluationRunId,
    statistics,
    threshold,
    evaluationOutputIds,
    userDataStorageConnector,
    additionalResults = {},
    additionalMetadata = {},
    preserveExistingResults = true,
    status,
    completedAt,
  } = options;

  // Get existing evaluation run data if we need to preserve it
  let existingResults = {};
  let existingMetadata = {};

  if (preserveExistingResults) {
    const evaluationRuns = await userDataStorageConnector.getEvaluationRuns({
      id: evaluationRunId,
    });
    const evaluationRun = evaluationRuns[0];
    if (evaluationRun) {
      existingResults = evaluationRun.results || {};
      existingMetadata = evaluationRun.metadata || {};
    }
  }

  const baseResults: BaseEvaluationResults = {
    total_logs: statistics.totalLogs,
    passed_count: statistics.passedCount,
    failed_count: statistics.failedCount,
    average_score: statistics.averageScore,
    threshold_used: threshold,
    evaluation_outputs: evaluationOutputIds,
  };

  // Build the update object
  const updateData: Record<string, unknown> = {
    results: {
      ...existingResults,
      ...baseResults,
      ...additionalResults,
    },
    metadata: {
      ...existingMetadata,
      ...baseResults,
      ...additionalMetadata,
      ...(completedAt && { completed_at: completedAt }),
    },
  };

  // Add status if provided
  if (status) {
    updateData.status = status;
  }

  // Add completed_at if provided
  if (completedAt) {
    updateData.completed_at = completedAt;
  }

  await userDataStorageConnector.updateEvaluationRun(
    evaluationRunId,
    updateData,
  );
}
