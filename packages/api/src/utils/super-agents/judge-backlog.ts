import type {
  EvaluationMethodConnector,
  LogsStorageConnector,
  UserDataStorageConnector,
} from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { runEvaluationsForLog } from '@api/utils/realtime-evaluations';
import { emitSSEEvent } from '@api/utils/sse-event-manager';
import { info } from '@shared/console-logging';
import type { Skill, SkillOptimizationEvaluation } from '@shared/types/data';
import type { EvaluationMethodName } from '@shared/types/evaluations';

/** How many skipped requests one pass will judge */
const BACKLOG_LIMIT = 50;

/**
 * Judge the logs of a skill that have no evaluation run: the requests that
 * were answered while its evaluations were still being generated.
 *
 * A request is judged right after its response, against the evaluations
 * the skill has at that moment. A skill the gateway creates gets its
 * evaluations from a model call that runs behind the request that created
 * it and can take tens of seconds, so that request -- and every request
 * answered before the call returns -- was judged against nothing, and
 * nothing came back for it. Called once the evaluations are stored, this
 * judges those, and the same when the early pass creates them for a skill
 * whose creation-time generation had failed.
 *
 * Only logs that ended before the evaluations existed are taken: one that
 * ended after finds them on its own path. A log is checked for a run once
 * more before its own is stored, for the request that ended a moment before
 * the evaluations and looked them up a moment after: both paths may judge
 * it, only one may store.
 */
export async function judgeLogsWithoutRuns(
  c: AppContext,
  connector: UserDataStorageConnector,
  logsConnector: LogsStorageConnector | undefined,
  evaluationConnectorsMap:
    | Partial<Record<EvaluationMethodName, EvaluationMethodConnector>>
    | undefined,
  skill: Skill,
  evaluations: SkillOptimizationEvaluation[],
): Promise<number> {
  if (!logsConnector || !evaluationConnectorsMap || evaluations.length === 0) {
    return 0;
  }

  const createdAt = Math.min(
    ...evaluations.map((evaluation) => Date.parse(evaluation.created_at)),
  );
  const cutoff = Number.isFinite(createdAt) ? createdAt : Date.now();

  const backlog = (
    await logsConnector.getLogs(c, {
      skill_id: skill.id,
      status: 200,
      unjudged: true,
      order: 'asc',
      limit: BACKLOG_LIMIT,
    })
  ).filter((log) => log.start_time + log.duration < cutoff);

  let judged = 0;
  for (const log of backlog) {
    const results = await runEvaluationsForLog(
      c,
      log,
      evaluations,
      evaluationConnectorsMap,
      connector,
    );
    if (results.length === 0) continue;

    const runs = await connector.getSkillOptimizationEvaluationRuns(c, {
      log_id: log.id,
    });
    if (runs.length > 0) continue;

    const evaluationRun = await connector.createSkillOptimizationEvaluationRun(
      c,
      {
        agent_id: log.agent_id,
        skill_id: log.skill_id,
        cluster_id: log.cluster_id ?? null,
        log_id: log.id,
        results,
      },
    );
    emitSSEEvent('skill-optimization:evaluation-run-created', {
      evaluationRun,
      agentId: log.agent_id,
      skillId: log.skill_id,
      clusterId: log.cluster_id ?? null,
      logId: log.id,
    });
    judged += 1;
  }

  if (judged > 0) {
    info(
      `[JUDGE_BACKLOG] Judged ${judged} request(s) of skill ${skill.name} answered before it had evaluations`,
    );
  }
  return judged;
}
