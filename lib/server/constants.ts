/**
 * Supabase URL for local development.
 *
 * @see https://supabase.com/docs/guides/local-development
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';

/**
 * Supabase Anon Key for local development.
 *
 * @see https://supabase.com/docs/guides/local-development
 */
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

/**
 * Supabase Service Role Key for local development.
 *
 * @see https://supabase.com/docs/guides/local-development
 */
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD ?? 'idk';
export const JWT_SECRET =
  process.env.JWT_SECRET ?? 'you-should-change-this-in-production';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const BEARER_TOKEN = process.env.BEARER_TOKEN ?? 'idk';

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'demo-key';

/**
 * Encryption key for AI provider API keys.
 *
 * You should absolutely change this in production!
 */
export const AI_PROVIDER_API_KEY_ENCRYPTION_KEY =
  process.env.AI_PROVIDER_API_KEY_ENCRYPTION_KEY ??
  'default-32-byte-key-change-in-prod';

export const EMBEDDINGS_DIMENSIONS = 1536;
