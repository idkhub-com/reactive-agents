import type {
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { calculateDistance, kMeansClustering } from '@server/utils/math';
import { error } from '@shared/console-logging';
import { FunctionName } from '@shared/types/api/request';
import type { Log, Skill } from '@shared/types/data';
import type { ClusterResult } from '@shared/utils/math';

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

export function getClusters(skill: Skill, logs: Log[]): ClusterResult | null {
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

export async function autoClusterSkill(
  functionName: FunctionName,
  userDataStorageConnector: UserDataStorageConnector,
  logsStorageConnector: LogsStorageConnector,
  skill: Skill,
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

  // Automatically cluster logs if there are enough logs
  if (logs.length >= interval) {
    try {
      const clusterStates =
        await userDataStorageConnector.getSkillOptimizationClusterStates({
          skill_id: skill.id,
        });

      const clusterResult = getClusters(skill, logs);

      if (!clusterResult) {
        error(`[OPTIMIZER] Failed to cluster logs for skill ${skill.id}`);
        return;
      }

      const newClusterCenters = clusterResult.centroids;

      // Match old cluster centers to new cluster centers based on proximity
      // Each old cluster gets matched to the closest new cluster
      const used = new Set<number>();
      const matches: Array<{ clusterStateId: string; newCenter: number[] }> =
        [];

      for (const clusterState of clusterStates) {
        let minDistance = Infinity;
        let bestMatchIndex = -1;

        // Find the closest unused new cluster center
        for (let i = 0; i < newClusterCenters.length; i++) {
          if (used.has(i)) continue;

          const distance = calculateDistance(
            clusterState.cluster_center,
            newClusterCenters[i],
          );

          if (distance < minDistance) {
            minDistance = distance;
            bestMatchIndex = i;
          }
        }

        if (bestMatchIndex !== -1) {
          used.add(bestMatchIndex);
          matches.push({
            clusterStateId: clusterState.id,
            newCenter: newClusterCenters[bestMatchIndex],
          });
        }
      }

      // Update all matched cluster states
      await Promise.all(
        matches.map((match) =>
          userDataStorageConnector.updateSkillOptimizationClusterState(
            match.clusterStateId,
            { cluster_center: match.newCenter },
          ),
        ),
      );
    } catch (e) {
      error(`[OPTIMIZER] Error during optimization for skill ${skill.id}:`, e);
    }
  }
}
