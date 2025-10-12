import { getArgumentCorrectnessTemplate } from '@server/connectors/evaluations/argument-correctness/templates/main';
import { ArgumentCorrectnessEvaluationParameters } from '@server/connectors/evaluations/argument-correctness/types';
import type { ToolUsage } from '@server/connectors/evaluations/tool-correctness/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import { extractMessagesFromRequestData } from '@server/utils/embeddings';
import { extractOutputFromResponseBody } from '@server/utils/idkhub/responses';
import { formatMessagesForExtraction } from '@server/utils/messages';
import type {
  ChatCompletionRequestData,
  ResponsesRequestData,
  StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { IdkResponseBody } from '@shared/types/api/response';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { produceIdkRequestData } from '@shared/utils/idk-request-data';

// Use a template builder to construct prompts
function buildPromptForToolArgs(
  input: string,
  actual_output: string,
  tools_called: ToolUsage[],
): { systemPrompt: string; userPrompt: string } {
  const tpl = getArgumentCorrectnessTemplate({
    input,
    actual_output,
    tools_called,
    strict_mode: false,
    verbose_mode: true,
    include_reason: true,
  });
  return { systemPrompt: tpl.systemPrompt, userPrompt: tpl.userPrompt };
}

export async function evaluateLog(
  evaluation: SkillOptimizationEvaluation,
  log: Log,
): Promise<SkillOptimizationEvaluationResult> {
  const params = ArgumentCorrectnessEvaluationParameters.parse(
    evaluation.params,
  );

  const start_time = Date.now();
  const idkRequestData = produceIdkRequestData(
    log.ai_provider_request_log.method,
    log.ai_provider_request_log.request_url,
    {},
    log.ai_provider_request_log.request_body,
  );
  const responseBody = IdkResponseBody.parse(
    log.ai_provider_request_log.response_body,
  );

  const messages = extractMessagesFromRequestData(
    idkRequestData as
      | ChatCompletionRequestData
      | StreamChatCompletionRequestData
      | ResponsesRequestData,
  );
  const input = formatMessagesForExtraction(messages);
  const output = extractOutputFromResponseBody(responseBody);

  let tools_called: ToolUsage[] = [];
  if (params.tools_called && Array.isArray(params.tools_called)) {
    tools_called = params.tools_called as ToolUsage[];
  } else if (log.metadata && typeof log.metadata.tools === 'string') {
    try {
      tools_called = JSON.parse(log.metadata.tools) as ToolUsage[];
    } catch {
      tools_called = [];
    }
  } else if (log.metadata && log.metadata.tools !== undefined) {
    const t = log.metadata.tools;
    if (Array.isArray(t)) tools_called = t as ToolUsage[];
    else if (typeof t === 'object' && t !== null)
      tools_called = [t as ToolUsage];
  }

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  const { systemPrompt, userPrompt } = buildPromptForToolArgs(
    input,
    output,
    tools_called,
  );

  const judgeResult = await llmJudge.evaluate({
    text: `${systemPrompt}\n\n${userPrompt}`,
  });

  let computed_score: number | null = null;
  const meta = judgeResult.metadata as Record<string, unknown> | undefined;
  const perTool = Array.isArray(meta?.per_tool)
    ? (meta?.per_tool as unknown[])
    : undefined;
  if (perTool && perTool.length > 0) {
    const total = perTool.length;
    let correctCount = 0;
    for (const item of perTool) {
      const obj = item as Record<string, unknown>;
      if (typeof obj?.correct === 'boolean' && obj.correct) correctCount += 1;
    }
    computed_score = total > 0 ? correctCount / total : null;
  }

  const final_score = computed_score ?? judgeResult.score;
  const execution_time = Date.now() - start_time;

  const result: SkillOptimizationEvaluationResult = {
    method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
    score: final_score,
    extra_data: {
      tools_called,
      execution_time,
      execution_time_ms: execution_time,
      ...(judgeResult.metadata ? { judge_metadata: judgeResult.metadata } : {}),
    },
  };

  return result;
}
