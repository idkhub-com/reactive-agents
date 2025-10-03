import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { LogOutput } from '@shared/types/data';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

/**
 * Find active realtime evaluation runs for a given agent and skill
 */
export async function findRealtimeEvaluations(
  agentId: string,
  skillId: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun[]> {
  try {
    // First, find realtime datasets for this agent
    const realtimeDatasets = await userDataStorageConnector.getDatasets({
      agent_id: agentId,
      is_realtime: true,
    });

    if (realtimeDatasets.length === 0) {
      return [];
    }

    // Get all active evaluation runs for these datasets and the specific skill
    const evaluationRunPromises = realtimeDatasets.map((dataset) =>
      userDataStorageConnector.getEvaluationRuns({
        dataset_id: dataset.id,
        agent_id: agentId,
        skill_id: skillId,
        status: EvaluationRunStatus.RUNNING,
      }),
    );

    const evaluationRunResults = await Promise.all(evaluationRunPromises);
    return evaluationRunResults.flat();
  } catch (error) {
    console.error(
      `Error finding realtime evaluations for agent ${agentId}, skill ${skillId}:`,
      error,
    );
    return [];
  }
}

/**
 * Run realtime evaluations for a single log
 */
export async function runRealtimeEvaluationsForLog(
  log: IdkRequestLog,
  evaluationRuns: EvaluationRun[],
  evaluationConnectorsMap: Record<
    EvaluationMethodName,
    EvaluationMethodConnector
  >,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<LogOutput[]> {
  if (evaluationRuns.length === 0) {
    return [];
  }

  console.log(
    `Triggering realtime evaluations for log ${log.id}: ${evaluationRuns.length} evaluation(s)`,
  );

  // Handle realtime dataset size limits before evaluations
  await handleRealtimeDatasetSizeLimits(
    log,
    evaluationRuns,
    userDataStorageConnector,
  );

  // Execute all evaluations in parallel for better performance
  const evaluationPromises = evaluationRuns.map(async (evaluationRun) => {
    try {
      const connector =
        evaluationConnectorsMap[evaluationRun.evaluation_method];
      if (!connector || !connector.evaluateOneLog) {
        console.warn(
          `No connector found for evaluation method: ${evaluationRun.evaluation_method}`,
        );
        return;
      }

      return await connector.evaluateOneLog(
        evaluationRun.id,
        log,
        userDataStorageConnector,
      );
    } catch (error) {
      console.error(
        `Error in realtime evaluation ${evaluationRun.id} for log ${log.id}:`,
        error,
      );
      // Don't throw - we want other evaluations to continue even if one fails
    }
  });

  try {
    return (await Promise.allSettled(evaluationPromises))
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value!);
  } catch (e) {
    if (e instanceof Error) {
      throw new Error('Error in realtime evaluations batch:', e);
    }
    throw new Error('Error in realtime evaluations batch: unknown error');
  }
}

/**
 * Handle realtime dataset size limits by adding the new log and removing old ones if needed
 */
async function handleRealtimeDatasetSizeLimits(
  log: IdkRequestLog,
  evaluationRuns: EvaluationRun[],
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  // Group evaluation runs by dataset to handle each dataset once
  const datasetIds = [...new Set(evaluationRuns.map((run) => run.dataset_id))];

  for (const datasetId of datasetIds) {
    try {
      // Get the dataset to check its realtime_size limit
      const datasets = await userDataStorageConnector.getDatasets({
        id: datasetId,
      });
      const dataset = datasets?.[0];

      if (!dataset || !dataset.is_realtime) {
        continue; // Skip non-realtime datasets
      }

      // For realtime datasets, we don't manage logs through the bridge table
      // The logs are determined dynamically by the getDatasetLogs method
      // We just log that we're processing this realtime dataset
      console.log(
        `Processing realtime dataset ${datasetId} (size limit: ${dataset.realtime_size}) for log ${log.id}`,
      );
    } catch (error) {
      console.error(
        `Error managing realtime dataset size for dataset ${datasetId}:`,
        error,
      );
      // Don't throw - continue with other datasets
    }
  }
}

/**
 * Evaluate existing logs in a realtime dataset for a new evaluation run
 */
export async function evaluateExistingLogsInRealtimeDataset(
  evaluationRun: EvaluationRun,
  evaluationConnectorsMap: Partial<
    Record<EvaluationMethodName, EvaluationMethodConnector>
  >,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  try {
    // Get the dataset to verify it's realtime
    const datasets = await userDataStorageConnector.getDatasets({
      id: evaluationRun.dataset_id,
    });
    const dataset = datasets?.[0];

    if (!dataset || !dataset.is_realtime) {
      console.log(
        `Skipping backfill for evaluation run ${evaluationRun.id} - dataset ${evaluationRun.dataset_id} is not realtime`,
      );
      return;
    }

    // Get existing logs from the realtime dataset
    // For realtime datasets, this will get the most recent logs with 200 status for the agent/skill
    const existingLogs = await userDataStorageConnector.getDatasetLogs(
      evaluationRun.dataset_id,
      {
        skill_id: evaluationRun.skill_id, // Filter by skill for realtime datasets
      },
    );

    if (existingLogs.length === 0) {
      console.log(
        `No existing logs found in realtime dataset ${evaluationRun.dataset_id} for evaluation run ${evaluationRun.id}`,
      );
      return;
    }

    console.log(
      `Starting backfill evaluation for ${existingLogs.length} existing logs in dataset ${evaluationRun.dataset_id}`,
    );

    // Get the evaluation connector for this method
    const connector = evaluationConnectorsMap[evaluationRun.evaluation_method];
    if (!connector || !connector.evaluateOneLog) {
      console.warn(
        `No connector found for evaluation method: ${evaluationRun.evaluation_method}`,
      );
      return;
    }

    // Evaluate all existing logs in parallel for better performance
    const evaluationPromises = existingLogs.map(async (log) => {
      try {
        await connector.evaluateOneLog(
          evaluationRun.id,
          log,
          userDataStorageConnector,
        );
        console.log(
          `Completed backfill evaluation of log ${log.id} for evaluation run ${evaluationRun.id}`,
        );
      } catch (error) {
        console.error(
          `Error in backfill evaluation of log ${log.id} for evaluation run ${evaluationRun.id}:`,
          error,
        );
        // Don't throw - we want other evaluations to continue even if one fails
      }
    });

    await Promise.allSettled(evaluationPromises);

    console.log(
      `Completed backfill evaluation for evaluation run ${evaluationRun.id} with ${existingLogs.length} existing logs`,
    );
  } catch (error) {
    console.error(
      `Error in backfill evaluation for evaluation run ${evaluationRun.id}:`,
      error,
    );
    // Don't throw - this shouldn't prevent the evaluation run from being created
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
