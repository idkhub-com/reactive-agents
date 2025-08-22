import { z } from 'zod';

export const ToolCall = z.object({
  name: z.string(),
  input_parameters: z.record(z.unknown()).optional(),
  output: z.unknown().optional(),
});
export type ToolCall = z.infer<typeof ToolCall>;
