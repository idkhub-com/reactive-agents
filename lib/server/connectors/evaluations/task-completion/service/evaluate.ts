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
  const start_time = Date.now();

  try {
    const params = TaskCompletionEvaluationParameters.parse(evaluation.params);

    const llmJudge = createLLMJudge({
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    });

    const { task, outcome } = await getTaskAndOutcome(params, log);

    // Step 2: Generate verdict
    const { verdict, reason } = await generateVerdict(
      { task, outcome },
      llmJudge,
    );
    const verdict_llm_output = JSON.stringify({ verdict, reason });

    const execution_time = Date.now() - start_time;

    const result: SkillOptimizationEvaluationResult = {
      evaluation_id: evaluation.id,
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
      display_info: [
        {
          label: 'Task',
          content: task,
        },
        {
          label: 'Outcome',
          content: outcome,
        },
        {
          label: 'Verdict',
          content: `Score: ${verdict}\n\nReason:\n${reason}`,
        },
      ],
    };

    return result;
  } catch (err) {
    // Always return a result, even if evaluation fails
    // This ensures arm stats and counters are updated
    const execution_time = Date.now() - start_time;
    const errorMessage = err instanceof Error ? err.message : String(err);

    return {
      evaluation_id: evaluation.id,
      method: EvaluationMethodName.TASK_COMPLETION,
      score: 0.5, // Neutral fallback score
      extra_data: {
        task: '',
        outcome: '',
        strict_mode: false,
        extraction_llm_output: {
          task: '',
          outcome: '',
        },
        verdict_llm_output: JSON.stringify({
          verdict: 0.5,
          reason: `Evaluation failed: ${errorMessage}`,
        }),
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        error: errorMessage,
        fallback: true,
      },
      display_info: [
        {
          label: 'Error',
          content: `Evaluation failed: ${errorMessage}`,
        },
      ],
    };
  }
}
