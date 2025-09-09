import {
  evaluateOneLogForRoleAdherence,
  evaluateRoleAdherenceDataset,
} from '@server/connectors/evaluations/role-adherence/service/evaluate';
import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import type {
  EvaluationMethodDetails,
  EvaluationRunJobDetails,
} from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { RoleAdherenceEvaluationParameters } from '@shared/types/idkhub/evaluations/role-adherence';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';

const roleAdherenceMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.ROLE_ADHERENCE,
  name: 'Role Adherence',
  description:
    'Evaluates whether assistant output adheres to a specified role and constraints using LLM-as-a-judge',
} as const;

async function runEvaluation(
  jobDetails: EvaluationRunJobDetails,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationRun> {
  const parsedParams = RoleAdherenceEvaluationParameters.parse(
    jobDetails.parameters,
  );

  const { evaluationRun } = await evaluateRoleAdherenceDataset(
    jobDetails.agent_id,
    jobDetails.skill_id,
    jobDetails.dataset_id,
    parsedParams,
    userDataStorageConnector,
    {
      name: jobDetails.name,
      description: jobDetails.description,
    },
  );

  return evaluationRun;
}

async function evaluateOneLog(
  evaluationRunId: string,
  log: IdkRequestLog,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  await evaluateOneLogForRoleAdherence(
    evaluationRunId,
    log,
    userDataStorageConnector,
  );
}

export const roleAdherenceEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => roleAdherenceMethodConfig,
  evaluate: runEvaluation,
  evaluateOneLog,
  getParameterSchema: RoleAdherenceEvaluationParameters,
};
