import { getArgumentCorrectnessTemplate } from '@server/connectors/evaluations/argument-correctness/templates/main';
import type { ArgumentCorrectnessAverageResult } from '@server/connectors/evaluations/types/argument-correctness';
import type { ToolUsage } from '@server/connectors/evaluations/types/tool_usage';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { DataPoint } from '@shared/types/data/data-point';
import type {
  DataPointOutput as EvaluationOutput,
  DataPointOutputCreateParams as EvaluationOutputCreateParams,
} from '@shared/types/data/data-point-output';
import type { DatasetQueryParams } from '@shared/types/data/dataset';
import type {
  EvaluationRun,
  EvaluationRunCreateParams,
  EvaluationRunStatus,
} from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import type { ArgumentCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/argument-correctness';
import { v4 as uuidv4 } from 'uuid';

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

async function evaluateSingleDataPoint(
  data_point: DataPoint,
  params: ArgumentCorrectnessEvaluationParameters,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationOutput> {
  const start_time = Date.now();
  const _evaluation_output_id = uuidv4();
  const verbose_logs: string[] = [];

  try {
    const rawInput = params.input || data_point.request_body?.input || '';
    const input =
      typeof rawInput === 'string' ? rawInput : JSON.stringify(rawInput);

    let actual_output: string;
    if (typeof params.actual_output === 'string') {
      actual_output = params.actual_output;
    } else if (typeof data_point.ground_truth === 'string') {
      actual_output = data_point.ground_truth;
    } else if (data_point.ground_truth !== undefined) {
      actual_output = JSON.stringify(data_point.ground_truth);
    } else {
      actual_output = '';
    }

    let tools_called: ToolUsage[] = [];
    if (params.tools_called && Array.isArray(params.tools_called)) {
      tools_called = params.tools_called as ToolUsage[];
    } else if (
      data_point.metadata &&
      typeof data_point.metadata.tools === 'string'
    ) {
      try {
        tools_called = JSON.parse(data_point.metadata.tools) as ToolUsage[];
      } catch {
        tools_called = [];
      }
    } else if (data_point.metadata && data_point.metadata.tools !== undefined) {
      const t = data_point.metadata.tools;
      if (Array.isArray(t)) tools_called = t as ToolUsage[];
      else if (typeof t === 'object' && t !== null)
        tools_called = [t as ToolUsage];
    }

    const llm_judge = createLLMJudge({
      model: params.model || 'gpt-4o',
      temperature: params.temperature || 0.1,
      max_tokens: params.max_tokens || 1000,
    });

    const { systemPrompt, userPrompt } = buildPromptForToolArgs(
      input,
      actual_output,
      tools_called,
    );

    const judgeResult = await llm_judge.evaluate({
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
    const evaluationOutput: EvaluationOutputCreateParams = {
      data_point_id: data_point.id,
      output: {
        score: final_score,
        passed,
        reasoning: judgeResult.reasoning,
        threshold,
        strict_mode: params.strict_mode,
        execution_time,
        execution_time_ms: execution_time,
        evaluated_at: new Date().toISOString(),
        evaluation_run_id,
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

    const storedOutput = await userDataStorageConnector.createDataPointOutput(
      evaluation_run_id,
      evaluationOutput,
    );
    return storedOutput;
  } catch (error) {
    const execution_time = Date.now() - start_time;
    const evaluationOutput: EvaluationOutputCreateParams = {
      data_point_id: data_point.id,
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
    const storedOutput = await userDataStorageConnector.createDataPointOutput(
      evaluation_run_id,
      evaluationOutput,
    );
    return storedOutput;
  }
}

async function processDataPointsInBatches(
  data_points: DataPoint[],
  params: ArgumentCorrectnessEvaluationParameters,
  evaluation_run_id: string,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationOutput[]> {
  const batch_size = params.batch_size || 10;
  const results: EvaluationOutput[] = [];
  for (let i = 0; i < data_points.length; i += batch_size) {
    const batch = data_points.slice(i, i + batch_size);
    if (params.async_mode !== false) {
      const batch_results = await Promise.all(
        batch.map((data_point) =>
          evaluateSingleDataPoint(
            data_point,
            params,
            evaluation_run_id,
            userDataStorageConnector,
          ),
        ),
      );
      results.push(...batch_results);
    } else {
      for (const data_point of batch) {
        const result = await evaluateSingleDataPoint(
          data_point,
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
  input: DatasetQueryParams,
  params: ArgumentCorrectnessEvaluationParameters,
  user_data_storage_connector: UserDataStorageConnector,
  evalRunOptions?: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: ArgumentCorrectnessAverageResult;
  evaluationRun: EvaluationRun;
}> {
  if (!user_data_storage_connector) {
    throw new Error(
      'User data storage connector is required for dataset evaluation',
    );
  }
  if (!input.id) {
    throw new Error('Dataset ID is required for evaluation');
  }
  const agent_id = params.agent_id;
  if (!agent_id) {
    throw new Error('Agent ID is required for evaluation');
  }

  const evaluationRunCreateParams: EvaluationRunCreateParams = {
    dataset_id: input.id,
    agent_id,
    evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
    name:
      evalRunOptions?.name ||
      `Argument Correctness Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions?.description ||
      `Evaluates tool argument correctness using LLM-as-a-judge for dataset ${input.id}`,
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

  const evaluationRun = await user_data_storage_connector.createEvaluationRun(
    evaluationRunCreateParams,
  );
  const evaluation_run_id = evaluationRun.id;
  if (!evaluation_run_id) {
    throw new Error('Failed to create evaluation run - no ID returned');
  }

  try {
    const data_points = await user_data_storage_connector.getDataPoints(
      input.id,
      {
        limit: input.limit || 10,
        offset: input.offset || 0,
      },
    );

    const evaluationOutputs = await processDataPointsInBatches(
      data_points,
      params,
      evaluation_run_id,
      user_data_storage_connector,
    );

    const scores = evaluationOutputs.map((output) => output.score || 0);
    const average_score = scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;
    const threshold_used = params.strict_mode ? 1.0 : params.threshold || 0.5;
    const passed_count = scores.filter(
      (score) => score >= threshold_used,
    ).length;
    const failed_count = scores.length - passed_count;

    await user_data_storage_connector.updateEvaluationRun(evaluation_run_id, {
      status: 'completed' as EvaluationRunStatus,
      results: {
        total_data_points: data_points.length,
        passed_count,
        failed_count,
        average_score,
        threshold_used,
        evaluation_outputs: evaluationOutputs.map((o) => o.id),
      },
      metadata: {
        ...evaluationRun.metadata,
        total_data_points: data_points.length,
        passed_count,
        failed_count,
        average_score,
        threshold_used,
        evaluation_outputs: evaluationOutputs.map((o) => o.id),
      },
      completed_at: new Date().toISOString(),
    });

    const updated =
      (
        await user_data_storage_connector.getEvaluationRuns({
          id: evaluation_run_id,
        })
      )[0] || evaluationRun;

    const averageResult: ArgumentCorrectnessAverageResult = {
      average_score,
      total_data_points: data_points.length,
      passed_count,
      failed_count,
      threshold_used,
      evaluation_run_id,
    };

    return { averageResult, evaluationRun: updated };
  } catch (error) {
    await user_data_storage_connector.updateEvaluationRun(evaluation_run_id, {
      status: 'failed' as EvaluationRunStatus,
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
