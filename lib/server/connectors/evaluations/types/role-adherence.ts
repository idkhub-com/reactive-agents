import type { DataPoint } from '@shared/types/data/data-point';
import { z } from 'zod';

// Template data for role adherence evaluation
export const RoleAdherenceTemplateDataSchema = z.object({
  role_definition: z.string(),
  assistant_output: z.string(),
  instructions: z.string().optional(),
  strict_mode: z.boolean().optional().default(false),
  verbose_mode: z.boolean().optional().default(true),
  include_reason: z.boolean().optional().default(true),
});

export type RoleAdherenceTemplateData = z.infer<
  typeof RoleAdherenceTemplateDataSchema
>;

// Template config for prompts
export const RoleAdherenceTemplateConfigSchema = z.object({
  systemPrompt: z.string(),
  userPrompt: z.string(),
  outputFormat: z.literal('json'),
});

export type RoleAdherenceTemplateConfig = z.infer<
  typeof RoleAdherenceTemplateConfigSchema
>;

// Result schema returned by LLM
export const RoleAdherenceResultSchema = z.object({
  criteria: z.object({
    adhered_to_role: z.boolean(),
    adherence_level: z.number().min(0).max(1),
    violations: z.array(z.string()).optional().default([]),
  }),
  score: z.number().min(0).max(1),
  reasoning: z.string().optional(),
  overall_success: z.boolean().optional(),
});

export type RoleAdherenceResult = z.infer<typeof RoleAdherenceResultSchema>;

// Metadata captured in outputs
export type RoleAdherenceMetadata = {
  datapoint?: DataPoint;
  role_definition?: string;
  assistant_output?: string;
  instructions?: string;
  criteria?: {
    description?: string;
    strict_mode?: boolean;
    verbose_mode?: boolean;
    include_reason?: boolean;
  };
  parsed_with_schema?: boolean;
};

// Scoring guidelines specific to role adherence
export const roleAdherenceScoringGuidelines = {
  perfect: '1.0: Perfect adherence — fully aligned with role and constraints',
  excellent: '0.9: Excellent adherence — minor non-impacting deviations',
  good: '0.7-0.8: Good adherence — mostly aligned with some issues',
  adequate: '0.5-0.6: Adequate — mixed adherence; notable issues present',
  poor: '0.3-0.4: Poor adherence — frequent deviations from role',
  failed: '0.0-0.2: Failed — clear disregard of role or unsafe behavior',
} as const;

export const roleAdherenceScoringText = Object.values(
  roleAdherenceScoringGuidelines,
).join('\n- ');

// Average result type for dataset evaluations
export interface RoleAdherenceAverageResult {
  average_score: number;
  total_data_points: number;
  passed_count: number;
  failed_count: number;
  threshold_used: number;
  evaluation_run_id: string;
}
