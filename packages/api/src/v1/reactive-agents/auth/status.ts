import { getJwtSecret } from '@api/constants';
import type { AppEnv } from '@api/types/hono';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verify } from 'hono/jwt';

export const statusRouter = new Hono<AppEnv>()
  /**
   * Returns authentication status:
   * - authRequired: whether ACCESS_PASSWORD is set (auth is enabled)
   * - authenticated: whether the user has a valid JWT cookie
   */
  .get(async (c): Promise<Response> => {
    const accessPassword = c.env?.ACCESS_PASSWORD;
    const authRequired = Boolean(accessPassword);

    if (!authRequired) {
      return c.json({ authRequired: false, authenticated: true });
    }

    const accessToken = getCookie(c, 'access_token');
    if (!accessToken) {
      return c.json({ authRequired: true, authenticated: false });
    }

    const jwtSecret = c.env?.JWT_SECRET ?? getJwtSecret();
    try {
      await verify(accessToken, jwtSecret);
      return c.json({ authRequired: true, authenticated: true });
    } catch {
      return c.json({ authRequired: true, authenticated: false });
    }
  });
