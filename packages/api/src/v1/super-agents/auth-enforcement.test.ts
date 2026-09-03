import {
  createAuthCookie,
  createAuthenticatedApp,
  createBearerHeader,
  TEST_ACCESS_PASSWORD,
} from '@api/test-utils/auth-test-helper';
import { superAgentsRouter } from '@api/v1/super-agents';
import { describe, expect, it } from 'vitest';

// Mount at the real base path so c.req.path matches production
// (the auth middleware checks for /v1/super-agents/auth/* paths)
const BASE = '/v1/super-agents';
const app = createAuthenticatedApp(superAgentsRouter, { basePath: BASE });

/**
 * Table of protected endpoints to verify auth enforcement.
 * Each entry is [method, path] — paths include the base prefix.
 */
const PROTECTED_ENDPOINTS: [string, string][] = [
  ['GET', `${BASE}/agents`],
  ['GET', `${BASE}/skills`],
  ['GET', `${BASE}/models`],
  ['GET', `${BASE}/ai-providers`],
  ['GET', `${BASE}/system-settings`],
  ['GET', `${BASE}/skill-events?skillId=test`],
  ['GET', `${BASE}/feedbacks`],
  ['GET', `${BASE}/improved-responses`],
  ['GET', `${BASE}/evaluation-methods`],
  ['GET', `${BASE}/observability/logs`],
  ['GET', `${BASE}/events`],
];

describe('Auth enforcement on super-agents routes', () => {
  it.each(
    PROTECTED_ENDPOINTS,
  )('%s %s returns 401 without auth', async (method, path) => {
    const response = await app.request(path, { method });
    expect(response.status).toBe(401);
  });

  it.each(
    PROTECTED_ENDPOINTS,
  )('%s %s returns non-401 with bearer token', async (method, path) => {
    const response = await app.request(path, {
      method,
      headers: createBearerHeader(),
    });
    expect(response.status).not.toBe(401);
  });

  it.each(
    PROTECTED_ENDPOINTS,
  )('%s %s returns non-401 with JWT cookie', async (method, path) => {
    const cookie = await createAuthCookie();
    const response = await app.request(path, {
      method,
      headers: { Cookie: cookie },
    });
    expect(response.status).not.toBe(401);
  });

  describe('Bearer token format validation', () => {
    const endpoint = `${BASE}/agents`;

    it('rejects Authorization header with no scheme', async () => {
      const response = await app.request(endpoint, {
        headers: { Authorization: 'just-a-token' },
      });
      expect(response.status).toBe(401);
    });

    it('rejects Authorization header with wrong scheme', async () => {
      const response = await app.request(endpoint, {
        headers: { Authorization: 'Basic test-bearer-token' },
      });
      expect(response.status).toBe(401);
    });

    it('rejects Authorization header with extra segments', async () => {
      const response = await app.request(endpoint, {
        headers: { Authorization: 'Bearer test-bearer-token extra' },
      });
      expect(response.status).toBe(401);
    });

    it('rejects Authorization header with Bearer but no token', async () => {
      const response = await app.request(endpoint, {
        headers: { Authorization: 'Bearer' },
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Auth endpoint exemptions', () => {
    it('POST /auth/login is accessible without auth', async () => {
      const response = await app.request(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: TEST_ACCESS_PASSWORD }),
      });
      // 200 proves the request passed through the auth middleware
      // (the middleware would return text "Unauthorized" before reaching the handler)
      expect(response.status).toBe(200);
    });

    it('GET /auth/status is accessible without auth', async () => {
      const response = await app.request(`${BASE}/auth/status`);
      expect(response.status).toBe(200);
    });

    it('POST /auth/logout is accessible without auth', async () => {
      const response = await app.request(`${BASE}/auth/logout`, {
        method: 'POST',
      });
      expect(response.status).toBe(200);
    });
  });
});

/**
 * The gateway configuration: BEARER_TOKEN guards the API and the dashboard
 * password is left unset, which AGENTS.md documents as optional.
 *
 * `/auth/*` is exempt from the middleware and the middleware trusts the JWT
 * cookie ahead of the bearer token, so a login endpoint that issued a session
 * without a password to check would let anyone who can reach the port walk
 * past BEARER_TOKEN entirely.
 */
describe('ACCESS_PASSWORD unset while BEARER_TOKEN guards the API', () => {
  const gatewayApp = createAuthenticatedApp(superAgentsRouter, {
    basePath: BASE,
    bindings: { ACCESS_PASSWORD: undefined },
  });

  it('still refuses an unauthenticated request', async () => {
    const response = await gatewayApp.request(`${BASE}/agents`);
    expect(response.status).toBe(401);
  });

  it('refuses to mint a session from an arbitrary password', async () => {
    const response = await gatewayApp.request(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'not-the-bearer-token' }),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('leaves the bearer token as the only way in', async () => {
    const login = await gatewayApp.request(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'not-the-bearer-token' }),
    });
    const minted = login.headers.get('set-cookie')?.split(';')[0];

    const withMintedCookie = await gatewayApp.request(`${BASE}/agents`, {
      headers: minted ? { Cookie: minted } : {},
    });
    expect(withMintedCookie.status).toBe(401);

    const withBearer = await gatewayApp.request(`${BASE}/agents`, {
      headers: createBearerHeader(),
    });
    expect(withBearer.status).not.toBe(401);
  });
});
