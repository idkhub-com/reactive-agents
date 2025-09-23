import { z } from 'zod';

// Zod schema for optimizer lock data
export const OptimizerLockSchema = z.object({
  lock_name: z.string(),
  locked_by: z.string(),
  locked_at: z.string(), // ISO timestamp
  expires_at: z.string(), // ISO timestamp
  metadata: z.record(z.unknown()).default({}),
});

export type OptimizerLock = z.infer<typeof OptimizerLockSchema>;

// Schema for lock status check response
export const OptimizerLockStatusSchema = z.object({
  is_locked: z.boolean(),
  locked_by: z.string().nullable(),
  locked_at: z.string().nullable(), // ISO timestamp
  expires_at: z.string().nullable(), // ISO timestamp
  time_remaining_seconds: z.number().nullable(),
  metadata: z.record(z.unknown()).nullable(),
});

export type OptimizerLockStatus = z.infer<typeof OptimizerLockStatusSchema>;

// Default lock configuration
export const DEFAULT_LOCK_TIMEOUT_SECONDS = 300; // 5 minutes
export const MAX_LOCK_TIMEOUT_SECONDS = 3600; // 1 hour

// Lock name patterns for different types of optimization
export const LOCK_NAMES = {
  SKILL_OPTIMIZER: (skillId: string) => `skill_optimizer:${skillId}`,
  GLOBAL_OPTIMIZER: 'global_optimizer',
} as const;
