import type {
  ConversationCompletenessAverageResult,
  ConversationCompletenessEvaluationParameters,
  ConversationCompletenessResult,
} from '@server/connectors/evaluations/types/conversation-completeness';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type { UserDataStorageConnector } from '@server/types/connector';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations/evaluations';

/**
 * Evaluate conversation completeness for a single log
 */
export async function evaluateConversationCompleteness(
  log: Log,
  params: ConversationCompletenessEvaluationParameters,
): Promise<ConversationCompletenessResult> {
  // Create LLM judge instance
  const llm_judge = createLLMJudge({
    model: params.model || 'gpt-4o-mini',
    temperature: params.temperature || 0.1,
    max_tokens: params.max_tokens || 1000,
    timeout: params.timeout || 30000,
  });

  // Extract context and response from log
  let context = '';
  let response = '';

  // Try to extract context from various possible fields
  const requestBody = (log.ai_provider_request_log as Record<string, unknown>)
    ?.request_body as Record<string, unknown>;
  if (typeof requestBody?.context === 'string') {
    context = requestBody.context;
  } else if (typeof requestBody?.text === 'string') {
    context = requestBody.text;
  } else if (typeof requestBody?.prompt === 'string') {
    context = requestBody.prompt;
  } else if (typeof requestBody?.message === 'string') {
    context = requestBody.message;
  } else {
    context = JSON.stringify(requestBody);
  }

  // Try to extract response from various possible fields
  const groundTruth = log.metadata?.ground_truth as Record<string, unknown>;
  if (typeof groundTruth?.text === 'string') {
    response = groundTruth.text;
  } else if (typeof groundTruth?.response === 'string') {
    response = groundTruth.response;
  } else if (typeof groundTruth?.output === 'string') {
    response = groundTruth.output;
  } else if (typeof groundTruth?.result === 'string') {
    response = groundTruth.result;
  } else if (typeof log.metadata?.response === 'string') {
    response = log.metadata.response;
  } else {
    response = JSON.stringify(groundTruth);
  }

  // Validate that we have both context and response
  if (!context || !response) {
    throw new Error('Missing context or response in log');
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
 * Evaluate conversation completeness for a batch of logs
 */
export async function evaluateConversationCompletenessBatch(
  logs: Log[],
  params: ConversationCompletenessEvaluationParameters,
): Promise<ConversationCompletenessResult[]> {
  const results: ConversationCompletenessResult[] = [];

  for (const log of logs) {
    try {
      const result = await evaluateConversationCompleteness(log, params);
      results.push(result);
    } catch (error) {
      console.error(
        `Error evaluating conversation completeness for log ${log.id}:`,
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
    // Get logs
    const logs = await userDataStorageConnector.getDatasetLogs(input.id!, {
      limit: input.limit || 10,
      offset: input.offset || 0,
    });

    if (logs.length === 0) {
      throw new Error('No logs found for evaluation');
    }

    // Evaluate all logs
    const results = await evaluateConversationCompletenessBatch(logs, params);

    // Create evaluation outputs
    const evaluationOutputs = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const log = logs[i];

      const output = await userDataStorageConnector.createLogOutput(
        evaluationRun.id,
        {
          log_id: log.id,
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
    const passedLogs = scores.filter((s) => s >= threshold).length;
    const failedLogs = scores.length - passedLogs;

    const averageScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const execution_time = Date.now() - start_time;

    const averageResult: ConversationCompletenessAverageResult = {
      average_score: averageScore,
      total_logs: logs.length,
      passed_count: passedLogs,
      failed_count: failedLogs,
      threshold_used: params.threshold || 0.5,
      evaluation_run_id: evaluationRun.id,
    };

    // Update evaluation run with results
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.COMPLETED,
      results: {
        total_logs: logs.length,
        passed_count: passedLogs,
        failed_count: failedLogs,
        average_score: averageScore,
        threshold_used: params.threshold || 0.5,
        evaluation_outputs: evaluationOutputs.map((output) => output.id),
        total_execution_time: execution_time,
        total_execution_time_ms: execution_time,
      },
      metadata: {
        ...evaluationRun.metadata,
        total_logs: logs.length,
        passed_count: passedLogs,
        failed_count: failedLogs,
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
