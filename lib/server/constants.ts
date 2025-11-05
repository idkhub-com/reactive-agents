export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * Supabase URL for local development.
 *
 * @see https://supabase.com/docs/guides/local-development
 */
export const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  (process.env.NODE_ENV === 'development'
    ? 'http://127.0.0.1:54321'
    : undefined);

/**
 * PostgREST URL.
 *
 * For Supabase, we simply need to add /rest/v1 to the Supabase URL.
 */
export const POSTGREST_URL =
  process.env.POSTGREST_URL ??
  (SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : undefined);

/**
 * Supabase Secret key
 */
export const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ??
  (process.env.NODE_ENV === 'development'
    ? 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'
    : undefined);

/**
 * PostgREST Service Role.
 *
 * This is the key used to authenticate requests to the PostgREST API.
 * For Supabase, this is the same as its secret key.
 */
export const POSTGREST_SERVICE_ROLE_KEY =
  process.env.POSTGREST_SERVICE_ROLE_KEY ??
  (SUPABASE_SECRET_KEY ? SUPABASE_SECRET_KEY : undefined);

export const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD ?? 'reactive-agents';
export const JWT_SECRET =
  process.env.JWT_SECRET ?? 'you-should-change-this-in-production';
export const BEARER_TOKEN = process.env.BEARER_TOKEN ?? 'reactive-agents';

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? 'demo-key';

/**
 * Encryption key for AI provider API keys.
 *
 * You should absolutely change this in production!
 */
export const AI_PROVIDER_API_KEY_ENCRYPTION_KEY =
  process.env.AI_PROVIDER_API_KEY_ENCRYPTION_KEY ??
  'default-32-byte-key-change-in-prod';

/**
 * Special skills that reactive-agents uses internally. We auto generate these if they don't exist.
 */
export const RA_SKILLS = [
  'judge',
  'extract-task-and-outcome',
  'create-evaluations',
  'system-prompt-seeding',
  'system-prompt-reflection',
  'embedding',
];

export const EMBEDDINGS_DIMENSIONS = 1536;
