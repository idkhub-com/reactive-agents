import type { AppContext } from '@server/types/hono';
import { debug } from '@shared/console-logging';
import { FunctionName } from '@shared/types/api/request';
import type { Log, Skill } from '@shared/types/data';
import type { Next } from 'hono';
import { createMiddleware } from 'hono/factory';

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

export const optimizerMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    await next();

    const idkRequestData = c.get('idk_request_data');

    // Only attempt to optimize for specific endpoints
    if (
      !idkRequestData ||
      !(
        idkRequestData.functionName === FunctionName.CHAT_COMPLETE ||
        idkRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE ||
        idkRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE
      )
    ) {
      return;
    }

    const idkConfig = c.get('idk_config');
    const userDataStorageConnector = c.get('user_data_storage_connector');
    const logsStorageConnector = c.get('logs_storage_connector');
    const skill = c.get('skill');

    if (!idkConfig) {
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
      const clusterResult = runOptimizer(skill, logs);

      if (clusterResult) {
        // Update skill metadata with training information
        const mostRecentLogTime = Math.max(
          ...logs.map((log) => log.start_time),
        );

        try {
          await userDataStorageConnector.updateSkill(skill.id, {
            metadata: {
              ...skill.metadata,
              last_trained_at: new Date().toISOString(),
              last_trained_log_start_time: mostRecentLogTime,
            },
          });

          console.log(
            `[OPTIMIZER] Updated skill ${skill.id} metadata after clustering`,
          );
        } catch (error) {
          console.error(
            `[OPTIMIZER] Failed to update skill metadata for ${skill.id}:`,
            error,
          );
        }
      }
    }
  },
);
