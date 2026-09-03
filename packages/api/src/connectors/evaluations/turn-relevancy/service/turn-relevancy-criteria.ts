import { getTurnRelevancyTemplate } from '@api/connectors/evaluations/turn-relevancy/templates/main';
import {
  type TurnRelevancyMetadata,
  TurnRelevancyResultSchema,
} from '@api/connectors/evaluations/turn-relevancy/types';
import { createLLMJudge, withExtraCriteria } from '@api/evaluations/llm-judge';
import type {
  GenericEvaluationInput,
  GenericEvaluator,
} from '@api/types/evaluations/generic';
import type { LLMJudgeResult } from '@api/types/evaluations/llm-judge';
import type { AppContext } from '@api/types/hono';
import { z } from 'zod';

export const TurnRelevancyCriteriaSchema = z.object({
  description: z.string().optional(),
  strict_mode: z.boolean().optional().default(false),
  verbose_mode: z.boolean().optional().default(true),
  include_reason: z.boolean().optional().default(true),
});
export type TurnRelevancyCriteria = z.infer<typeof TurnRelevancyCriteriaSchema>;

export const TurnRelevancyInputSchema = z.object({
  conversation_history: z.string(),
  current_turn: z.string(),
  criteria: TurnRelevancyCriteriaSchema.optional(),
});
export type TurnRelevancyInput = z.infer<typeof TurnRelevancyInputSchema>;

function parseTurnRelevancyResult(response: LLMJudgeResult): LLMJudgeResult {
  if (response.reasoning.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(response.reasoning);
      const validated = TurnRelevancyResultSchema.parse(parsed);
      return {
        score: validated.score,
        reasoning: validated.reasoning || response.reasoning,
        metadata: {
          ...response.metadata,
          criteria: validated.metadata,
          parsed_with_schema: true,
        },
      };
    } catch {
      // ignore parse errors, fall through
    }
  }
  return {
    ...response,
    metadata: { ...response.metadata, parsed_with_schema: false },
  };
}

async function evaluateTurnRelevancyWithJudge(
  c: AppContext,
  input: TurnRelevancyInput,
): Promise<LLMJudgeResult> {
  const llmJudge = createLLMJudge(c);
  const tpl = getTurnRelevancyTemplate({
    conversation_history: input.conversation_history,
    current_turn: input.current_turn,
    strict_mode: input.criteria?.strict_mode || false,
    verbose_mode: input.criteria?.verbose_mode ?? true,
    include_reason: input.criteria?.include_reason ?? true,
  });

  // The caller's description is extra criteria for this metric, not a
  // replacement for it: appended to the template rather than handed to the
  // generic criteria judge, which would drop the template altogether.
  const userPrompt = withExtraCriteria(
    tpl.userPrompt,
    input.criteria?.description,
  );
  const result = await llmJudge.evaluate({
    text: `${tpl.systemPrompt}\n\n${userPrompt}`,
    systemPrompt: tpl.systemPrompt,
    userPrompt,
  });

  return parseTurnRelevancyResult(result);
}

export function createTurnRelevancyEvaluator(
  c: AppContext,
): GenericEvaluator<TurnRelevancyMetadata> & {
  evaluateTurnRelevancy: (
    c: AppContext,
    input: TurnRelevancyInput,
  ) => Promise<LLMJudgeResult>;
} {
  const llmJudge = createLLMJudge(c);
  return {
    evaluate: async (input: GenericEvaluationInput<TurnRelevancyMetadata>) => {
      const conversation_history = input.metadata?.conversation_history || '';
      const current_turn = input.metadata?.current_turn || '';
      const criteria = input.metadata?.criteria
        ? {
            description: input.metadata.criteria.description,
            strict_mode: input.metadata.criteria.strict_mode || false,
            verbose_mode: input.metadata.criteria.verbose_mode ?? true,
            include_reason: input.metadata.criteria.include_reason ?? true,
          }
        : undefined;

      const tpl = getTurnRelevancyTemplate({
        conversation_history,
        current_turn,
        strict_mode: criteria?.strict_mode || false,
        verbose_mode: criteria?.verbose_mode ?? true,
        include_reason: criteria?.include_reason ?? true,
      });

      const userPrompt = withExtraCriteria(
        tpl.userPrompt,
        criteria?.description,
      );
      const result = await llmJudge.evaluate({
        text: `${tpl.systemPrompt}\n\n${userPrompt}`,
        systemPrompt: tpl.systemPrompt,
        userPrompt,
      });

      const parsed = parseTurnRelevancyResult(result);
      return {
        score: parsed.score,
        reasoning: parsed.reasoning,
        metadata: parsed.metadata,
      };
    },
    evaluateTurnRelevancy,
    config: llmJudge.config,
  };
}

export async function evaluateTurnRelevancy(
  c: AppContext,
  input: TurnRelevancyInput,
): Promise<LLMJudgeResult> {
  return await evaluateTurnRelevancyWithJudge(c, input);
}
