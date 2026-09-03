import { judgeOverrides } from '@api/connectors/evaluations/judge-overrides';
import { getTurnRelevancyTemplate } from '@api/connectors/evaluations/turn-relevancy/templates/main';
import { TurnRelevancyEvaluationParameters } from '@api/connectors/evaluations/turn-relevancy/types';
import { humanVerdictNote } from '@api/evaluations/human-verdict';
import { createLLMJudge } from '@api/evaluations/llm-judge';
import type {
  EvaluateLogOptions,
  UserDataStorageConnector,
} from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { resolveEvaluationModelConfig } from '@api/utils/evaluation-model-resolver';
import {
  extractSystemPromptFromMessages,
  formatMessagesForExtraction,
} from '@api/utils/messages';
import { extractMessagesFromRequestData } from '@api/utils/super-agents/requests';
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

import type { Log } from '@shared/types/data/log';
import { EvaluationMethodName } from '@shared/types/evaluations';

import { produceSuperAgentsRequestData } from '@shared/utils/sa-request-data';

function pickTurnRelevancyData(
  log: Log,
  params: TurnRelevancyEvaluationParameters,
): {
  conversation_history: string;
  current_turn: string;
  assistant_role: string;
  instructions?: string;
} {
  // Extract conversation history using standard utilities if not provided in params
  let conversation_history = params.conversation_history;
  let assistant_role = '';
  if (!conversation_history) {
    try {
      const saRequestData = produceSuperAgentsRequestData(
        log.ai_provider_request_log.method,
        log.ai_provider_request_log.request_url,
        {},
        log.ai_provider_request_log.request_body,
      );
      const messages = extractMessagesFromRequestData(
        saRequestData as
          | ChatCompletionRequestData
          | StreamChatCompletionRequestData
          | ResponsesRequestData,
      );
      conversation_history = formatMessagesForExtraction(messages);
      // Relevance is relative to the assistant's job: a title generator's
      // one-line answer is exactly on-turn even when the input quotes a
      // request it does not answer.
      assistant_role = extractSystemPromptFromMessages(messages);
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
      const responseBody = SuperAgentsResponseBody.parse(
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
  return { conversation_history, current_turn, assistant_role, instructions };
}

export async function evaluateLog(
  c: AppContext,
  evaluation: SkillOptimizationEvaluation,
  log: Log,
  storageConnector: UserDataStorageConnector,
  options?: EvaluateLogOptions,
): Promise<SkillOptimizationEvaluationResult> {
  const params = TurnRelevancyEvaluationParameters.parse(evaluation.params);

  // Resolve model configuration from evaluation.model_id or system settings
  const modelConfig = await resolveEvaluationModelConfig(
    c,
    evaluation,
    storageConnector,
  );

  const llmJudge = createLLMJudge(
    c,
    {
      temperature: params.temperature,
      ...judgeOverrides(params),
    },
    modelConfig ?? undefined,
  );

  const start_time = Date.now();

  const { conversation_history, current_turn, assistant_role, instructions } =
    pickTurnRelevancyData(log, params);

  const tpl = getTurnRelevancyTemplate({
    conversation_history,
    current_turn,
    assistant_role,
    human_verdict_note: options?.humanVerdict
      ? humanVerdictNote(options.humanVerdict, options.humanVerdictReason)
      : undefined,
    strict_mode: params.strict_mode || false,
    verbose_mode: params.verbose_mode ?? true,
    include_reason: params.include_reason ?? true,
  });

  // Explicit prompts, so the judge scores rather than extracts. Left to
  // re-split `text` on its own the judge can read the reply as an
  // extraction and report a flat 1.0 with the real score buried in
  // metadata -- which is what made every successful turn-relevancy run
  // score 1.0 regardless of what the judge concluded.
  const judgeResult = await llmJudge.evaluate({
    text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
    systemPrompt: tpl.systemPrompt,
    userPrompt: tpl.userPrompt,
  });

  let final_score = judgeResult.score;
  if (params.strict_mode) {
    final_score = final_score === 1.0 ? 1.0 : 0.0;
  }

  const execution_time = Date.now() - start_time;
  const judgeModelName = modelConfig?.model ?? null;
  const judgeModelProvider = modelConfig?.provider ?? null;

  const evaluationResult: SkillOptimizationEvaluationResult = {
    evaluation_id: evaluation.id,
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
    display_info: [
      {
        label: 'Reasoning',
        content: judgeResult.reasoning,
      },
      {
        label: 'Current Turn',
        content: current_turn,
      },
      ...(instructions
        ? [
            {
              label: 'Additional Instructions',
              content: instructions,
            },
          ]
        : []),
      {
        label: 'Conversation History',
        content: conversation_history,
      },
    ],
    judge_model_name: judgeModelName,
    judge_model_provider: judgeModelProvider,
  };

  return evaluationResult;
}
