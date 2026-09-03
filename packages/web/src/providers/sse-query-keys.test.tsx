import { agentQueryKeys } from '@web/providers/agents';
import { aiProvidersQueryKeys } from '@web/providers/ai-providers';
import { logsQueryKeys } from '@web/providers/logs';
import { modelQueryKeys } from '@web/providers/models';
import { armQueryKeys } from '@web/providers/skill-optimization-arms';
import { clusterQueryKeys } from '@web/providers/skill-optimization-clusters';
import { skillOptimizationEvaluationRunQueryKeys } from '@web/providers/skill-optimization-evaluation-runs';
import { evaluationQueryKeys } from '@web/providers/skill-optimization-evaluations';
import { skillQueryKeys } from '@web/providers/skills';
import { describe, expect, it } from 'vitest';

/**
 * `providers/sse.tsx` spells its query-key roots out as literals instead of
 * importing these factories: it is loaded by nearly everything, and importing
 * nine provider modules for one constant each pulled all of them, and their
 * module-scope work, into every consumer -- which broke any test that mocked
 * one of those providers.
 *
 * The cost of that is a copy that could drift. This is the check that it has
 * not: a provider renaming its root key fails here, pointing at the map in
 * sse.tsx that would otherwise have gone on invalidating nothing, silently.
 */
describe('SSE invalidation keys', () => {
  it('matches the root key each provider actually uses', () => {
    expect(agentQueryKeys.all).toEqual(['agents']);
    expect(skillQueryKeys.all).toEqual(['skills']);
    expect(logsQueryKeys.all).toEqual(['logs']);
    expect(modelQueryKeys.all).toEqual(['models']);
    expect(aiProvidersQueryKeys.all).toEqual(['ai-providers']);
    expect(evaluationQueryKeys.all).toEqual(['evaluations']);
    expect(armQueryKeys.all).toEqual(['skillOptimizationArms']);
    expect(clusterQueryKeys.all).toEqual(['skillOptimizationClusters']);
    expect(skillOptimizationEvaluationRunQueryKeys.all).toEqual([
      'skillOptimizationEvaluationRuns',
    ]);
  });

  it('keeps every key a prefix of what the provider builds from it', () => {
    // Invalidation relies on prefix matching, so a factory that stopped
    // building its specific keys from `all` would leave them unreachable.
    expect(skillQueryKeys.list({}).slice(0, 1)).toEqual(skillQueryKeys.all);
    expect(agentQueryKeys.list({}).slice(0, 1)).toEqual(agentQueryKeys.all);
    expect(logsQueryKeys.list(null, null, false, 1, 50).slice(0, 1)).toEqual(
      logsQueryKeys.all,
    );
    expect(clusterQueryKeys.list(null).slice(0, 1)).toEqual(
      clusterQueryKeys.all,
    );
    expect(armQueryKeys.list(null, null).slice(0, 1)).toEqual(armQueryKeys.all);
    expect(
      skillOptimizationEvaluationRunQueryKeys.list(null).slice(0, 1),
    ).toEqual(skillOptimizationEvaluationRunQueryKeys.all);
    expect(evaluationQueryKeys.skillEvaluations('skill-1').slice(0, 1)).toEqual(
      evaluationQueryKeys.all,
    );
    expect(modelQueryKeys.skillModels('skill-1').slice(0, 1)).toEqual(
      modelQueryKeys.all,
    );
  });
});
