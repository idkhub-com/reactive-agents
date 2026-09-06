import {
  AUTH_JWT_ALG,
  getAccessPassword,
  getAuthJwtSecret,
} from '@api/constants';
import type { AppEnv } from '@api/types/hono';
import { AUTH_COOKIE_NAME } from '@api/utils/auth-cookie';
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
    const accessPassword = getAccessPassword(c);
    const authRequired = Boolean(accessPassword);

    if (!authRequired) {
      return c.json({ authRequired: false, authenticated: true });
    }

    const accessToken = getCookie(c, AUTH_COOKIE_NAME);
    if (!accessToken) {
      return c.json({ authRequired: true, authenticated: false });
    }

    const jwtSecret = getAuthJwtSecret(c);
    try {
      await verify(accessToken, jwtSecret, AUTH_JWT_ALG);
      return c.json({ authRequired: true, authenticated: true });
    } catch {
      return c.json({ authRequired: true, authenticated: false });
    }
  });
