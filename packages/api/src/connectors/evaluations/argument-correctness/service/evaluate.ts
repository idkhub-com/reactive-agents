import { getArgumentCorrectnessTemplate } from '@api/connectors/evaluations/argument-correctness/templates/main';
import { ArgumentCorrectnessEvaluationParameters } from '@api/connectors/evaluations/argument-correctness/types';
import { judgeOverrides } from '@api/connectors/evaluations/judge-overrides';
import type { ToolUsage } from '@api/connectors/evaluations/tool-correctness/types';
import { createLLMJudge } from '@api/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { extractMessagesFromRequestData } from '@api/utils/embeddings';
import { resolveEvaluationModelConfig } from '@api/utils/evaluation-model-resolver';
import { formatMessagesForExtraction } from '@api/utils/messages';
import { extractOutputFromResponseBody } from '@api/utils/super-agents/responses';
import type {
  ChatCompletionRequestData,
  ResponsesRequestData,
  StreamChatCompletionRequestData,
} from '@shared/types/api/request';
import { SuperAgentsResponseBody } from '@shared/types/api/response';
import type {
  SkillOptimizationEvaluation,
  SkillOptimizationEvaluationResult,
} from '@shared/types/data';
import type { CompletedLog } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { produceSuperAgentsRequestData } from '@shared/utils/sa-request-data';

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
  c: AppContext,
  evaluation: SkillOptimizationEvaluation,
  log: CompletedLog,
  storageConnector: UserDataStorageConnector,
): Promise<SkillOptimizationEvaluationResult> {
  const params = ArgumentCorrectnessEvaluationParameters.parse(
    evaluation.params,
  );

  const start_time = Date.now();

  // Resolve model configuration from evaluation.model_id or system settings
  const modelConfig = await resolveEvaluationModelConfig(
    c,
    evaluation,
    storageConnector,
  );
  const saRequestData = produceSuperAgentsRequestData(
    log.ai_provider_request_log.method,
    log.ai_provider_request_log.request_url,
    {},
    log.ai_provider_request_log.request_body,
  );
  const responseBody = SuperAgentsResponseBody.parse(
    log.ai_provider_request_log.response_body,
  );

  const messages = extractMessagesFromRequestData(
    saRequestData as
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

  const llmJudge = createLLMJudge(
    c,
    {
      temperature: params.temperature,
      ...judgeOverrides(params),
    },
    modelConfig ?? undefined,
  );

  const { systemPrompt, userPrompt } = buildPromptForToolArgs(
    input,
    output,
    tools_called,
  );

  const judgeResult = await llmJudge.evaluate({
    text: `${systemPrompt}\n\n${userPrompt}`,
    systemPrompt,
    userPrompt,
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
  const judgeModelName = modelConfig?.model ?? null;
  const judgeModelProvider = modelConfig?.provider ?? null;

  // Format tool correctness information for display
  const displayInfoSections = [];

  // Add reasoning if available
  if (judgeResult.reasoning) {
    displayInfoSections.push({
      label: 'Reasoning',
      content: judgeResult.reasoning,
    });
  }

  // Add per-tool breakdown if available
  if (perTool && perTool.length > 0) {
    const toolBreakdown = perTool
      .map((item) => {
        const obj = item as Record<string, unknown>;
        const toolName = obj.tool_name || 'Unknown Tool';
        const correct = obj.correct ? '✓ Correct' : '✗ Incorrect';
        const reason = obj.reason ? `\nReason: ${obj.reason}` : '';
        return `${toolName}: ${correct}${reason}`;
      })
      .join('\n\n');

    displayInfoSections.push({
      label: 'Tool Arguments Analysis',
      content: toolBreakdown,
    });
  }

  // Add tools called summary
  if (tools_called.length > 0) {
    const toolsSummary = tools_called
      .map((tool) => {
        return `${tool.name}\nPurpose: ${tool.purpose}\nSuccess: ${tool.success}`;
      })
      .join('\n\n');

    displayInfoSections.push({
      label: 'Tools Called',
      content: toolsSummary,
    });
  }

  const result: SkillOptimizationEvaluationResult = {
    evaluation_id: evaluation.id,
    method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
    score: final_score,
    extra_data: {
      tools_called,
      execution_time,
      execution_time_ms: execution_time,
      ...(judgeResult.metadata ? { judge_metadata: judgeResult.metadata } : {}),
    },
    display_info: displayInfoSections,
    judge_model_name: judgeModelName,
    judge_model_provider: judgeModelProvider,
  };

  return result;
}
