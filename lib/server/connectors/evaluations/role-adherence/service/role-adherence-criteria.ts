import { getRoleAdherenceMainTemplate } from '@server/connectors/evaluations/role-adherence/templates/main';
import type { RoleAdherenceMetadata } from '@server/connectors/evaluations/types/role-adherence';
import { RoleAdherenceResultSchema } from '@server/connectors/evaluations/types/role-adherence';
import { createLLMJudge } from '@server/evaluations/llm-judge';
import type {
  GenericEvaluationInput,
  GenericEvaluator,
} from '@shared/types/idkhub/evaluations/generic';
import type { LLMJudgeResult } from '@shared/types/idkhub/evaluations/llm-judge';
import { z } from 'zod';

export const RoleAdherenceCriteriaSchema = z.object({
  description: z.string().optional(),
  strict_mode: z.boolean().optional().default(false),
  verbose_mode: z.boolean().optional().default(true),
  include_reason: z.boolean().optional().default(true),
});
export type RoleAdherenceCriteria = z.infer<typeof RoleAdherenceCriteriaSchema>;

export const RoleAdherenceInputSchema = z.object({
  role_definition: z.string(),
  assistant_output: z.string(),
  instructions: z.string().optional(),
  criteria: RoleAdherenceCriteriaSchema.optional(),
});
export type RoleAdherenceInput = z.infer<typeof RoleAdherenceInputSchema>;

function parseRoleAdherenceResult(response: LLMJudgeResult): LLMJudgeResult {
  if (response.reasoning.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(response.reasoning);
      const validated = RoleAdherenceResultSchema.parse(parsed);
      return {
        score: validated.score,
        reasoning: validated.reasoning || response.reasoning,
        metadata: {
          ...response.metadata,
          criteria: validated.criteria,
          overall_success: validated.overall_success,
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

async function evaluateRoleAdherenceWithJudge(
  input: RoleAdherenceInput,
): Promise<LLMJudgeResult> {
  const llmJudge = createLLMJudge();
  const tpl = getRoleAdherenceMainTemplate({
    role_definition: input.role_definition,
    assistant_output: input.assistant_output,
    instructions: input.instructions,
    strict_mode: input.criteria?.strict_mode || false,
    verbose_mode: input.criteria?.verbose_mode ?? true,
    include_reason: input.criteria?.include_reason ?? true,
  });

  const result = await llmJudge.evaluate({
    text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
    evaluationCriteria: input.criteria?.description
      ? { criteria: [input.criteria.description] }
      : undefined,
  });

  return parseRoleAdherenceResult(result);
}

export function createRoleAdherenceEvaluator(): GenericEvaluator<RoleAdherenceMetadata> & {
  evaluateRoleAdherence: (input: RoleAdherenceInput) => Promise<LLMJudgeResult>;
} {
  const llmJudge = createLLMJudge();
  return {
    evaluate: async (input: GenericEvaluationInput<RoleAdherenceMetadata>) => {
      const role_definition = input.metadata?.role_definition || '';
      const assistant_output = input.metadata?.assistant_output || '';
      const instructions = input.metadata?.instructions || undefined;
      const criteria = input.metadata?.criteria
        ? {
            description: input.metadata.criteria.description,
            strict_mode: input.metadata.criteria.strict_mode || false,
            verbose_mode: input.metadata.criteria.verbose_mode ?? true,
            include_reason: input.metadata.criteria.include_reason ?? true,
          }
        : undefined;

      const tpl = getRoleAdherenceMainTemplate({
        role_definition,
        assistant_output,
        instructions,
        strict_mode: criteria?.strict_mode || false,
        verbose_mode: criteria?.verbose_mode ?? true,
        include_reason: criteria?.include_reason ?? true,
      });

      const result = await llmJudge.evaluate({
        text: `${tpl.systemPrompt}\n\n${tpl.userPrompt}`,
        evaluationCriteria: criteria?.description
          ? { criteria: [criteria.description] }
          : undefined,
      });

      const parsed = parseRoleAdherenceResult(result);
      return {
        score: parsed.score,
        reasoning: parsed.reasoning,
        metadata: parsed.metadata as RoleAdherenceMetadata,
      };
    },
    evaluateRoleAdherence: async (input: RoleAdherenceInput) => {
      return await evaluateRoleAdherenceWithJudge(input);
    },
    config: llmJudge.config,
  };
}

export async function evaluateRoleAdherence(
  input: RoleAdherenceInput,
): Promise<LLMJudgeResult> {
  return await evaluateRoleAdherenceWithJudge(input);
}
