import { z } from 'zod';

export const FaithfulnessTemplateDataSchema = z.object({
  context: z.string(),
  answer: z.string(),
  retrieval_context: z.string().optional(),
  strict_mode: z.boolean().default(false),
  verbose_mode: z.boolean().default(false),
  include_reason: z.boolean().default(true),
});

export type FaithfulnessTemplateData = z.infer<
  typeof FaithfulnessTemplateDataSchema
>;

export const FaithfulnessTemplateConfigSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  outputFormat: z.literal('json'),
});

export type FaithfulnessTemplateConfig = z.infer<
  typeof FaithfulnessTemplateConfigSchema
>;

export const faithfulnessScoringText = `
Score Guidelines:
- 1.0: Answer is completely faithful to the context with no contradictions or unsupported claims
- 0.8-0.9: Answer is highly faithful with minor unsupported details
- 0.6-0.7: Answer is mostly faithful but includes some unsupported information
- 0.4-0.5: Answer is partially faithful but contains significant contradictions or unsupported claims
- 0.2-0.3: Answer is mostly unfaithful with only small portions supported by context
- 0.0-0.1: Answer is completely unfaithful or contradicts the context entirely

Consider:
- Does the answer accurately reflect the information in the context?
- Are there any contradictions between the answer and the context?
- Does the answer make claims not supported by the context?
- Is the answer consistent with the facts provided?
`;

export const FaithfulnessCriteriaSchema = z.object({
  faithfulness_score: z.number().min(0).max(1),
  supported_by_context: z.boolean(),
  no_contradictions: z.boolean(),
  consistent_facts: z.boolean(),
  unsupported_claims: z.boolean(),
});

export type FaithfulnessCriteria = z.infer<typeof FaithfulnessCriteriaSchema>;
