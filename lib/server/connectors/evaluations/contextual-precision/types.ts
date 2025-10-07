import { z } from 'zod';

export const ContextualPrecisionTemplateDataSchema = z.object({
  context: z.string(),
  answer: z.string(),
  retrieval_context: z.string().optional(),
  strict_mode: z.boolean().default(false),
  verbose_mode: z.boolean().default(false),
  include_reason: z.boolean().default(true),
});

export type ContextualPrecisionTemplateData = z.infer<
  typeof ContextualPrecisionTemplateDataSchema
>;

export const ContextualPrecisionTemplateConfigSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  outputFormat: z.literal('json'),
});

export type ContextualPrecisionTemplateConfig = z.infer<
  typeof ContextualPrecisionTemplateConfigSchema
>;

export const contextualPrecisionScoringText = `
Score Guidelines:
- 1.0: Answer is completely precise and only uses relevant information from the context
- 0.8-0.9: Answer is highly precise with minimal irrelevant information
- 0.6-0.7: Answer is mostly precise but includes some irrelevant details
- 0.4-0.5: Answer is partially precise but contains significant irrelevant information
- 0.2-0.3: Answer is mostly imprecise with only small portions being relevant
- 0.0-0.1: Answer is completely imprecise or doesn't use context information at all

Consider:
- Does the answer only use relevant information from the context?
- Are there irrelevant details that don't contribute to answering the question?
- Is the information presented in a precise and focused manner?
- Does the answer avoid unnecessary or tangential information?
`;

export const ContextualPrecisionCriteriaSchema = z.object({
  precision_score: z.number().min(0).max(1),
  uses_relevant_info: z.boolean(),
  avoids_irrelevant_info: z.boolean(),
  focused_response: z.boolean(),
  unnecessary_details: z.boolean(),
});

export type ContextualPrecisionCriteria = z.infer<
  typeof ContextualPrecisionCriteriaSchema
>;
