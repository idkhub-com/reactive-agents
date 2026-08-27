import type { AppEnv } from '@api/types/hono';
import { authRouter } from '@api/v1/super-agents/auth';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it } from 'vitest';

// Default app — no ACCESS_PASSWORD binding, so auth is disabled
const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.env = { ...c.env };
    await next();
  })
  .route('/', authRouter);
const client = testClient(app);

// App with ACCESS_PASSWORD binding set — uses app.request() since testClient
// can't infer route types through dynamic middleware
function createAppWithBindings(bindings: Partial<AppEnv['Bindings']>) {
  return new Hono<AppEnv>()
    .use('*', async (c, next) => {
      for (const [key, value] of Object.entries(bindings)) {
        c.env = { ...c.env, [key]: value };
      }
      await next();
    })
    .route('/', authRouter);
}

describe('Auth Router', () => {
  describe('GET /status', () => {
    it('returns authRequired: false when ACCESS_PASSWORD is not set', async () => {
      const response = await client.status.$get();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ authRequired: false, authenticated: true });
    });

    it('returns authenticated: false when ACCESS_PASSWORD is set but no token', async () => {
      const authedApp = createAppWithBindings({
        ACCESS_PASSWORD: 'test-password',
      });
      const response = await authedApp.request('/status');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ authRequired: true, authenticated: false });
    });
  });

  describe('POST /login', () => {
    it('accepts any password when ACCESS_PASSWORD is not set', async () => {
      const response = await app.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'anything' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ message: 'Password verified' });
    });

    it('rejects wrong password when ACCESS_PASSWORD is set', async () => {
      const authedApp = createAppWithBindings({
        ACCESS_PASSWORD: 'correct-password',
      });
      const response = await authedApp.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong-password' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: 'Invalid password' });
    });

    it('accepts correct password when ACCESS_PASSWORD is set', async () => {
      const authedApp = createAppWithBindings({
        ACCESS_PASSWORD: 'correct-password',
      });
      const response = await authedApp.request('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ message: 'Password verified' });

      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toBeTruthy();
      expect(setCookieHeader).toContain('access_token=');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('SameSite=Lax');
      expect(setCookieHeader).toContain('Path=/');
    });

    it('omits Secure over plain HTTP', async () => {
      const authedApp = createAppWithBindings({
        ACCESS_PASSWORD: 'correct-password',
      });
      const response = await authedApp.request('http://localhost/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      });

      expect(response.headers.get('set-cookie')).not.toContain('Secure');
    });

    it('sets Secure when the proxy reports an HTTPS client connection', async () => {
      const authedApp = createAppWithBindings({
        ACCESS_PASSWORD: 'correct-password',
      });
      // nginx terminates TLS and forwards over plain HTTP, so the request URL
      // is http: even though the browser is on HTTPS.
      const response = await authedApp.request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-Proto': 'https',
        },
        body: JSON.stringify({ password: 'correct-password' }),
      });

      expect(response.headers.get('set-cookie')).toContain('Secure');
    });

    it('sets Secure when the request itself is HTTPS', async () => {
      const authedApp = createAppWithBindings({
        ACCESS_PASSWORD: 'correct-password',
      });
      const response = await authedApp.request('https://example.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'correct-password' }),
      });

      expect(response.headers.get('set-cookie')).toContain('Secure');
    });
  });

  describe('POST /logout', () => {
    it('should successfully log out and return 200', async () => {
      const response = await client.logout.$post();

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ message: 'Logged out' });
    });

    it('should delete the access_token cookie', async () => {
      const response = await client.logout.$post();

      expect(response.status).toBe(200);

      // Check that Set-Cookie header is present to delete the cookie
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toBeTruthy();
      expect(setCookieHeader).toContain('access_token=');
      // Cookie deletion is indicated by Max-Age=0 or Expires in the past
      expect(setCookieHeader).toMatch(/Max-Age=0|Expires=/);
    });

    it('mirrors the login cookie attributes so the browser replaces it', async () => {
      // A browser only overwrites a cookie when name, domain and path match,
      // so the delete has to be issued with the same Path the login used.
      const response = await app.request('https://example.com/logout', {
        method: 'POST',
        headers: { 'X-Forwarded-Proto': 'https' },
      });

      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('Path=/');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('SameSite=Lax');
      expect(setCookieHeader).toContain('Secure');
    });
  });
});
