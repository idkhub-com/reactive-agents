import { z } from 'zod';

/**
 * Tool usage information for task completion evaluation
 */
export const ToolUsageSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  success: z.boolean(),
});

export type ToolUsage = z.infer<typeof ToolUsageSchema>;
