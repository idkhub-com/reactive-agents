import {
  getOptimalArm,
  getOptimalCluster,
} from '@api/middlewares/super-agents-configuration';
import { createMockContext } from '@api/test-utils/mock-context';
import type { UserDataStorageConnector } from '@api/types/connector';
import type {
  SkillOptimizationArm,
  SkillOptimizationCluster,
} from '@shared/types/data';
import type { SkillOptimizationArmStat } from '@shared/types/data/skill-optimization-arm-stats';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The two choices the optimizer makes on every request: which cluster a request
 * belongs to, and which arm within it serves the request.
 *
 * Neither is reachable from an end-to-end test in any meaningful way -- both are
 * probabilistic, so a single request proves nothing about the distribution --
 * and both fail silently. A bandit that systematically prefers the wrong arm
 * still answers every request successfully; it just never improves.
 */

const mockContext = createMockContext();

/**
 * Seeded stand-in for `Math.random`, so the frequency assertions below are
 * reproducible. Thompson sampling is random by construction: the only honest
 * assertions are about how often each arm wins over many draws, and those are
 * only stable if the draws are.
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

const uuid = (n: number): string =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const arm = (id: string): SkillOptimizationArm =>
  ({ id, skill_id: uuid(1), cluster_id: uuid(2) }) as SkillOptimizationArm;

const stat = (
  armId: string,
  evaluationId: string,
  n: number,
  totalReward: number,
): SkillOptimizationArmStat =>
  ({
    arm_id: armId,
    evaluation_id: evaluationId,
    n,
    total_reward: totalReward,
    mean: n > 0 ? totalReward / n : 0,
    n2: totalReward,
  }) as SkillOptimizationArmStat;

/**
 * A connector that answers only the two reads `getOptimalArm` performs.
 * `statsByArm` maps an arm id to the rows that arm has accumulated.
 */
const connectorWith = (
  evaluations: { id: string; weight: number }[],
  statsByArm: Record<string, SkillOptimizationArmStat[]>,
): UserDataStorageConnector =>
  ({
    getSkillOptimizationEvaluations: vi.fn().mockResolvedValue(evaluations),
    getSkillOptimizationArmStats: vi
      .fn()
      .mockImplementation(
        async (_c: unknown, query: { arm_id: string }) =>
          statsByArm[query.arm_id] ?? [],
      ),
  }) as unknown as UserDataStorageConnector;

/** How often each arm is chosen across `rounds` independent selections. */
const winRate = async (
  rounds: number,
  select: () => Promise<SkillOptimizationArm>,
): Promise<Record<string, number>> => {
  const wins: Record<string, number> = {};
  for (let i = 0; i < rounds; i++) {
    const chosen = await select();
    wins[chosen.id] = (wins[chosen.id] ?? 0) + 1;
  }
  return wins;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getOptimalCluster', () => {
  const cluster = (id: string, centroid: number[]): SkillOptimizationCluster =>
    ({ id, centroid }) as SkillOptimizationCluster;

  it('routes to the cluster whose centroid points the same way', () => {
    const chosen = getOptimalCluster(
      [1, 0, 0],
      [
        cluster('a', [0, 1, 0]),
        cluster('b', [1, 0, 0]),
        cluster('c', [0, 0, 1]),
      ],
    );

    expect(chosen.id).toBe('b');
  });

  it('compares direction, not distance', () => {
    // A centroid that points the right way but is much shorter still wins.
    // Using distance here would route to the nearer, wrongly-aimed cluster.
    const chosen = getOptimalCluster(
      [10, 0],
      [cluster('near', [9, 9]), cluster('aligned', [0.01, 0])],
    );

    expect(chosen.id).toBe('aligned');
  });

  it('prefers a positively aligned cluster over an opposed one', () => {
    const chosen = getOptimalCluster(
      [1, 1],
      [cluster('opposed', [-1, -1]), cluster('aligned', [1, 1])],
    );

    expect(chosen.id).toBe('aligned');
  });

  it('still returns a cluster when every centroid is degenerate', () => {
    // `cosineSimilarity` returns 0 for a zero vector. Falling through without
    // a choice would mean no configuration at all for that request.
    const chosen = getOptimalCluster(
      [1, 1],
      [cluster('a', [0, 0]), cluster('b', [0, 0])],
    );

    expect(chosen.id).toBe('a');
  });

  it('returns the only cluster when there is one', () => {
    expect(getOptimalCluster([1, 2], [cluster('solo', [3, 4])]).id).toBe(
      'solo',
    );
  });
});

describe('getOptimalArm', () => {
  const evaluation = uuid(10);

  it('returns the only arm when there is one', async () => {
    const only = arm('only');
    const connector = connectorWith([{ id: evaluation, weight: 1 }], {});

    expect(
      (await getOptimalArm(mockContext, [only], uuid(1), connector)).id,
    ).toBe('only');
  });

  it('favours the arm with the better record', async () => {
    /**
     * The property the whole bandit rests on. Neither arm is guaranteed to win
     * any single round -- that is what exploration means -- so this asserts the
     * frequency over many rounds instead of a single choice.
     */
    withSeed(101);
    const connector = connectorWith([{ id: evaluation, weight: 1 }], {
      good: [stat('good', evaluation, 50, 45)],
      bad: [stat('bad', evaluation, 50, 5)],
    });

    const wins = await winRate(300, () =>
      getOptimalArm(mockContext, [arm('good'), arm('bad')], uuid(1), connector),
    );

    expect(wins.good ?? 0).toBeGreaterThan(wins.bad ?? 0);
    // With records this far apart the better arm should dominate, not merely
    // edge ahead; a marginal lead would suggest the reward is barely read.
    expect(wins.good).toBeGreaterThan(250);
  });

  it('still explores the weaker arm sometimes', async () => {
    // A bandit that never revisits a losing arm cannot recover from an early
    // unlucky streak. Records are close here, so both should see traffic.
    withSeed(103);
    const connector = connectorWith([{ id: evaluation, weight: 1 }], {
      slightly_better: [stat('slightly_better', evaluation, 20, 12)],
      slightly_worse: [stat('slightly_worse', evaluation, 20, 10)],
    });

    const wins = await winRate(300, () =>
      getOptimalArm(
        mockContext,
        [arm('slightly_better'), arm('slightly_worse')],
        uuid(1),
        connector,
      ),
    );

    expect(wins.slightly_better ?? 0).toBeGreaterThan(0);
    expect(wins.slightly_worse ?? 0).toBeGreaterThan(0);
  });

  it('treats an arm with no stats as the uniform prior', async () => {
    /**
     * A new arm has no rows at all, and must start from Beta(1,1) rather than
     * from zero -- otherwise a freshly generated configuration would never be
     * tried and regeneration would have no effect.
     */
    withSeed(107);
    const connector = connectorWith([{ id: evaluation, weight: 1 }], {
      established: [stat('established', evaluation, 40, 20)],
      // `fresh` deliberately absent.
    });

    const wins = await winRate(300, () =>
      getOptimalArm(
        mockContext,
        [arm('established'), arm('fresh')],
        uuid(1),
        connector,
      ),
    );

    expect(wins.fresh ?? 0).toBeGreaterThan(0);
  });

  it('weights evaluations against each other', async () => {
    /**
     * Two evaluations disagree: `a` prefers the first arm, `b` prefers the
     * second, and `b` carries nine times the weight. The heavier evaluation
     * has to decide the outcome, or configured weights mean nothing.
     */
    const light = uuid(11);
    const heavy = uuid(12);
    withSeed(109);

    const connector = connectorWith(
      [
        { id: light, weight: 1 },
        { id: heavy, weight: 9 },
      ],
      {
        light_favourite: [
          stat('light_favourite', light, 30, 30),
          stat('light_favourite', heavy, 30, 0),
        ],
        heavy_favourite: [
          stat('heavy_favourite', light, 30, 0),
          stat('heavy_favourite', heavy, 30, 30),
        ],
      },
    );

    const wins = await winRate(300, () =>
      getOptimalArm(
        mockContext,
        [arm('light_favourite'), arm('heavy_favourite')],
        uuid(1),
        connector,
      ),
    );

    expect(wins.heavy_favourite ?? 0).toBeGreaterThan(
      wins.light_favourite ?? 0,
    );
  });

  it('explores more at a higher temperature', async () => {
    /**
     * `exploration_temperature` is a per-skill setting, so its direction has to
     * hold: raising it must widen the spread of traffic, not narrow it. The
     * same seed is used for both runs so the comparison is like for like.
     */
    // Records deliberately close together: two arms far apart stay far apart
    // at any temperature, so the setting would have nothing visible to do.
    const stats = {
      good: [stat('good', evaluation, 20, 13)],
      bad: [stat('bad', evaluation, 20, 9)],
    };
    const connector = connectorWith([{ id: evaluation, weight: 1 }], stats);
    const arms = [arm('good'), arm('bad')];

    withSeed(113);
    const exploiting = await winRate(500, () =>
      getOptimalArm(mockContext, arms, uuid(1), connector, 0.2),
    );

    withSeed(113);
    const exploring = await winRate(500, () =>
      getOptimalArm(mockContext, arms, uuid(1), connector, 5.0),
    );

    // Direction *and* magnitude: a temperature setting that moved traffic by a
    // round or two would satisfy `>` while doing nothing useful. At 0.2 the
    // weaker arm is all but shut out; at 5.0 it gets a substantial share.
    expect(exploiting.bad ?? 0).toBeLessThan(20);
    expect(exploring.bad ?? 0).toBeGreaterThan(50);
  });

  it('reads stats for every arm it is given', async () => {
    // A short-circuit that skipped an arm would silently exclude it from
    // selection for good.
    withSeed(127);
    const connector = connectorWith([{ id: evaluation, weight: 1 }], {});

    await getOptimalArm(
      mockContext,
      [arm('a'), arm('b'), arm('c')],
      uuid(1),
      connector,
    );

    const calls = vi.mocked(connector.getSkillOptimizationArmStats).mock.calls;
    expect(
      calls.map(([, query]) => (query as { arm_id: string }).arm_id),
    ).toEqual(['a', 'b', 'c']);
  });

  it('defaults an unweighted evaluation to weight 1', async () => {
    // Stats can reference an evaluation that the weights lookup does not know
    // about; dropping those rows would discard real reward history.
    withSeed(131);
    const unknown = uuid(13);
    const connector = connectorWith([], {
      good: [stat('good', unknown, 40, 36)],
      bad: [stat('bad', unknown, 40, 4)],
    });

    const wins = await winRate(200, () =>
      getOptimalArm(mockContext, [arm('good'), arm('bad')], uuid(1), connector),
    );

    expect(wins.good ?? 0).toBeGreaterThan(wins.bad ?? 0);
  });
});
