import { getTurnRelevancyTemplate } from '@server/connectors/evaluations/turn-relevancy/templates/main';
import { TurnRelevancyEvaluationParameters } from '@server/connectors/evaluations/turn-relevancy/types';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import { extractMessagesFromRequestData } from '@server/utils/idkhub/requests';
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

function pickTurnRelevancyData(
  log: Log,
  params: TurnRelevancyEvaluationParameters,
): {
  conversation_history: string;
  current_turn: string;
  instructions?: string;
} {
  // Extract conversation history using standard utilities if not provided in params
  let conversation_history = params.conversation_history;
  if (!conversation_history) {
    try {
      const idkRequestData = produceIdkRequestData(
        log.ai_provider_request_log.method,
        log.ai_provider_request_log.request_url,
        {},
        log.ai_provider_request_log.request_body,
      );
      const messages = extractMessagesFromRequestData(
        idkRequestData as
          | ChatCompletionRequestData
          | StreamChatCompletionRequestData
          | ResponsesRequestData,
      );
      conversation_history = formatMessagesForExtraction(messages);
    } catch {
      // Fallback to metadata if parsing fails
      conversation_history =
        (log.metadata?.conversation_history as string) || '';
    }
  }

  // Extract current turn using standard utilities if not provided in params
  let current_turn = params.current_turn;
  if (!current_turn) {
    try {
      const responseBody = IdkResponseBody.parse(
        log.ai_provider_request_log.response_body,
      );
      current_turn = extractOutputFromResponseBody(responseBody);
    } catch {
      // Fallback to metadata if parsing fails
      current_turn =
        (typeof log.metadata?.ground_truth === 'string'
          ? (log.metadata.ground_truth as string)
          : log.metadata?.ground_truth
            ? JSON.stringify(log.metadata.ground_truth)
            : (log.metadata?.current_turn as string) || '') || '';
    }
  }

  const instructions =
    params.instructions || (log.metadata?.instructions as string);
  return { conversation_history, current_turn, instructions };
}

export async function evaluateLog(
  evaluation: SkillOptimizationEvaluation,
  log: Log,
): Promise<SkillOptimizationEvaluationResult> {
  const params = TurnRelevancyEvaluationParameters.parse(evaluation.params);

  const llmJudge = createLLMJudge({
    model: params.model,
    temperature: params.temperature,
    max_tokens: params.max_tokens,
  });

  const start_time = Date.now();

  const { conversation_history, current_turn, instructions } =
    pickTurnRelevancyData(log, params);

  const tpl = getTurnRelevancyTemplate({
    conversation_history,
    current_turn,
    strict_mode: params.strict_mode || false,
    verbose_mode: params.verbose_mode ?? true,
    include_reason: params.include_reason ?? true,
  });

  const judgeResult = await llmJudge.evaluate({
    text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
    outputFormat: 'json',
  });

  let final_score = judgeResult.score;
  if (params.strict_mode) {
    final_score = final_score === 1.0 ? 1.0 : 0.0;
  }

  const execution_time = Date.now() - start_time;

  const evaluationResult: SkillOptimizationEvaluationResult = {
    method: EvaluationMethodName.TURN_RELEVANCY,
    score: final_score,
    extra_data: {
      reasoning: judgeResult.reasoning,
      conversation_history,
      current_turn,
      instructions,
      strict_mode: params.strict_mode,
      metadata: judgeResult.metadata,
      execution_time,
      execution_time_ms: execution_time,
      evaluated_at: new Date().toISOString(),
    },
  };

  return evaluationResult;
}
