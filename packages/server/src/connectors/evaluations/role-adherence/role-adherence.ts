import { evaluateLog } from '@server/connectors/evaluations/role-adherence/service/evaluate';
import {
  RoleAdherenceEvaluationAIParameters,
  RoleAdherenceEvaluationParameters,
} from '@server/connectors/evaluations/role-adherence/types';
import type { EvaluationMethodConnector } from '@server/types/connector';
import {
  type EvaluationMethodDetails,
  EvaluationMethodName,
} from '@shared/types/evaluations';

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
  getAIParameterSchema: RoleAdherenceEvaluationAIParameters,
};
