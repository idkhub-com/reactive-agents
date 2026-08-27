import type { AppEnv } from '@api/types/hono';
import { AUTH_COOKIE_NAME, authCookieOptions } from '@api/utils/auth-cookie';
import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';

export const logoutRouter = new Hono<AppEnv>()
  /**
   * Handles the '/auth/logout' API request by logging out the user.
   */
  .post('/', (c): Response => {
    deleteCookie(c, AUTH_COOKIE_NAME, authCookieOptions(c));
    return c.json({ message: 'Logged out' });
  });
