import { authRouter } from '@server/api/v1/reactive-agents/auth';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it } from 'vitest';

// Create a test app with the auth router
const app = new Hono<AppEnv>().route('/', authRouter);

const client = testClient(app);

describe('Auth Router', () => {
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
  });
});
