import {
  calculateDistance,
  cosineSimilarity,
  getInitialClusterCentroids,
  kMeansClustering,
  sampleBeta,
  sampleGamma,
  sampleNormal,
} from '@api/utils/math';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The numerical foundation the optimizer stands on.
 *
 * Every one of these is reached from the request path: `cosineSimilarity`
 * chooses the cluster a request is routed to, `sampleBeta` chooses the arm
 * within it, and `kMeansClustering` decides what the clusters are in the first
 * place. None of them had a test, and none of them fails loudly -- a wrong
 * answer here shows up as an agent that optimizes badly, not as an error.
 */

/**
 * A seeded generator standing in for `Math.random`.
 *
 * The samplers cannot be asserted exactly without controlling their randomness,
 * and asserting nothing but "returns a number" would let real distribution bugs
 * through. Seeding makes the statistical assertions below reproducible: the
 * same sequence runs on every machine and every CI run, so a tolerance that
 * passes once passes always.
 */
const seeded = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const withSeed = (seed: number): void => {
  vi.spyOn(Math, 'random').mockImplementation(seeded(seed));
};

/** Sample mean of `count` draws. */
const meanOf = (count: number, draw: () => number): number => {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += draw();
  }
  return total / count;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cosineSimilarity', () => {
  // This is what routes a request to a cluster, so its ordering behaviour is
  // the thing that matters, not the absolute number.
  it('returns 1 for identical directions', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('ignores magnitude and compares direction only', () => {
    // A centroid is normalised but an embedding need not be; if magnitude
    // leaked into the score, longer inputs would win regardless of direction.
    expect(cosineSimilarity([1, 2, 3], [10, 20, 30])).toBeCloseTo(1, 10);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it('returns -1 for opposite directions', () => {
    expect(cosineSimilarity([1, 2], [-1, -2])).toBeCloseTo(-1, 10);
  });

  it('returns 0 rather than NaN for a zero vector', () => {
    // A zero-magnitude centroid would otherwise divide by zero, and `NaN`
    // loses every `>` comparison, silently making that cluster unreachable.
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
    expect(cosineSimilarity([1, 2], [0, 0])).toBe(0);
  });

  it('rejects vectors of different lengths', () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(
      'Vectors must have the same length',
    );
  });
});

describe('calculateDistance', () => {
  it('computes the Euclidean distance', () => {
    expect(calculateDistance([0, 0], [3, 4])).toBe(5);
  });

  it('is zero for identical points', () => {
    expect(calculateDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('is symmetric', () => {
    expect(calculateDistance([1, 5], [4, 1])).toBe(
      calculateDistance([4, 1], [1, 5]),
    );
  });

  it('rejects vectors of different dimensions', () => {
    expect(() => calculateDistance([1, 2], [1])).toThrow(
      'Vectors must have the same dimension',
    );
  });
});

describe('getInitialClusterCentroids', () => {
  it('returns the requested shape', () => {
    withSeed(1);
    const centroids = getInitialClusterCentroids(4, 8);

    expect(centroids).toHaveLength(4);
    for (const centroid of centroids) {
      expect(centroid).toHaveLength(8);
    }
  });

  it('normalises every centroid to unit length', () => {
    // `cosineSimilarity` divides by both magnitudes, so a non-unit centroid
    // would not break routing -- but the clustering code assumes unit vectors
    // when it compares centroids to each other.
    withSeed(7);
    for (const centroid of getInitialClusterCentroids(5, 16)) {
      const magnitude = Math.sqrt(
        centroid.reduce((sum, value) => sum + value * value, 0),
      );
      expect(magnitude).toBeCloseTo(1, 10);
    }
  });

  it('spreads centroids rather than repeating one', () => {
    // Identical centroids would make every request route to the same cluster
    // and quietly disable the whole clustering step.
    withSeed(3);
    const [first, second] = getInitialClusterCentroids(2, 32);
    expect(cosineSimilarity(first, second)).toBeLessThan(0.9);
  });

  it('returns nothing when asked for no clusters', () => {
    expect(getInitialClusterCentroids(0, 4)).toEqual([]);
  });
});

describe('kMeansClustering', () => {
  it('separates two well-spaced groups', () => {
    withSeed(11);
    const embeddings = [
      [0, 0],
      [0.1, 0.1],
      [0, 0.2],
      [10, 10],
      [10.1, 10.2],
      [9.9, 10],
    ];

    const { clusters, centroids } = kMeansClustering(embeddings, 2);

    expect(centroids).toHaveLength(2);
    // Membership is asserted by grouping rather than by label, because which
    // group gets index 0 depends on initialisation.
    expect(clusters[0]).toBe(clusters[1]);
    expect(clusters[1]).toBe(clusters[2]);
    expect(clusters[3]).toBe(clusters[4]);
    expect(clusters[4]).toBe(clusters[5]);
    expect(clusters[0]).not.toBe(clusters[3]);
  });

  it('converges before exhausting its iteration budget', () => {
    withSeed(5);
    const embeddings = [
      [0, 0],
      [0.1, 0],
      [5, 5],
      [5.1, 5],
    ];

    const { iterations } = kMeansClustering(embeddings, 2, 100);

    expect(iterations).toBeGreaterThan(0);
    expect(iterations).toBeLessThan(100);
  });

  it('gives every point its own cluster when k meets the point count', () => {
    const embeddings = [
      [1, 1],
      [2, 2],
    ];

    const result = kMeansClustering(embeddings, 2);

    expect(result.clusters).toEqual([0, 1]);
    expect(result.centroids).toEqual(embeddings);
    expect(result.iterations).toBe(0);
  });

  it('returns fewer clusters than asked for when k exceeds the point count', () => {
    // Worth pinning: the caller asks for `configuration_count` clusters and
    // gets one per point instead, so a skill with few logs silently ends up
    // with fewer arms than its configuration says.
    const embeddings = [[1], [2]];

    const result = kMeansClustering(embeddings, 5);

    expect(result.centroids).toHaveLength(2);
    expect(result.clusters).toEqual([0, 1]);
  });

  it('handles duplicate points without producing an empty centroid', () => {
    // k-means++ divides by the total squared distance, which is zero when
    // every point is identical.
    withSeed(2);
    const embeddings = [
      [1, 1],
      [1, 1],
      [1, 1],
      [1, 1],
    ];

    const { centroids } = kMeansClustering(embeddings, 2);

    for (const centroid of centroids) {
      for (const value of centroid) {
        expect(Number.isNaN(value)).toBe(false);
      }
    }
  });

  it('rejects an empty embedding set', () => {
    expect(() => kMeansClustering([], 2)).toThrow(
      'Cannot cluster empty embedding set',
    );
  });

  it('rejects a non-positive cluster count', () => {
    expect(() => kMeansClustering([[1]], 0)).toThrow(
      'Number of clusters must be positive',
    );
  });
});

describe('sampleNormal', () => {
  it('has approximately zero mean and unit variance', () => {
    withSeed(42);
    const draws = Array.from({ length: 20_000 }, () => sampleNormal());
    const mean = draws.reduce((sum, value) => sum + value, 0) / draws.length;
    const variance =
      draws.reduce((sum, value) => sum + (value - mean) ** 2, 0) / draws.length;

    expect(mean).toBeCloseTo(0, 1);
    expect(variance).toBeCloseTo(1, 1);
  });
});

describe('sampleGamma', () => {
  // Gamma(shape) has mean == shape. Both branches of the implementation are
  // exercised: shape >= 1 directly, shape < 1 through the boost step.
  it('has a mean equal to its shape for shape >= 1', () => {
    withSeed(13);
    expect(meanOf(20_000, () => sampleGamma(2))).toBeCloseTo(2, 1);
  });

  it('has a mean equal to its shape for shape < 1', () => {
    withSeed(17);
    expect(meanOf(20_000, () => sampleGamma(0.5))).toBeCloseTo(0.5, 1);
  });

  it('never returns a negative value', () => {
    withSeed(19);
    for (let i = 0; i < 2_000; i++) {
      expect(sampleGamma(1.5)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('sampleBeta', () => {
  /**
   * This is the draw that picks which arm serves a request. Its mean has to
   * track alpha/(alpha+beta), because that ratio is how an arm's observed
   * success rate turns into its chance of being chosen -- if the mean were
   * biased, the bandit would favour the wrong arm forever and nothing would
   * report an error.
   */
  it('has mean alpha / (alpha + beta)', () => {
    withSeed(23);
    expect(meanOf(20_000, () => sampleBeta(2, 8))).toBeCloseTo(0.2, 1);
  });

  it('is symmetric for equal parameters', () => {
    withSeed(29);
    expect(meanOf(20_000, () => sampleBeta(5, 5))).toBeCloseTo(0.5, 1);
  });

  it('stays within [0, 1]', () => {
    withSeed(31);
    for (let i = 0; i < 5_000; i++) {
      const value = sampleBeta(3, 4);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('favours the arm with more successes', () => {
    // The property the bandit actually depends on: an arm with a better record
    // has to draw higher on average than one with a worse record.
    withSeed(37);
    const better = meanOf(10_000, () => sampleBeta(9, 2));
    withSeed(37);
    const worse = meanOf(10_000, () => sampleBeta(2, 9));

    expect(better).toBeGreaterThan(worse);
  });

  it('is a uniform draw for the Beta(1, 1) prior', () => {
    // Beta(1,1) is the prior an arm starts from, so a brand-new arm must be
    // picked uniformly rather than being systematically preferred or ignored.
    withSeed(41);
    expect(meanOf(20_000, () => sampleBeta(1, 1))).toBeCloseTo(0.5, 1);
  });
});
