import { generateSystemPromptForSkill } from '@server/middlewares/optimizer/system-prompt';
import type {
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { kMeansClustering } from '@server/utils/math';
import { debug } from '@shared/console-logging';
import { FunctionName } from '@shared/types/api/request';
import type {
  Log,
  Model,
  Skill,
  SkillEvaluation,
  SkillOptimization,
  SkillOptimizationConfiguration,
  SkillOptimizationConfigurationModelParams,
} from '@shared/types/data';
import type { ClusterResult } from '@shared/utils/math';

import { v4 as uuidv4 } from 'uuid';

async function tryAcquireOptimizationLock(
  skillId: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<boolean> {
  try {
    const result =
      await userDataStorageConnector.tryAcquireOptimizationLock(skillId);

    if (result.success) {
      console.log(
        `[OPTIMIZER] Successfully acquired optimization lock for skill ${skillId}`,
      );
    } else {
      console.log(`[OPTIMIZER] ${result.message} for skill ${skillId}`);
    }

    return result.success;
  } catch (error) {
    console.error(
      `[OPTIMIZER] Failed to acquire optimization lock for skill ${skillId}:`,
      error,
    );
    return false;
  }
}

async function releaseOptimizationLock(
  skillId: string,
  userDataStorageConnector: UserDataStorageConnector,
  updatedMetadata: Record<string, unknown>,
): Promise<void> {
  try {
    const result = await userDataStorageConnector.releaseOptimizationLock(
      skillId,
      updatedMetadata,
    );

    if (result.success) {
      console.log(
        `[OPTIMIZER] Released optimization lock for skill ${skillId}`,
      );
    } else {
      console.error(
        `[OPTIMIZER] Failed to release optimization lock for skill ${skillId}: ${result.message}`,
      );
    }
  } catch (error) {
    console.error(
      `[OPTIMIZER] Error releasing optimization lock for skill ${skillId}:`,
      error,
    );
  }
}

function extractEmbeddings(logs: Log[]): number[][] {
  // Filter logs to only include those with embeddings
  const logsWithEmbeddings = logs.filter(
    (log) => log.embedding !== null && log.embedding.length > 0,
  );

  if (logsWithEmbeddings.length === 0) {
    throw new Error(`[OPTIMIZER] No logs with embeddings found`);
  }

  // Extract embeddings
  const embeddings = logsWithEmbeddings.map((log) => log.embedding as number[]);

  // Validate that all embeddings have the same dimension
  const firstDimension = embeddings[0].length;
  if (!embeddings.every((embedding) => embedding.length === firstDimension)) {
    throw new Error(`[OPTIMIZER] Inconsistent embedding dimensions`);
  }

  return embeddings;
}

function getRandomConfigurationModelParams(
  allowedModels: Model[],
  initialPrompt: string,
): SkillOptimizationConfigurationModelParams {
  const modelParams: SkillOptimizationConfigurationModelParams = {
    model_id:
      allowedModels[Math.floor(Math.random() * allowedModels.length)].id,
    system_prompt: initialPrompt,
    temperature: Math.random(),
    top_k: Math.random(),
    top_p: Math.random(),
    frequency_penalty: Math.random(),
    presence_penalty: Math.random(),
    thinking: Math.random(),
  };

  return modelParams;
}

function banditAlgorithm(
  cluster: number[][],
  embeddingsLogMap: Map<number[], Log>,
  skillEvaluations: SkillEvaluation[],
) {}

async function createOptimizationConfigurations(
  skill: Skill,
  skillEvaluations: SkillEvaluation[],
  allowedModels: Model[],
  clusterResult: ClusterResult,
  embeddingsLogMap: Map<number[], Log>,
  latestOptimizationConfigurations?: SkillOptimizationConfiguration[],
): Promise<SkillOptimizationConfiguration[]> {
  let optimizationConfigurations: SkillOptimizationConfiguration[] = [];
  if (!latestOptimizationConfigurations) {
    optimizationConfigurations = await Promise.all(
      clusterResult.centroids.map(async (centroid) => {
        const initialPrompt = await generateSystemPromptForSkill(skill);
        const modelParams = getRandomConfigurationModelParams(
          allowedModels,
          initialPrompt,
        );
        const configuration: SkillOptimizationConfiguration = {
          model_params: modelParams,
          results: [],
          cluster_center: centroid,
        };
        return configuration;
      }),
    );
  } else {
    optimizationConfigurations = latestOptimizationConfigurations;
  }

  return optimizationConfigurations;
}

export function runOptimizer(
  skill: Skill,
  logs: Log[],
  latestOptimization?: SkillOptimization,
): ClusterResult | null {
  const numberOfClusters = skill.max_configurations;

  try {
    const embeddings = extractEmbeddings(logs);
    const embeddingsLogMap = new Map<number[], Log>();
    embeddings.forEach((embedding, index) => {
      embeddingsLogMap.set(embedding, logs[index]);
    });
    const result = kMeansClustering(embeddings, numberOfClusters);
    return result;
  } catch (error) {
    console.error(
      `[OPTIMIZER] Error clustering logs for skill ${skill.id}:`,
      error,
    );
    return null;
  }
}

export async function optimizeSkill(
  functionName: FunctionName,
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  skill: Skill,
  skillOptimization?: SkillOptimization,
) {
  // Only attempt to optimize for specific endpoints
  if (
    !(
      functionName === FunctionName.CHAT_COMPLETE ||
      functionName === FunctionName.STREAM_CHAT_COMPLETE ||
      functionName === FunctionName.CREATE_MODEL_RESPONSE
    )
  ) {
    return;
  }

  const interval = 10;

  const logs = await logsStorageConnector.getLogs({
    skill_id: skill.id,
    after: skill.metadata.last_trained_log_start_time,
    // Since the embedding is not null, we can assume that the logs are valid
    // and are for one of the allowed function names
    embedding_not_null: true,
  });

  debug(`Found ${logs.length} logs in optimizer`);

  if (logs.length >= interval) {
    // Try to acquire the optimization lock
    const lockAcquired = await tryAcquireOptimizationLock(
      skill.id,
      userDataStorageConnector,
    );

    if (!lockAcquired) {
      // Another process is optimizing this skill, exit gracefully
      debug(
        `[OPTIMIZER] Skipping optimization for skill ${skill.id} - lock held by another process`,
      );
      return;
    }

    try {
      const clusterResult = runOptimizer(skill, logs, skillOptimization);

      if (clusterResult) {
        // Update skill metadata with training information and release the lock
        const mostRecentLogTime = Math.max(
          ...logs.map((log) => log.start_time),
        );

        const updatedMetadata = {
          ...skill.metadata,
          last_trained_at: new Date().toISOString(),
          last_trained_log_start_time: mostRecentLogTime,
        };

        await releaseOptimizationLock(
          skill.id,
          userDataStorageConnector,
          updatedMetadata,
        );

        console.log(
          `[OPTIMIZER] Updated skill ${skill.id} metadata after clustering`,
        );
      } else {
        // Release the lock even if optimization failed
        await releaseOptimizationLock(
          skill.id,
          userDataStorageConnector,
          skill.metadata,
        );
      }
    } catch (error) {
      console.error(
        `[OPTIMIZER] Error during optimization for skill ${skill.id}:`,
        error,
      );

      // Release the lock on error
      try {
        await releaseOptimizationLock(
          skill.id,
          userDataStorageConnector,
          skill.metadata,
        );
      } catch (releaseError) {
        console.error(
          `[OPTIMIZER] Failed to release lock after error for skill ${skill.id}:`,
          releaseError,
        );
      }
    }
  }
}
