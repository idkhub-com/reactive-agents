import { authenticatedMiddleware } from '@api/middlewares/auth';
import type { AppEnv } from '@api/types/hono';
import { Hono } from 'hono';
import { createFactory } from 'hono/factory';
import { sign } from 'hono/jwt';
import { vi } from 'vitest';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_BEARER_TOKEN = 'test-bearer-token';
const TEST_ACCESS_PASSWORD = 'test-password';

/**
 * Minimal mock connector so routes that read `c.get('user_data_storage_connector')`
 * don't crash before reaching a meaningful response. Every method returns an empty
 * array / object so the route handler can serialise something without throwing.
 */
function createMockConnector() {
  const handler = {
    get(_target: Record<string, unknown>, prop: string) {
      if (prop === 'then') return undefined; // not a thenable
      return vi.fn().mockResolvedValue([]);
    },
  };
  return new Proxy({} as Record<string, unknown>, handler);
}

/**
 * Build a Hono app that wires the **real** `authenticatedMiddleware` with env
 * bindings, a mock `user_data_storage_connector`, and then mounts the given router.
 *
 * The `basePath` option controls the mount point so that `c.req.path` matches
 * what the middleware expects in production (e.g. `/v1/super-agents/auth/login`).
 *
 * Use this to assert that endpoints return 401 when no credentials are supplied
 * and pass-through when valid credentials are present.
 */
export function createAuthenticatedApp(
  router: Hono<AppEnv>,
  options?: {
    bindings?: Partial<AppEnv['Bindings']>;
    basePath?: string;
  },
) {
  const bindings: AppEnv['Bindings'] = {
    ACCESS_PASSWORD: TEST_ACCESS_PASSWORD,
    AUTH_JWT_SECRET: TEST_JWT_SECRET,
    BEARER_TOKEN: TEST_BEARER_TOKEN,
    ...options?.bindings,
  };

  const factory = createFactory<AppEnv>();
  const mountPath = options?.basePath ?? '/';

  return new Hono<AppEnv>()
    .use('*', async (c, next) => {
      // Inject env bindings
      c.env = { ...c.env, ...bindings };
      // Inject a mock connector so routes don't blow up
      c.set(
        'user_data_storage_connector',
        createMockConnector() as unknown as AppEnv['Variables']['user_data_storage_connector'],
      );
      await next();
    })
    .use('*', authenticatedMiddleware(factory))
    .route(mountPath, router);
}

/**
 * Create a valid JWT cookie header value for `access_token`.
 */
export async function createAuthCookie(
  secret: string = TEST_JWT_SECRET,
): Promise<string> {
  const token = await sign(
    { sub: 'test-user', exp: Math.floor(Date.now() / 1000) + 3600 },
    secret,
  );
  return `access_token=${token}`;
}

/**
 * Create an Authorization: Bearer header object.
 */
export function createBearerHeader(token: string = TEST_BEARER_TOKEN): {
  Authorization: string;
} {
  return { Authorization: `Bearer ${token}` };
}

export { TEST_JWT_SECRET, TEST_BEARER_TOKEN, TEST_ACCESS_PASSWORD };
