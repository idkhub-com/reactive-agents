import type {
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import { debug } from '@shared/console-logging';
import { FunctionName } from '@shared/types/api/request';
import type { Log, Skill } from '@shared/types/data';

interface ClusterResult {
  clusters: number[];
  centroids: number[][];
  iterations: number;
}

function calculateDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same dimension');
  }
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

function calculateCentroid(points: number[][]): number[] {
  if (points.length === 0) {
    throw new Error('Cannot calculate centroid of empty point set');
  }

  const dimensions = points[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const point of points) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += point[i];
    }
  }

  return centroid.map((sum) => sum / points.length);
}

function initializeCentroidsKMeansPlusPlus(
  embeddings: number[][],
  k: number,
): number[][] {
  const centroids: number[][] = [];
  const n = embeddings.length;

  // Choose first centroid randomly
  const firstIdx = Math.floor(Math.random() * n);
  centroids.push([...embeddings[firstIdx]]);

  // Choose remaining centroids using k-means++ algorithm
  for (let c = 1; c < k; c++) {
    const distances = embeddings.map((embedding) => {
      // Find minimum distance to any existing centroid
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = calculateDistance(embedding, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist * minDist; // Square the distance for weighted probability
    });

    // Calculate cumulative probabilities
    const totalDist = distances.reduce((sum, dist) => sum + dist, 0);
    if (totalDist === 0) {
      // All remaining points are identical to existing centroids
      centroids.push([...embeddings[c % n]]);
      continue;
    }

    // Select next centroid based on weighted probability
    const random = Math.random() * totalDist;
    let cumulative = 0;
    let selectedIdx = 0;

    for (let i = 0; i < n; i++) {
      cumulative += distances[i];
      if (cumulative >= random) {
        selectedIdx = i;
        break;
      }
    }

    centroids.push([...embeddings[selectedIdx]]);
  }

  return centroids;
}

function kMeansClustering(
  embeddings: number[][],
  k: number,
  maxIterations = 100,
): ClusterResult {
  const n = embeddings.length;

  if (n === 0) {
    throw new Error('Cannot cluster empty embedding set');
  }

  if (k <= 0) {
    throw new Error('Number of clusters must be positive');
  }

  if (k >= n) {
    // Each point is its own cluster
    return {
      clusters: Array.from({ length: n }, (_, i) => i),
      centroids: embeddings.map((e) => [...e]),
      iterations: 0,
    };
  }

  // Initialize centroids using k-means++
  let centroids = initializeCentroidsKMeansPlusPlus(embeddings, k);
  const clusters = new Array(n).fill(0);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false;

    // Assign each point to the nearest centroid
    for (let i = 0; i < n; i++) {
      let minDistance = Infinity;
      let nearestCluster = 0;

      for (let c = 0; c < k; c++) {
        const distance = calculateDistance(embeddings[i], centroids[c]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCluster = c;
        }
      }

      if (clusters[i] !== nearestCluster) {
        clusters[i] = nearestCluster;
        changed = true;
      }
    }

    // If no assignments changed, we've converged
    if (!changed) {
      return { clusters, centroids, iterations: iteration + 1 };
    }

    // Update centroids
    const newCentroids: number[][] = [];
    for (let c = 0; c < k; c++) {
      const clusterPoints = embeddings.filter((_, i) => clusters[i] === c);
      if (clusterPoints.length > 0) {
        newCentroids.push(calculateCentroid(clusterPoints));
      } else {
        // Keep the old centroid if no points are assigned to this cluster
        newCentroids.push([...centroids[c]]);
      }
    }

    centroids = newCentroids;
  }

  return { clusters, centroids, iterations: maxIterations };
}

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

export function runOptimizer(skill: Skill, logs: Log[]): ClusterResult | null {
  const numberOfClusters = skill.max_configurations;

  // Filter logs to only include those with embeddings
  const logsWithEmbeddings = logs.filter(
    (log) => log.embedding !== null && log.embedding.length > 0,
  );

  if (logsWithEmbeddings.length === 0) {
    console.warn(
      `[OPTIMIZER] No logs with embeddings found for skill ${skill.id}`,
    );
    return null;
  }

  if (logsWithEmbeddings.length < numberOfClusters) {
    console.warn(
      `[OPTIMIZER] Not enough logs with embeddings (${logsWithEmbeddings.length}) for ${numberOfClusters} clusters for skill ${skill.id}. Each log will be its own cluster.`,
    );
  }

  // Extract embeddings
  const embeddings = logsWithEmbeddings.map((log) => log.embedding as number[]);

  // Validate that all embeddings have the same dimension
  const firstDimension = embeddings[0].length;
  if (!embeddings.every((embedding) => embedding.length === firstDimension)) {
    console.error(
      `[OPTIMIZER] Inconsistent embedding dimensions for skill ${skill.id}`,
    );
    return null;
  }

  try {
    const result = kMeansClustering(embeddings, numberOfClusters);
    console.log(
      `[OPTIMIZER] Clustered ${logsWithEmbeddings.length} logs into ${numberOfClusters} clusters for skill ${skill.id} in ${result.iterations} iterations`,
    );
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

  const trainEveryN = 10;

  const logs = await logsStorageConnector.getLogs({
    skill_id: skill.id,
    after: skill.metadata.last_trained_log_start_time,
    embedding_not_null: true,
  });

  debug(`Found ${logs.length} logs in optimizer`);

  if (logs.length >= trainEveryN) {
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
      const clusterResult = runOptimizer(skill, logs);

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
