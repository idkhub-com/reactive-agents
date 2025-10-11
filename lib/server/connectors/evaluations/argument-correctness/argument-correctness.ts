import type { EvaluationMethodConnector } from '@server/types/connector';
import type {
  EvaluationMethodDetails,
  EvaluationMethodName,
} from '@shared/types/idkhub/evaluations';
import { EvaluationMethodName as Names } from '@shared/types/idkhub/evaluations';
import { ArgumentCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/argument-correctness';

import { evaluateLog } from './service/evaluate';

const methodConfig: EvaluationMethodDetails = {
  method: Names.ARGUMENT_CORRECTNESS as unknown as EvaluationMethodName,
  name: 'Argument Correctness',
  description:
    'Evaluates whether an agent generated correct tool call arguments given the input and task using LLM-as-a-judge',
} as const;

export const argumentCorrectnessEvaluationConnector: EvaluationMethodConnector =
  {
    getDetails: () => methodConfig,
    evaluateLog,
    getParameterSchema: ArgumentCorrectnessEvaluationParameters,
  };
