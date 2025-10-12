import { evaluateLog } from '@server/connectors/evaluations/role-adherence/service/evaluate';
import type { EvaluationMethodConnector } from '@server/types/connector';
import type { EvaluationMethodDetails } from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { RoleAdherenceEvaluationParameters } from '@shared/types/idkhub/evaluations/role-adherence';

const roleAdherenceMethodConfig: EvaluationMethodDetails = {
  method: EvaluationMethodName.ROLE_ADHERENCE,
  name: 'Role Adherence',
  description:
    'Evaluates whether assistant output adheres to a specified role and constraints using LLM-as-a-judge',
} as const;

export const roleAdherenceEvaluationConnector: EvaluationMethodConnector = {
  getDetails: () => roleAdherenceMethodConfig,
  evaluateLog,
  getParameterSchema: RoleAdherenceEvaluationParameters,
};
