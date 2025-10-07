import { z } from 'zod';

export const AnswerRelevancyTemplateDataSchema = z.object({
  question: z.string(),
  answer: z.string(),
  context: z.string().optional(),
  strict_mode: z.boolean().default(false),
  verbose_mode: z.boolean().default(false),
  include_reason: z.boolean().default(true),
});

export type AnswerRelevancyTemplateData = z.infer<
  typeof AnswerRelevancyTemplateDataSchema
>;

export const AnswerRelevancyTemplateConfigSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  outputFormat: z.literal('json'),
});

export type AnswerRelevancyTemplateConfig = z.infer<
  typeof AnswerRelevancyTemplateConfigSchema
>;

export const answerRelevancyScoringText = `
Score Guidelines:
- 1.0: Answer is completely relevant and directly addresses the question
- 0.8-0.9: Answer is highly relevant with minor tangential information
- 0.6-0.7: Answer is mostly relevant but includes some irrelevant details
- 0.4-0.5: Answer is partially relevant but misses key aspects or includes significant irrelevant content
- 0.2-0.3: Answer is mostly irrelevant with only small relevant portions
- 0.0-0.1: Answer is completely irrelevant or doesn't address the question at all

Consider:
- Does the answer directly address what was asked?
- Is the information provided useful for the question?
- Are there irrelevant details that don't help answer the question?
- Does the answer stay on topic throughout?
`;

export const AnswerRelevancyCriteriaSchema = z.object({
  relevance_score: z.number().min(0).max(1),
  directly_addresses: z.boolean(),
  useful_information: z.boolean(),
  stays_on_topic: z.boolean(),
  irrelevant_content: z.boolean(),
});

export type AnswerRelevancyCriteria = z.infer<
  typeof AnswerRelevancyCriteriaSchema
>;
