import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Main Feedback schema
export const Feedback = z
  .object({
    id: z.uuid(),
    log_id: z.uuid(),
    score: z.number().min(0).max(1),
    feedback: z.string().optional(),
    created_at: z.iso.datetime({ offset: true }),
    updated_at: z.iso.datetime({ offset: true }),
  })
  .strict();

export type Feedback = z.infer<typeof Feedback>;

// Input schema for creating feedback
export const FeedbackCreateParams = z
  .object({
    id: z.undefined().transform(() => uuidv4()),
    log_id: z.uuid(),
    score: z.number().min(0).max(1),
    feedback: z.string().optional(),
    created_at: z.undefined().transform(() => new Date().toISOString()),
    updated_at: z.undefined().transform(() => new Date().toISOString()),
  })
  .strict();

export type FeedbackCreateParams = z.infer<typeof FeedbackCreateParams>;

// Query parameters schema
export const FeedbackQueryParams = z
  .object({
    id: z.uuid().optional(),
    log_id: z.uuid().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type FeedbackQueryParams = z.infer<typeof FeedbackQueryParams>;
