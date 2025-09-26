import type { ClusterResult } from '@shared/utils/math';

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

export function kMeansClustering(
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

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
