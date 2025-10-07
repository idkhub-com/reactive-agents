import { createLLMJudge } from '@server/evaluations/llm-judge';

import type { UserDataStorageConnector } from '@server/types/connector';
import type {
  EvaluationRun,
  EvaluationRunCreateParams,
} from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import type { Log } from '@shared/types/data/log';
import type {
  LogOutput as EvaluationOutput,
  LogOutputCreateParams as EvaluationOutputCreateParams,
} from '@shared/types/data/log-output';
import { EvaluationMethodName } from '@shared/types/idkhub/evaluations';
import { AnswerRelevancyEvaluationParameters } from '@shared/types/idkhub/evaluations/answer-relevancy';
import type { LLMJudge } from '@shared/types/idkhub/evaluations/llm-judge';
import type { IdkRequestLog } from '@shared/types/idkhub/observability';
import { v4 as uuidv4 } from 'uuid';
import { getAnswerRelevancyTemplate } from '../templates/main';

function pickAnswerRelevancyData(
  log: Log,
  params: AnswerRelevancyEvaluationParameters,
): {
  question: string;
  answer: string;
  context?: string;
} {
  // Extract question from parameters or log metadata
  let question = params.question || '';

  if (!question) {
    // Try to extract from request body
    const requestBody = (log.ai_provider_request_log as Record<string, unknown>)
      ?.request_body as Record<string, unknown>;

    if (requestBody) {
      const possibleInput =
        requestBody.input || requestBody.messages || requestBody.prompt;
      if (possibleInput) {
        if (Array.isArray(possibleInput)) {
          question = possibleInput
            .map((msg: Record<string, unknown>) => {
              const role = typeof msg.role === 'string' ? msg.role : 'unknown';
              const content =
                msg.content !== undefined ? String(msg.content) : '';
              return `${role}: ${content}`;
            })
            .join('\n');
        } else if (typeof possibleInput === 'string') {
          question = possibleInput;
        } else {
          question = JSON.stringify(possibleInput);
        }
      }
    }
  }

  // If still no question, try to extract from user input or other fields
  if (!question) {
    // Try metadata fields
    const userInput = log.metadata?.user_input as string;
    if (userInput) {
      question = userInput;
    } else {
      // Try to extract from the endpoint or function name as fallback
      question = `Request to ${log.endpoint || log.function_name || 'unknown endpoint'}`;
    }
  }

  // Extract answer from parameters or log response
  let answer = params.answer || '';

  if (!answer) {
    if (log.ai_provider_request_log?.response_body) {
      if (typeof log.ai_provider_request_log.response_body === 'string') {
        answer = log.ai_provider_request_log.response_body;
      } else {
        answer = JSON.stringify(log.ai_provider_request_log.response_body);
      }
    } else if (log.metadata?.ground_truth) {
      if (typeof log.metadata.ground_truth === 'string') {
        answer = log.metadata.ground_truth;
      } else {
        answer = JSON.stringify(log.metadata.ground_truth);
      }
    } else {
      // Try to extract from assistant response in metadata
      const assistantResponse = log.metadata?.assistant_response as string;
      if (assistantResponse) {
        answer = assistantResponse;
      } else {
        // Fallback to status-based response
        answer = `Response with status ${log.status}`;
      }
    }
  }

  // Extract context if available
  const context = params.context || (log.metadata?.context as string) || '';

  // Log the extracted data for debugging
  console.log(`Answer Relevancy - Extracted data for log ${log.id}:`, {
    question: question.substring(0, 100) + (question.length > 100 ? '...' : ''),
    answer: answer.substring(0, 100) + (answer.length > 100 ? '...' : ''),
    context: context.substring(0, 50) + (context.length > 50 ? '...' : ''),
  });

  return { question, answer, context };
}

async function evaluateSingleLog(
  log: Log,
  params: AnswerRelevancyEvaluationParameters,
  evaluation_run_id: string,
  llm_judge: LLMJudge,
  userDataStorageConnector: UserDataStorageConnector,
  retryCount = 0,
): Promise<EvaluationOutput> {
  const start_time = Date.now();
  const _evaluation_output_id = uuidv4();
  const maxRetries = 2;

  try {
    const { question, answer, context } = pickAnswerRelevancyData(log, params);

    // Validate that we have meaningful data to evaluate
    if (!question || question.trim().length === 0) {
      throw new Error('No question found in log data');
    }
    if (!answer || answer.trim().length === 0) {
      throw new Error('No answer found in log data');
    }

    console.log(
      `Answer Relevancy - Evaluating log ${log.id} with question: "${question.substring(0, 50)}..." and answer: "${answer.substring(0, 50)}..."`,
    );

    const tpl = getAnswerRelevancyTemplate({
      question,
      answer,
      context,
      strict_mode: params.strict_mode || false,
      verbose_mode: params.verbose_mode ?? true,
      include_reason: params.include_reason ?? true,
    });

    const judgeResult = await llm_judge.evaluate({
      text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
      outputFormat: 'json',
    });

    console.log(`Answer Relevancy - Judge result for log ${log.id}:`, {
      score: judgeResult.score,
      reasoning: `${judgeResult.reasoning?.substring(0, 100)}...`,
    });

    let final_score = judgeResult.score;
    let threshold = params.threshold || 0.7;
    if (params.strict_mode) {
      final_score = final_score === 1.0 ? 1.0 : 0.0;
      threshold = 1.0;
    }

    const passed = final_score >= threshold;
    const execution_time = Date.now() - start_time;

    const evaluationOutput: EvaluationOutputCreateParams = {
      log_id: log.id,
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
        question,
        answer,
        context,
        strict_mode: params.strict_mode,
        verbose_mode: params.verbose_mode,
        include_reason: params.include_reason,
        threshold,
        execution_time,
        evaluation_run_id,
        ...judgeResult.metadata,
      },
    };

    const createdOutput = await userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      evaluationOutput,
    );

    return createdOutput;
  } catch (error) {
    console.error(
      `Error evaluating log ${log.id} for answer relevancy:`,
      error,
    );

    if (retryCount < maxRetries) {
      console.log(
        `Retrying evaluation for log ${log.id} (attempt ${retryCount + 1})`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * (retryCount + 1)),
      );
      return evaluateSingleLog(
        log,
        params,
        evaluation_run_id,
        llm_judge,
        userDataStorageConnector,
        retryCount + 1,
      );
    }

    // Create a failed evaluation output
    const failedOutput: EvaluationOutputCreateParams = {
      log_id: log.id,
      output: {
        score: 0,
        passed: false,
        reasoning: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        threshold: params.threshold || 0.7,
        strict_mode: params.strict_mode,
        evaluated_at: new Date().toISOString(),
        execution_time: Date.now() - start_time,
        execution_time_ms: Date.now() - start_time,
        evaluation_run_id,
      },
      score: 0,
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        retry_count: retryCount,
        evaluation_run_id,
      },
    };

    return userDataStorageConnector.createLogOutput(
      evaluation_run_id,
      failedOutput,
    );
  }
}

export async function evaluateOneLogForAnswerRelevancy(
  evaluationRunId: string,
  log: IdkRequestLog,
  userDataStorageConnector: UserDataStorageConnector,
): Promise<void> {
  console.log(
    `Answer Relevancy - Starting evaluation for log ${log.id} in run ${evaluationRunId}`,
  );

  // Get the evaluation run to access parameters
  const evaluationRuns = await userDataStorageConnector.getEvaluationRuns({
    id: evaluationRunId,
  });
  const evaluationRun = evaluationRuns[0];
  if (!evaluationRun) {
    console.error(
      `Answer Relevancy - Evaluation run ${evaluationRunId} not found`,
    );
    throw new Error(`Evaluation run ${evaluationRunId} not found`);
  }

  console.log(
    `Answer Relevancy - Found evaluation run ${evaluationRunId} with method ${evaluationRun.evaluation_method}`,
  );

  let params: AnswerRelevancyEvaluationParameters;
  try {
    params = AnswerRelevancyEvaluationParameters.parse(
      evaluationRun.metadata?.parameters || {},
    );
    console.log(`Answer Relevancy - Parsed parameters:`, {
      threshold: params.threshold,
      model: params.model,
      strict_mode: params.strict_mode,
    });
  } catch (error) {
    console.error(
      `Answer Relevancy - Error parsing parameters for run ${evaluationRunId}:`,
      error,
    );
    // Use default parameters as fallback
    params = {
      threshold: 0.7,
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 1000,
      include_reason: true,
      strict_mode: false,
      async_mode: true,
      verbose_mode: false,
      batch_size: 10,
    };
  }

  // Convert IdkRequestLog to Log format for compatibility
  const logForEvaluation: Log = log as Log;

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  // Evaluate the single log
  await evaluateSingleLog(
    logForEvaluation,
    params,
    evaluationRunId,
    llmJudge,
    userDataStorageConnector,
  );

  // Get all log outputs for this evaluation run to calculate new average
  const allLogOutputs = await userDataStorageConnector.getLogOutputs(
    evaluationRunId,
    {},
  );

  // Recalculate the evaluation run statistics
  const scores = allLogOutputs.map((output) => output.score || 0);
  const averageScore = scores.length
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;

  const thresholdUsed = params.strict_mode ? 1.0 : params.threshold || 0.7;
  const passedCount = scores.filter((score) => score >= thresholdUsed).length;
  const failedCount = scores.length - passedCount;

  // Calculate additional statistics
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const medianScore =
    scores.length > 0
      ? scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
      : 0;

  // Update the evaluation run with new statistics
  await userDataStorageConnector.updateEvaluationRun(evaluationRunId, {
    results: {
      average_score: averageScore,
      total_logs: scores.length,
      passed_count: passedCount,
      failed_count: failedCount,
      threshold_used: thresholdUsed,
      min_score: minScore,
      max_score: maxScore,
      median_score: medianScore,
      evaluation_outputs: allLogOutputs.map((o) => o.id),
    },
    metadata: {
      ...evaluationRun.metadata,
      average_score: averageScore,
      total_logs: scores.length,
      passed_count: passedCount,
      failed_count: failedCount,
      threshold_used: thresholdUsed,
      min_score: minScore,
      max_score: maxScore,
      median_score: medianScore,
      evaluation_outputs: allLogOutputs.map((o) => o.id),
    },
  });
}

export async function evaluateAnswerRelevancy(
  agentId: string,
  skillId: string,
  datasetId: string,
  params: AnswerRelevancyEvaluationParameters,
  userDataStorageConnector: UserDataStorageConnector,
  evalRunOptions: {
    name?: string;
    description?: string;
  },
): Promise<{
  averageResult: {
    average_score: number;
    total_logs: number;
    passed_logs: number;
    failed_logs: number;
    pass_rate: number;
  };
  evaluationRun: EvaluationRun;
}> {
  const start_time = Date.now();

  // Create initial evaluation run record
  const evaluationRunCreateParams: EvaluationRunCreateParams = {
    dataset_id: datasetId,
    agent_id: agentId,
    skill_id: skillId,
    evaluation_method: EvaluationMethodName.ANSWER_RELEVANCY,
    name:
      evalRunOptions.name ||
      `Answer Relevancy Evaluation - ${new Date().toISOString()}`,
    description:
      evalRunOptions.description ||
      `Evaluates whether AI assistant answers are relevant to user questions for dataset ${datasetId}`,
    metadata: {
      parameters: params,
      is_custom_evaluation: false,
    },
  };

  const evaluationRun = await userDataStorageConnector.createEvaluationRun(
    evaluationRunCreateParams,
  );

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  try {
    // Get logs from database
    const logs = await userDataStorageConnector.getDatasetLogs(datasetId, {});

    if (logs.length === 0) {
      throw new Error('No logs found in dataset');
    }

    // Process logs in batches
    const batchSize = params.batch_size || 10;
    const allOutputs: EvaluationOutput[] = [];

    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      const batchPromises = batch.map((log) =>
        evaluateSingleLog(
          log,
          params,
          evaluationRun.id,
          llmJudge,
          userDataStorageConnector,
        ),
      );

      const batchResults = await Promise.all(batchPromises);
      allOutputs.push(...batchResults);
    }

    // Calculate average results
    const totalLogs = allOutputs.length;
    const passedLogs = allOutputs.filter(
      (output) => (output.score || 0) >= (params.threshold || 0.7),
    ).length;
    const failedLogs = totalLogs - passedLogs;
    const averageScore =
      allOutputs.reduce((sum, output) => sum + (output.score || 0), 0) /
      totalLogs;
    const passRate = passedLogs / totalLogs;

    const averageResult = {
      average_score: averageScore,
      total_logs: totalLogs,
      passed_logs: passedLogs,
      failed_logs: failedLogs,
      pass_rate: passRate,
    };

    // Update evaluation run with results
    const updatedRun = await userDataStorageConnector.updateEvaluationRun(
      evaluationRun.id,
      {
        status: EvaluationRunStatus.COMPLETED,
        results: averageResult,
        completed_at: new Date().toISOString(),
      },
    );

    return {
      averageResult,
      evaluationRun: updatedRun,
    };
  } catch (error) {
    console.error('Error in answer relevancy evaluation:', error);

    // Update evaluation run with error status
    await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
      status: EvaluationRunStatus.FAILED,
      results: {
        error: error instanceof Error ? error.message : 'Unknown error',
        execution_time: Date.now() - start_time,
      },
      completed_at: new Date().toISOString(),
    });

    throw error;
  }
}
