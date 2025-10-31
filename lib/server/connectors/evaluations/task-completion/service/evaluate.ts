import { extractTaskAndOutcome } from '@server/connectors/evaluations/task-completion/service/task-and-outcome';
import getTaskCompletionVerdictTemplate from '@server/connectors/evaluations/task-completion/templates/verdict';
import { TaskCompletionEvaluationParameters } from '@server/connectors/evaluations/task-completion/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type { LLMJudge } from '@server/types/evaluations/llm-judge';
import { formatMessagesForExtraction } from '@server/utils/messages';
import { extractMessagesFromRequestData } from '@server/utils/reactive-agents/requests';
import { extractOutputFromResponseBody } from '@server/utils/reactive-agents/responses';
import type {
  ChatCompletionRequestData,
  ResponsesRequestData,
  StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { ReactiveAgentsResponseBody } from '@shared/types/api/response';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';

/**
 * Generate verdict using universal LLM judge with verdict template
 */
async function generateVerdict(
  { task, outcome }: { task: string; outcome: string },
  llm_judge: LLMJudge,
): Promise<{ verdict: number; reason: string }> {
  const verdictTemplate = getTaskCompletionVerdictTemplate({ task, outcome });
  const verdict_result = await llm_judge.evaluate({
    text: `${verdictTemplate.systemPrompt}\n\n${verdictTemplate.userPrompt}`,
  });

  return {
    verdict: verdict_result.score,
    reason: verdict_result.reasoning,
  };
}

async function getTaskAndOutcome(
  params: TaskCompletionEvaluationParameters,
  log: Log,
): Promise<{ task: string; outcome: string }> {
  const raRequestData = produceReactiveAgentsRequestData(
    log.ai_provider_request_log.method,
    log.ai_provider_request_log.request_url,
    {},
    log.ai_provider_request_log.request_body,
  );
  const responseBody = ReactiveAgentsResponseBody.parse(
    log.ai_provider_request_log.response_body,
  );

  const messages = extractMessagesFromRequestData(
    raRequestData as
      | ChatCompletionRequestData
      | StreamChatCompletionRequestData
      | ResponsesRequestData,
  );
  const input = formatMessagesForExtraction(messages);
  const output = extractOutputFromResponseBody(responseBody);

  const { task, outcome } = await extractTaskAndOutcome(params, input, output);
  return { task: params.task || task, outcome };
}

export async function evaluateLog(
  evaluation: SkillOptimizationEvaluation,
  log: Log,
): Promise<SkillOptimizationEvaluationResult> {
  const params = TaskCompletionEvaluationParameters.parse(evaluation.params);

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  const start_time = Date.now();

  const { task, outcome } = await getTaskAndOutcome(params, log);

  // Step 2: Generate verdict
  const { verdict, reason } = await generateVerdict(
    { task, outcome },
    llmJudge,
  );
  const verdict_llm_output = JSON.stringify({ verdict, reason });

  const execution_time = Date.now() - start_time;

  const result: SkillOptimizationEvaluationResult = {
    method: EvaluationMethodName.TASK_COMPLETION,
    score: verdict,
    extra_data: {
      task,
      outcome,
      strict_mode: params.strict_mode,
      extraction_llm_output: {
        task,
        outcome,
      },
      verdict_llm_output,
      execution_time,
      execution_time_ms: execution_time,
      evaluated_at: new Date().toISOString(),
    },
  };

  return result;
}
