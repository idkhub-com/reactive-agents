import { getTurnRelevancyTemplate } from '@server/connectors/evaluations/turn-relevancy/templates/main';
import type { TurnRelevancyAverageResult } from '@server/connectors/evaluations/types/turn-relevancy';
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
} from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';
import type { LLMJudge } from '@shared/types/idkhub/evaluations/llm-judge';
import type { TurnRelevancyEvaluationParameters } from '@shared/types/idkhub/evaluations/turn-relevancy';
import { v4 as uuidv4 } from 'uuid';

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('rate limit') ||
      message.includes('temporary')
    );
  }
  return false;
}

function pickTurnRelevancyData(
  data_point: DataPoint,
  params: TurnRelevancyEvaluationParameters,
): {
  conversation_history: string;
  current_turn: string;
  instructions?: string;
} {
  const conversation_history =
    params.conversation_history ||
    (data_point.metadata?.conversation_history as string) ||
    '';
  const current_turn =
    params.current_turn ||
    (typeof data_point.ground_truth === 'string'
      ? (data_point.ground_truth as string)
      : data_point.ground_truth
        ? JSON.stringify(data_point.ground_truth)
        : (data_point.metadata?.current_turn as string) || '') ||
    '';
  const instructions =
    params.instructions || (data_point.metadata?.instructions as string);
  return { conversation_history, current_turn, instructions };
}

async function evaluateSingleDataPoint(
  data_point: DataPoint,
  params: TurnRelevancyEvaluationParameters,
  evaluation_run_id: string,
  llm_judge: LLMJudge,
  userDataStorageConnector: UserDataStorageConnector,
  retryCount = 0,
): Promise<EvaluationOutput> {
  const start_time = Date.now();
  const _evaluation_output_id = uuidv4();
  const maxRetries = 2;

  try {
    const { conversation_history, current_turn, instructions } =
      pickTurnRelevancyData(data_point, params);

    const tpl = getTurnRelevancyTemplate({
      conversation_history,
      current_turn,
      strict_mode: params.strict_mode || false,
      verbose_mode: params.verbose_mode ?? true,
      include_reason: params.include_reason ?? true,
    });

    const judgeResult = await llm_judge.evaluate({
      text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
      outputFormat: 'json',
    });

    let final_score = judgeResult.score;
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
        evaluated_at: new Date().toISOString(),
        execution_time,
        execution_time_ms: execution_time,
        evaluation_run_id,
      },
      score: final_score,
      metadata: {
        conversation_history,
        current_turn,
        instructions,
        strict_mode: params.strict_mode,
        verbose_mode: params.verbose_mode,
        include_reason: params.include_reason,
        threshold,
        execution_time,
        evaluation_run_id,
        ...judgeResult.metadata,
      },
    };

    const createdOutput = await userDataStorageConnector.createDataPointOutput(
      evaluation_run_id,
      evaluationOutput,
    );

    return createdOutput;
  } catch (error) {
    console.error(
      `Error evaluating turn relevancy for data point (attempt ${retryCount + 1}):`,
      error,
    );

    // Retry logic for transient errors
    if (retryCount < maxRetries && isRetryableError(error)) {
      console.log(
        `Retrying data point evaluation (attempt ${retryCount + 2}/${maxRetries + 1})`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (retryCount + 1)),
      ); // Exponential backoff
      return evaluateSingleDataPoint(
        data_point,
        params,
        evaluation_run_id,
        llm_judge,
        userDataStorageConnector,
        retryCount + 1,
      );
    }

    const execution_time = Date.now() - start_time;

    const errorOutput: EvaluationOutputCreateParams = {
      data_point_id: data_point.id,
      output: {
        score: 0,
        passed: false,
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        threshold: params.threshold || 0.5,
        strict_mode: params.strict_mode,
        evaluated_at: new Date().toISOString(),
        execution_time,
        execution_time_ms: execution_time,
        evaluation_run_id,
        error: true,
      },
      score: 0,
      metadata: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time,
        evaluation_run_id,
        retry_count: retryCount,
      },
    };

    return await userDataStorageConnector.createDataPointOutput(
      evaluation_run_id,
      errorOutput,
    );
  }
}

async function processDataPointsInBatches(
  data_points: DataPoint[],
  params: TurnRelevancyEvaluationParameters,
  evaluation_run_id: string,
  llm_judge: LLMJudge,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<EvaluationOutput[]> {
  const batch_size = params.batch_size || 10;
  const results = [];

  for (let i = 0; i < data_points.length; i += batch_size) {
    const batch = data_points.slice(i, i + batch_size);

    if (params.async_mode !== false) {
      // Process batch in parallel
      const batchPromises = batch.map((data_point) =>
        evaluateSingleDataPoint(
          data_point,
          params,
          evaluation_run_id,
          llm_judge,
          userDataStorageConnector,
        ),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } else {
      // Process batch sequentially
      for (const data_point of batch) {
        const result = await evaluateSingleDataPoint(
          data_point,
          params,
          evaluation_run_id,
          llm_judge,
          userDataStorageConnector,
        );
        results.push(result);
      }
    }

    // Update evaluation run progress
    const processed = Math.min(i + batch_size, data_points.length);
    const percentage = Math.round((processed / data_points.length) * 100);

    console.log(
      `Turn relevancy evaluation progress: ${processed}/${data_points.length} (${percentage}%)`,
    );

    await userDataStorageConnector.updateEvaluationRun(evaluation_run_id, {
      status: EvaluationRunStatus.RUNNING,
      metadata: {
        progress: {
          processed,
          total: data_points.length,
          percentage,
          current_batch: Math.floor(i / batch_size) + 1,
          total_batches: Math.ceil(data_points.length / batch_size),
        },
      },
    });
  }

  return results;
}

export async function evaluateTurnRelevancyDataset(
  input: DatasetQueryParams,
  params: TurnRelevancyEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions?: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: TurnRelevancyAverageResult;
  evaluationRun: EvaluationRun;
}> {
  if (!userDataStorageConnector)
    throw new Error(
      'User data storage connector is required for dataset evaluation',
    );
  if (!input.id) throw new Error('Dataset ID is required for evaluation');
  const agent_id = params.agent_id;
  if (!agent_id) throw new Error('Agent ID is required for evaluation');

  const start_time = Date.now();

  // Create evaluation run
  const evaluationRunParams: EvaluationRunCreateParams = {
    dataset_id: input.id,
    agent_id,
    evaluation_method: EvaluationMethodName.TURN_RELEVANCY,
    name:
      evalRunOptions?.name ||
      `Turn Relevancy Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions?.description ||
      `Evaluates turn relevancy for dataset ${input.id}`,
    metadata: {
      parameters: params,
      method_config: {
        method: EvaluationMethodName.TURN_RELEVANCY,
        name: 'Turn Relevancy',
        description:
          'Evaluates whether a conversation turn is relevant to the prior context',
      },
      is_custom_evaluation: false,
    },
  };

  const evaluationRun =
    await userDataStorageConnector.createEvaluationRun(evaluationRunParams);

  const evaluation_run_id = evaluationRun.id;
  if (!evaluation_run_id) {
    throw new Error('Failed to create evaluation run - no ID returned');
  }

  try {
    // Get data points
    const data_points = await userDataStorageConnector.getDataPoints(input.id, {
      limit: input.limit || 10,
      offset: input.offset || 0,
    });

    if (!data_points || data_points.length === 0) {
      throw new Error('No data points found for evaluation');
    }

    // Create LLM judge
    const llm_judge = createLLMJudge({
      model: params.model || 'gpt-4o',
      temperature: params.temperature || 0.1,
      max_tokens: params.max_tokens || 1000,
    });

    // Process data points in batches
    const results = await processDataPointsInBatches(
      data_points,
      params,
      evaluation_run_id,
      llm_judge,
      userDataStorageConnector,
    );

    // Calculate aggregate results with detailed statistics
    const validResults = results.filter((r) => !r.metadata?.error);
    const errorResults = results.filter((r) => r.metadata?.error);
    const scores = validResults.map((r) => r.score || 0);

    const average_score =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const threshold = params.threshold || 0.5;
    const passed_count = validResults.filter(
      (r) => (r.score || 0) >= threshold,
    ).length;
    const failed_count = validResults.length - passed_count;

    // Calculate additional statistics
    const min_score = scores.length > 0 ? Math.min(...scores) : 0;
    const max_score = scores.length > 0 ? Math.max(...scores) : 0;
    const median_score =
      scores.length > 0
        ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
        : 0;

    console.log(`Turn relevancy evaluation completed:`, {
      total_data_points: data_points.length,
      valid_results: validResults.length,
      error_results: errorResults.length,
      average_score: average_score.toFixed(3),
      min_score: min_score.toFixed(3),
      max_score: max_score.toFixed(3),
      median_score: median_score.toFixed(3),
      passed_count,
      failed_count,
      threshold,
    });

    const averageResult = {
      average_score,
      total_data_points: data_points.length,
      passed_count,
      failed_count,
      threshold_used: threshold,
      evaluation_run_id,
      // Additional statistics
      min_score,
      max_score,
      median_score,
      valid_results_count: validResults.length,
      error_results_count: errorResults.length,
    } satisfies TurnRelevancyAverageResult;

    // Update evaluation run with final results
    const execution_time = Date.now() - start_time;
    await userDataStorageConnector.updateEvaluationRun(evaluation_run_id, {
      status: EvaluationRunStatus.COMPLETED,
      results: averageResult,
      metadata: {
        ...evaluationRun.metadata,
        results: averageResult,
        execution_time,
        execution_time_ms: execution_time,
        processed_data_points: validResults.length,
        error_count: results.length - validResults.length,
      },
      completed_at: new Date().toISOString(),
    });

    const updated = await userDataStorageConnector.getEvaluationRuns({
      id: evaluation_run_id,
    });
    const updatedRun = updated[0] || evaluationRun;

    return { averageResult, evaluationRun: updatedRun };
  } catch (error) {
    console.error('Error in turn relevancy evaluation:', error);

    // Update evaluation run with error status
    await userDataStorageConnector.updateEvaluationRun(evaluation_run_id, {
      status: EvaluationRunStatus.FAILED,
      results: {
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        ...evaluationRun.metadata,
        error: true,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - start_time,
      },
      completed_at: new Date().toISOString(),
    });

    throw error;
  }
}

// Single-turn evaluation function for backward compatibility
export async function evaluateTurnRelevancy(
  params: TurnRelevancyEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<{
  averageResult: TurnRelevancyAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const input: DatasetQueryParams = {
    id: params.dataset_id!,
    limit: params.limit,
    offset: params.offset,
  };

  return await evaluateTurnRelevancyDataset(
    input,
    params,
    userDataStorageConnector,
  );
}
