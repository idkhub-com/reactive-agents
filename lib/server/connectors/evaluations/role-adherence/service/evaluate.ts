import { getRoleAdherenceMainTemplate } from '@server/connectors/evaluations/role-adherence/templates/main';
import { RoleAdherenceEvaluationParameters } from '@server/connectors/evaluations/role-adherence/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@server/types/connector';
import { resolveEvaluationModelConfig } from '@server/utils/evaluation-model-resolver';
import { extractOutputFromResponseBody } from '@server/utils/reactive-agents/responses';
import { ReactiveAgentsResponseBody } from '@shared/types/api/response';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';

function pickRoleData(
  log: Log,
  params: RoleAdherenceEvaluationParameters,
): {
  role_definition: string;
  assistant_output: string;
  instructions?: string;
} {
  const role_definition =
    params.role_definition || (log.metadata?.role_definition as string) || '';

  // Extract assistant output using standard utilities
  let assistant_output = params.assistant_output;
  if (!assistant_output) {
    try {
      const responseBody = ReactiveAgentsResponseBody.parse(
        log.ai_provider_request_log.response_body,
      );
      assistant_output = extractOutputFromResponseBody(responseBody);
    } catch {
      // Fallback to metadata if parsing fails
      assistant_output = (log.metadata?.assistant_output as string) || '';
    }
  }

  const instructions =
    params.instructions || (log.metadata?.instructions as string);
  return { role_definition, assistant_output, instructions };
}

export async function evaluateLog(
  evaluation: SkillOptimizationEvaluation,
  log: Log,
  storageConnector: UserDataStorageConnector,
): Promise<SkillOptimizationEvaluationResult> {
  const params = RoleAdherenceEvaluationParameters.parse(evaluation.params);

  // Resolve model configuration from evaluation.model_id or system settings
  const modelConfig = await resolveEvaluationModelConfig(
    evaluation,
    storageConnector,
  );

  const llmJudge = createLLMJudge(
    {
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    },
    modelConfig ?? undefined,
  );

  const start_time = Date.now();

  const { role_definition, assistant_output, instructions } = pickRoleData(
    log,
    params,
  );

  const tpl = getRoleAdherenceMainTemplate({
    role_definition,
    assistant_output,
    instructions,
    strict_mode: params.strict_mode || false,
    verbose_mode: params.verbose_mode ?? true,
    include_reason: params.include_reason ?? true,
  });

  const judgeResult = await llmJudge.evaluate({
    text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
  });

  let final_score = judgeResult.score;
  if (params.strict_mode) {
    final_score = final_score === 1.0 ? 1.0 : 0.0;
  }

  const execution_time = Date.now() - start_time;
  const judgeModelName = modelConfig?.model ?? null;
  const judgeModelProvider = modelConfig?.provider ?? null;

  const evaluationResult: SkillOptimizationEvaluationResult = {
    evaluation_id: evaluation.id,
    method: EvaluationMethodName.ROLE_ADHERENCE,
    score: final_score,
    extra_data: {
      reasoning: judgeResult.reasoning,
      role_definition,
      assistant_output,
      instructions,
      strict_mode: params.strict_mode,
      metadata: judgeResult.metadata,
      execution_time,
      execution_time_ms: execution_time,
      evaluated_at: new Date().toISOString(),
    },
    display_info: [
      {
        label: 'Reasoning',
        content: judgeResult.reasoning,
      },
      {
        label: 'Role Definition',
        content: role_definition,
      },
      ...(instructions
        ? [
            {
              label: 'Additional Instructions',
              content: instructions,
            },
          ]
        : []),
      {
        label: 'Assistant Output',
        content: assistant_output,
      },
    ],
    judge_model_name: judgeModelName,
    judge_model_provider: judgeModelProvider,
  };

  return evaluationResult;
}
