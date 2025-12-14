import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { deleteCookie } from 'hono/cookie';

export const logoutRouter = new Hono<AppEnv>()
  /**
   * Handles the '/auth/logout' API request by logging out the user.
   */
  .post((c): Response => {
    deleteCookie(c, 'access_token');
    return c.json({ message: 'Logged out' });
  });
