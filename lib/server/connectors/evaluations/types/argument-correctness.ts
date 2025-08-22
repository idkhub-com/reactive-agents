import type { DataPoint } from '@shared/types/data/data-point';
import { z } from 'zod';
import { ToolUsageSchema } from './tool_usage';

// Tool call structure
export const ArgumentCorrectnessToolCallSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  input: z.unknown(),
});
export type ArgumentCorrectnessToolCall = z.infer<
  typeof ArgumentCorrectnessToolCallSchema
>;

// Template data
export const ArgumentCorrectnessTemplateDataSchema = z.object({
  input: z.string().optional(),
  actual_output: z.string().optional(),
  tools_called: z.array(ToolUsageSchema).optional(),
  strict_mode: z.boolean().optional().default(false),
  verbose_mode: z.boolean().optional().default(true),
  include_reason: z.boolean().optional().default(true),
});
export type ArgumentCorrectnessTemplateData = z.infer<
  typeof ArgumentCorrectnessTemplateDataSchema
>;

// Template config
export const ArgumentCorrectnessTemplateConfigSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  outputFormat: z.literal('json'),
});
export type ArgumentCorrectnessTemplateConfig = z.infer<
  typeof ArgumentCorrectnessTemplateConfigSchema
>;

// Per-tool breakdown and result
export const ArgumentCorrectnessPerToolSchema = z.object({
  name: z.string(),
  correct: z.boolean(),
  explanation: z.string().optional(),
});
export type ArgumentCorrectnessPerTool = z.infer<
  typeof ArgumentCorrectnessPerToolSchema
>;

export const ArgumentCorrectnessResultSchema = z.object({
  per_tool: z.array(ArgumentCorrectnessPerToolSchema).optional(),
  score: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  overall_success: z.boolean().optional(),
});
export type ArgumentCorrectnessResult = z.infer<
  typeof ArgumentCorrectnessResultSchema
>;

// Metadata for outputs
export type ArgumentCorrectnessMetadata = {
  datapoint?: DataPoint;
  input?: string;
  actual_output?: string;
  tools_called?: ArgumentCorrectnessToolCall[];
  criteria?: {
    description?: string;
    strict_mode?: boolean;
    verbose_mode?: boolean;
    include_reason?: boolean;
  };
  per_tool?: ArgumentCorrectnessPerTool[];
  parsed_with_schema?: boolean;
};

// Scoring guidelines
export const argumentCorrectnessScoringGuidelines = {
  perfect: '1.0: All tool call arguments are correct and necessary',
  excellent: '0.9: Arguments are correct with minor imperfections',
  good: '0.7-0.8: Mostly correct with minor issues',
  adequate: '0.5-0.6: Mixed correctness; significant issues present',
  poor: '0.3-0.4: Mostly incorrect or unnecessary',
  failed: '0.0-0.2: Incorrect or harmful arguments',
} as const;
export const argumentCorrectnessScoringText = Object.values(
  argumentCorrectnessScoringGuidelines,
).join('\n- ');

// Average result
export interface ArgumentCorrectnessAverageResult {
  average_score: number;
  total_data_points: number;
  passed_count: number;
  failed_count: number;
  threshold_used: number;
  evaluation_run_id: string;
}
