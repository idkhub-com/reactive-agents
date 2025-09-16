import { z } from 'zod';

// Parameters for task completion evaluation using Zod schema validation
export const TaskCompletionEvaluationParameters = z.object({
  threshold: z.number().min(0).max(1).default(0.7),
  task: z.string().optional(),
  model: z.string().default('gpt-4o'),
  include_reason: z.boolean().default(true),
  strict_mode: z.boolean().default(false),
  async_mode: z.boolean().default(true),
  verbose_mode: z.boolean().default(false),
  temperature: z.number().min(0).max(2).default(0.1),
  max_tokens: z.number().positive().default(1000),
  batch_size: z.number().positive().default(10),
  input: z.string().optional(),
  actual_output: z.string().optional(),
  tools_called: z.array(z.unknown()).optional(),
});

export type TaskCompletionEvaluationParameters = z.infer<
  typeof TaskCompletionEvaluationParameters
>;
