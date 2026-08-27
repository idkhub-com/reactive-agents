import type { AppContext } from '@api/types/hono';

const DUMMY_JWT_SECRET = 'default-dev-jwt-secret';
export const getApiUrl = (c: AppContext) =>
  c.env.API_URL ?? 'http://localhost:8787';

export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 1 week in seconds

/**
 * Supabase URL for local development.
 *
 * Using default Supabase URL for local development.
 *
 * @see https://supabase.com/docs/guides/local-development
 */
const getSupabaseUrl = (c: AppContext): string | undefined =>
  c.env.SUPABASE_URL ??
  (c.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:54321' : undefined);

/**
 * PostgREST URL.
 *
 * For Supabase, we simply need to add /rest/v1 to the Supabase URL.
 */
export const getPostgrestUrl = (c: AppContext) => {
  const postgrestUrl = c.env.POSTGREST_URL;
  if (postgrestUrl) {
    return postgrestUrl;
  }
  const supabaseUrl = getSupabaseUrl(c);
  if (supabaseUrl) {
    return `${supabaseUrl}/rest/v1`;
  }
  throw new Error(
    'POSTGREST_URL environment variable is required in production.',
  );
};

/**
 * Supabase Secret key
 */
export const getSupabaseSecretKey = (c: AppContext): string | undefined => {
  const key = c.env.SUPABASE_SECRET_KEY;

  if (key) {
    return key;
  } else if (c.env.NODE_ENV !== 'production') {
    // Default to development key used by supabase
    return 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';
  }
};

/**
 * PostgREST Service Role.
 *
 * This is the key used to authenticate requests to the PostgREST API.
 * For Supabase, this is the same as its secret key.
 */
export const getPostgrestServiceRoleKey = (c: AppContext): string => {
  const key = c.env.POSTGREST_SERVICE_ROLE_KEY ?? getSupabaseSecretKey(c);

  if (key) {
    return key;
  }

  throw new Error(
    'POSTGREST_SERVICE_ROLE_KEY environment variable is required in production. Set it to a strong, random secret.',
  );
};

export const getAccessPassword = (c: AppContext): string | undefined =>
  c.env.ACCESS_PASSWORD;

export const getAuthJwtSecret = (c: AppContext): string => {
  const secret = c.env.AUTH_JWT_SECRET;
  if (!secret && c.env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_JWT_SECRET environment variable is required in production. Set it to a strong, random secret.',
    );
  }

  return secret ?? DUMMY_JWT_SECRET;
};

/**
 * Bearer token for API authentication.
 *
 * If not set, API requests without JWT authentication will be allowed through.
 * Set this to require Bearer token authentication for API access.
 */
export const getBearerToken = (c: AppContext): string | undefined =>
  c.env.BEARER_TOKEN;

/**
 * Encryption key for AI provider API keys.
 *
 * You should absolutely change this in production!
 */
export const getAiProviderApiKeyEncryptionKey = (c: AppContext): string => {
  const key = c.env.AI_PROVIDER_API_KEY_ENCRYPTION_KEY;
  if (key) {
    return key;
  } else if (c.env.NODE_ENV !== 'production') {
    return 'default-32-byte-key-change-in-prod';
  }

  throw new Error(
    'AI_PROVIDER_API_KEY_ENCRYPTION_KEY environment variable is required in production. Set it to a strong, random secret.',
  );
};

/**
 * Origins allowed to make credentialed cross-origin requests to the API.
 *
 * `WEB_APP_URL` accepts a comma-separated list. The Docker deployment serves the
 * dashboard and proxies `/v1/*` from the same nginx origin, and Vite proxies the
 * same paths in development, so CORS only matters when the dashboard is hosted
 * separately — hence the empty production default rather than a permissive one.
 */
export const getAllowedOrigins = (c: AppContext): string[] => {
  const webAppUrl = c.env.WEB_APP_URL;
  if (webAppUrl) {
    return webAppUrl
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (c.env.NODE_ENV === 'production') {
    return [];
  }

  return [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8787',
  ];
};

/**
 * Special skills that super-agents uses internally. We auto generate these if they don't exist.
 */
export const SA_SKILLS = [
  'judge',
  'extract-task-and-outcome',
  'create-evaluations',
  'system-prompt-seeding',
  'system-prompt-seeding-with-context',
  'system-prompt-reflection',
  'embedding',
];
