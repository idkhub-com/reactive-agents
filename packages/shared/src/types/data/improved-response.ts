import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Define Zod schemas for validation
export const ImprovedResponse = z
  .object({
    id: z.string().uuid(),
    agent_id: z.string().uuid(),
    skill_id: z.string().uuid(),
    log_id: z.string().uuid(),
    original_response_body: z.record(z.string(), z.unknown()),
    improved_response_body: z.record(z.string(), z.unknown()),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();

// Input schema for creating an improved response
export const ImprovedResponseCreateParams = z
  .object({
    agent_id: z.string().uuid(),
    skill_id: z.string().uuid(),
    log_id: z.string().uuid(),
    original_response_body: z.record(z.string(), z.unknown()),
    improved_response_body: z.record(z.string(), z.unknown()),
  })
  .strict()
  .transform((data) => {
    const timestamp = new Date().toISOString();
    return {
      ...data,
      id: uuidv4(),
      created_at: timestamp,
      updated_at: timestamp,
    };
  });

// Query parameters schema for the combined GET endpoint
export const ImprovedResponseQueryParams = z
  .object({
    id: z.string().uuid().optional(),
    agent_id: z.string().uuid().optional(),
    skill_id: z.string().uuid().optional(),
    log_id: z.string().uuid().optional(),
    limit: z.coerce.number().int().positive().optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .strict();

// Input schema for updating an improved response
export const ImprovedResponseUpdateParams = z
  .object({
    improved_response_body: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()
  .refine(
    (data) =>
      Object.keys(data).length > 0 && data.improved_response_body !== undefined,
    {
      message: 'At least one field must be provided for update',
      path: ['improved_response_body'],
    },
  );

// Query params for DELETE operations
export const ImprovedResponseIdQueryParams = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

// Define the types based on the schemas
export type ImprovedResponse = z.infer<typeof ImprovedResponse>;
export type ImprovedResponseUpdateParams = z.infer<
  typeof ImprovedResponseUpdateParams
>;
export type ImprovedResponseQueryParams = z.infer<
  typeof ImprovedResponseQueryParams
>;
export type ImprovedResponseIdQueryParams = z.infer<
  typeof ImprovedResponseIdQueryParams
>;
