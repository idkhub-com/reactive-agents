import {
  createAuthCookie,
  createAuthenticatedApp,
  createBearerHeader,
  TEST_ACCESS_PASSWORD,
} from '@api/test-utils/auth-test-helper';
import { reactiveAgentsRouter } from '@api/v1/reactive-agents';
import { describe, expect, it } from 'vitest';

// Mount at the real base path so c.req.path matches production
// (the auth middleware checks for /v1/reactive-agents/auth/* paths)
const BASE = '/v1/reactive-agents';
const app = createAuthenticatedApp(reactiveAgentsRouter, { basePath: BASE });

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

describe('Auth enforcement on reactive-agents routes', () => {
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
  });
});
