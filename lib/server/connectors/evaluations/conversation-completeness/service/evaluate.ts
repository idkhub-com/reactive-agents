import type {
  ConversationCompletenessAverageResult,
  ConversationCompletenessEvaluationParameters,
  ConversationCompletenessResult,
} from '@server/connectors/evaluations/types/conversation-completeness';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { DataPoint } from '@shared/types/data/data-point';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';

/**
 * Evaluate conversation completeness for a single data point
 */
export async function evaluateConversationCompleteness(
  dataPoint: DataPoint,
  params: ConversationCompletenessEvaluationParameters,
): Promise<ConversationCompletenessResult> {
  // Create LLM judge instance
  const llm_judge = createLLMJudge({
    model: params.model || 'gpt-4o-mini',
    temperature: params.temperature || 0.1,
    max_tokens: params.max_tokens || 1000,
    timeout: params.timeout || 30000,
  });

  // Extract context and response from data point
  let context = '';
  let response = '';

  // Try to extract context from various possible fields
  if (typeof dataPoint.request_body?.context === 'string') {
    context = dataPoint.request_body.context;
  } else if (typeof dataPoint.request_body?.text === 'string') {
    context = dataPoint.request_body.text;
  } else if (typeof dataPoint.request_body?.prompt === 'string') {
    context = dataPoint.request_body.prompt;
  } else if (typeof dataPoint.request_body?.message === 'string') {
    context = dataPoint.request_body.message;
  } else {
    context = JSON.stringify(dataPoint.request_body);
  }

  // Try to extract response from various possible fields
  if (typeof dataPoint.ground_truth?.text === 'string') {
    response = dataPoint.ground_truth.text;
  } else if (typeof dataPoint.ground_truth?.response === 'string') {
    response = dataPoint.ground_truth.response;
  } else if (typeof dataPoint.ground_truth?.output === 'string') {
    response = dataPoint.ground_truth.output;
  } else if (typeof dataPoint.ground_truth?.result === 'string') {
    response = dataPoint.ground_truth.result;
  } else if (typeof dataPoint.metadata?.response === 'string') {
    response = dataPoint.metadata.response;
  } else {
    response = JSON.stringify(dataPoint.ground_truth);
  }

  // Validate that we have both context and response
  if (!context || !response) {
    throw new Error('Missing context or response in data point');
  }

  // Create a simple evaluation prompt that won't trigger template-based evaluation
  const evaluationText = `Analyze the following conversation for completeness quality. CONVERSATION: ${context} ASSISTANT RESPONSE: ${response} Consider how well the assistant completes the conversation by satisfying user needs. Look for: Whether all user intentions were identified and addressed, if the conversation feels complete and resolved, whether there are any unresolved user requests, and the overall satisfaction of user needs throughout the conversation. Provide a score between 0 and 1 with detailed reasoning for your analysis.`;

  // Evaluate using LLM judge with conversation completeness criteria
  const result = await llm_judge.evaluate({
    text: evaluationText,
    outputFormat: 'json',
    evaluationCriteria: {
      criteria: [
        'Extract all user intentions from the conversation',
        'Identify what the user is trying to accomplish',
        'Assess whether each user intention was satisfied by the assistant',
        'Evaluate the completeness of the conversation in addressing user needs',
        'Check for unresolved user requests or incomplete responses',
        'Calculate the conversation completeness score based on the formula: (Number of Satisfied User Intentions) / (Total Number of User Intentions)',
      ],
    },
  });

  return {
    score: result.score,
    reasoning: result.reasoning,
    metadata: result.metadata,
  };
}

/**
 * Evaluate conversation completeness for a batch of data points
 */
export async function evaluateConversationCompletenessBatch(
  dataPoints: DataPoint[],
  params: ConversationCompletenessEvaluationParameters,
): Promise<ConversationCompletenessResult[]> {
  const results: ConversationCompletenessResult[] = [];

  for (const dataPoint of dataPoints) {
    try {
      const result = await evaluateConversationCompleteness(dataPoint, params);
      results.push(result);
    } catch (error) {
      console.error(
        `Error evaluating conversation completeness for data point ${dataPoint.id}:`,
        error,
      );
      results.push({
        score: 0,
        reasoning: `Evaluation failed - ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: { error: true },
      });
    }
  }

  return results;
}

/**
 * Main conversation completeness evaluation function
 */
export async function evaluateConversationCompletenessMain(
  input: {
    id: string;
    limit?: number;
    offset?: number;
  },
  params: ConversationCompletenessEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions?: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: ConversationCompletenessAverageResult;
  evaluationRun: EvaluationRun;
}> {
  const start_time = Date.now();

  // Create evaluation run
  const evaluationRun = await userDataStorageConnector.createEvaluationRun({
    agent_id: params.agent_id!,
    dataset_id: input.id!,
    evaluation_method: EvaluationMethodName.CONVERSATION_COMPLETENESS,
    name: evalRunOptions?.name || 'Conversation Completeness Evaluation',
    description:
      evalRunOptions?.description ||
      'Evaluating conversation completeness quality',
    metadata: { parameters: params },
  });

  try {
    // Get data points
    const data_points = await userDataStorageConnector.getDataPoints(
      input.id!,
      {
        limit: input.limit || 10,
        offset: input.offset || 0,
      },
    );

    if (data_points.length === 0) {
      throw new Error('No data points found for evaluation');
    }

    // Evaluate all data points
    const results = await evaluateConversationCompletenessBatch(
      data_points,
      params,
    );

    // Create evaluation outputs
    const evaluationOutputs = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const dataPoint = data_points[i];

      const output = await userDataStorageConnector.createDataPointOutput(
        evaluationRun.id,
        {
          data_point_id: dataPoint.id,
          score: result.score,
          output: {
            score: result.score,
            reasoning: result.reasoning,
            passed: result.score >= (params.threshold || 0.5),
            threshold: params.threshold || 0.5,
            execution_time_ms: 0,
            evaluated_at: new Date().toISOString(),
            evaluation_run_id: evaluationRun.id,
          },
          metadata: result.metadata || {},
        },
      );

      evaluationOutputs.push(output);
    }

    // Calculate statistics
    const scores = results.map((r) => r.score);
    const threshold = params.threshold || 0.5;
    const passedDataPoints = scores.filter((s) => s >= threshold).length;
    const failedDataPoints = scores.length - passedDataPoints;

    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const execution_time = Date.now() - start_time;

    const averageResult: ConversationCompletenessAverageResult = {
      average_score: averageScore,
      total_data_points: data_points.length,
      passed_count: passedDataPoints,
      failed_count: failedDataPoints,
      threshold_used: params.threshold || 0.5,
      evaluation_run_id: evaluationRun.id,
    };

    // Update evaluation run with results
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.COMPLETED,
      results: {
        total_data_points: data_points.length,
        passed_count: passedDataPoints,
        failed_count: failedDataPoints,
        average_score: averageScore,
        threshold_used: params.threshold || 0.5,
        evaluation_outputs: evaluationOutputs.map((output) => output.id),
        total_execution_time: execution_time,
        total_execution_time_ms: execution_time,
      },
      metadata: {
        ...evaluationRun.metadata,
        total_data_points: data_points.length,
        passed_count: passedDataPoints,
        failed_count: failedDataPoints,
        average_score: averageScore,
        threshold_used: params.threshold || 0.5,
        completed_at: new Date().toISOString(),
      },
    });

    return { averageResult, evaluationRun };
  } catch (error) {
    // Update evaluation run with error
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.FAILED,
      results: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      metadata: {
        ...evaluationRun.metadata,
        error: error instanceof Error ? error.message : 'Unknown error',
        failed_at: new Date().toISOString(),
      },
    });

    throw error;
  }
}
