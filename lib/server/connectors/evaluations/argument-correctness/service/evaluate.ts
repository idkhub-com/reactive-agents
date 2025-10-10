import { getArgumentCorrectnessTemplate } from '@server/connectors/evaluations/argument-correctness/templates/main';
import type { ArgumentCorrectnessAverageResult } from '@server/connectors/evaluations/argument-correctness/types';
import type { ToolUsage } from '@server/connectors/evaluations/tool-correctness/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import { updateEvaluationRunWithStatistics } from '@server/evaluations/utils/evaluation-run-updater';
import {
  calculateEvaluationStatistics,
  extractEvaluationOutputIds,
} from '@server/evaluations/utils/statistics';
import type { UserDataStorageConnector } from '@server/types/connector';
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
import type {
  EvaluationRun,
  EvaluationRunCreateParams,
} from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import type {
  LogOutput,
  LogOutputCreateParams,
} from '@shared/types/data/log-output';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { ArgumentCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/argument-correctness';
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

async function evaluateSingleLog(
  log: Log,
  params: ArgumentCorrectnessEvaluationParameters,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<LogOutput> {
  const start_time = Date.now();
  const verbose_logs: string[] = [];

  try {
    const rawInput =
      params.input ||
      (
        (log.ai_provider_request_log as Record<string, unknown>)
          ?.request_body as Record<string, unknown>
      )?.input ||
      '';
    const input =
      typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);

    let actual_output: string;
    if (typeof params.actual_output === 'string') {
      actual_output = params.actual_output;
    } else if (log.ai_provider_request_log?.response_body) {
      if (typeof log.ai_provider_request_log.response_body === 'string') {
        actual_output = log.ai_provider_request_log.response_body;
      } else {
        actual_output = JSON.stringify(
          log.ai_provider_request_log.response_body,
        );
      }
    } else if (log.metadata?.ground_truth) {
      if (typeof log.metadata.ground_truth === 'string') {
        actual_output = log.metadata.ground_truth;
      } else {
        actual_output = JSON.stringify(log.metadata.ground_truth);
      }
    } else {
      actual_output = '';
    }

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
      actual_output,
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

    let final_score = computed_score ?? judgeResult.score;
    let threshold = params.threshold || 0.5;
    if (params.strict_mode) {
      final_score = final_score === 1.0 ? 1.0 : 0.0;
      threshold = 1.0;
    }
    const passed = final_score >= threshold;

    const execution_time = Date.now() - start_time;
    const evaluationOutput: LogOutputCreateParams = {
      log_id: log.id,
      output: {
        score: final_score,
        passed,
        reasoning: judgeResult.reasoning,
        threshold,
        strict_mode: params.strict_mode,
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
      },
      score: final_score,
      metadata: {
        input,
        actual_output,
        tools_called,
        evaluation_run_id,
        execution_time,
        execution_time_ms: execution_time,
        ...(params.verbose_mode && { verbose_logs }),
        ...(judgeResult.metadata
          ? { judge_metadata: judgeResult.metadata }
          : {}),
      },
    };

    const storedOutput = await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      evaluationOutput,
    );
    return storedOutput;
  } catch (error) {
    const execution_time = Date.now() - start_time;
    const evaluationOutput: LogOutputCreateParams = {
      log_id: log.id,
      output: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
      },
      score: 0,
      metadata: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
      },
    };
    const storedOutput = await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      evaluationOutput,
    );
    return storedOutput;
  }
}

async function processLogsInBatches(
  logs: Log[],
  params: ArgumentCorrectnessEvaluationParameters,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<LogOutput[]> {
  const batch_size = params.batch_size || 10;
  const results: LogOutput[] = [];
  for (let i = 0; i < logs.length; i += batch_size) {
    const batch = logs.slice(i, i + batch_size);
    if (params.async_mode !== false) {
      const batch_results = await Promise.all(
        batch.map((log) =>
          evaluateSingleLog(
            log,
            params,
            evaluation_run_id,
            userDataStorageConnector,
          ),
        ),
      );
      results.push(...batch_results);
    } else {
      for (const log of batch) {
        const result = await evaluateSingleLog(
          log,
          params,
          evaluation_run_id,
          userDataStorageConnector,
        );
        results.push(result);
      }
    }
  }
  return results;
}

export async function evaluateArgumentCorrectness(
  agentId: string,
  skillId: string,
  datasetId: string,
  params: ArgumentCorrectnessEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: ArgumentCorrectnessAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const evaluationRunCreateParams: EvaluationRunCreateParams = {
    dataset_id: datasetId,
    agent_id: agentId,
    skill_id: skillId,
    evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
    name:
      evalRunOptions.name ||
      `Argument Correctness Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions.description ||
      `Evaluates tool argument correctness using LLM-as-a-judge for dataset ${datasetId}`,
    metadata: {
      parameters: params,
      method_config: {
        method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
        name: 'Argument Correctness',
        description:
          'Evaluates whether an agent generated correct tool call arguments given the input and task using LLM-as-a-judge',
      },
      is_custom_evaluation: false,
    },
  };

  const evaluationRun = await userDataStorageConnector.createEvaluationRun(
    evaluationRunCreateParams,
  );

  try {
    const logs = await userDataStorageConnector.getDatasetLogs(datasetId, {});

    const evaluationOutputs = await processLogsInBatches(
      logs,
      params,
      evaluationRun.id,
      userDataStorageConnector,
    );

    const thresholdUsed = params.strict_mode ? 1.0 : params.threshold || 0.5;

    // Calculate statistics using shared utility
    const statistics = calculateEvaluationStatistics(
      evaluationOutputs,
      thresholdUsed,
    );
    const evaluationOutputIds = extractEvaluationOutputIds(evaluationOutputs);

    // Update evaluation run with results using shared utility
    await updateEvaluationRunWithStatistics({
      evaluationRunId: evaluationRun.id,
      statistics,
      threshold: thresholdUsed,
      evaluationOutputIds,
      userDataStorageConnector,
      additionalMetadata: {
        completed_at: new Date().toISOString(),
      },
      preserveExistingResults: true,
      status: EvaluationRunStatus.COMPLETED,
      completedAt: new Date().toISOString(),
    });

    const updated =
      (
        await userDataStorageConnector.getEvaluationRuns({
          id: evaluationRun.id,
        })
      )[0] || evaluationRun;

    const averageResult: ArgumentCorrectnessAverageResult = {
      average_score: statistics.averageScore,
      total_logs: statistics.totalLogs,
      passed_count: statistics.passedCount,
      failed_count: statistics.failedCount,
      threshold_used: thresholdUsed,
      evaluation_run_id: evaluationRun.id,
    };

    return { averageResult, evaluationRun: updated };
  } catch (error) {
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.FAILED,
      results: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        ...evaluationRun.metadata,
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      },
      completed_at: new Date().toISOString(),
    });
    throw error;
  }
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
