import { AIProviderSchema } from '@shared/types/constants';
import { z } from 'zod';

// Configuration parameters - the AI parameters for a specific version
export const SkillConfigurationParams = z.object({
  ai_provider: AIProviderSchema,
  model: z.string().min(1),
  system_prompt: z.string().min(1).nullable(),
  temperature: z.number().min(0).max(2).nullable(),
  max_tokens: z.number().int().positive().nullable(),
  top_p: z.number().min(0).max(1).nullable(),
  frequency_penalty: z.number().min(-2).max(2).nullable(),
  presence_penalty: z.number().min(-2).max(2).nullable(),
  stop: z.array(z.string()).nullable(),
  seed: z.number().int().nullable(),
  // Additional provider-specific parameters can be added here
  additional_params: z.record(z.string(), z.unknown()).nullable(),
});
export type SkillConfigurationParams = z.infer<typeof SkillConfigurationParams>;

// Versioned configuration entry with metadata
export const SkillConfigurationVersion = z.object({
  hash: z.string().length(6, 'Hash must be exactly 6 characters'),
  created_at: z.iso.datetime({ offset: true }),
  params: SkillConfigurationParams,
});
export type SkillConfigurationVersion = z.infer<
  typeof SkillConfigurationVersion
>;

// Configuration data - map with 'current' key and hash keys for historical versions
export const SkillConfigurationData = z
  .record(z.string(), SkillConfigurationVersion)
  .refine((data) => 'current' in data, {
    message: "Configuration data must have a 'current' key",
  });
export type SkillConfigurationData = z.infer<typeof SkillConfigurationData>;

export const SkillConfiguration = z.object({
  id: z.uuid(),
  agent_id: z.uuid(),
  skill_id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  data: SkillConfigurationData,
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});
export type SkillConfiguration = z.infer<typeof SkillConfiguration>;

export const SkillConfigurationQueryParams = z
  .object({
    id: z.uuid().optional(),
    agent_id: z.uuid().optional(),
    skill_id: z.uuid().optional(),
    name: z.string().min(1).optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type SkillConfigurationQueryParams = z.infer<
  typeof SkillConfigurationQueryParams
>;

export const SkillConfigurationCreateParams = z
  .object({
    agent_id: z.uuid(),
    skill_id: z.uuid(),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    data: SkillConfigurationParams, // Just the params, we'll create the versioned structure
  })
  .strict();

export type SkillConfigurationCreateParams = z.infer<
  typeof SkillConfigurationCreateParams
>;

export const SkillConfigurationUpdateParams = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    data: SkillConfigurationParams.optional(), // Just the params, we'll add to the versioned structure
  })
  .strict()
  .refine(
    (data) => {
      const updateFields = ['name', 'description', 'data'];
      return updateFields.some(
        (field) => data[field as keyof typeof data] !== undefined,
      );
    },
    {
      message: 'At least one field must be provided for update',
      path: ['name', 'description', 'data'],
    },
  );

export type SkillConfigurationUpdateParams = z.infer<
  typeof SkillConfigurationUpdateParams
>;
