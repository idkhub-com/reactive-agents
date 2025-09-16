import { z } from 'zod';

export const ToolCall = z.object({
  name: z.string(),
  input_parameters: z.record(z.string(), z.unknown()).optional(),
  output: z.unknown().optional(),
});
export type ToolCall = z.infer<typeof ToolCall>;

/**
 * Tool usage information for task completion evaluation
 */
export const ToolUsageSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  success: z.boolean(),
});

export type ToolUsage = z.infer<typeof ToolUsageSchema>;
