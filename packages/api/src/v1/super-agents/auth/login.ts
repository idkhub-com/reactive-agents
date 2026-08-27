import {
  AUTH_COOKIE_MAX_AGE,
  getAccessPassword,
  getAuthJwtSecret,
} from '@api/constants';
import type { AppEnv } from '@api/types/hono';
import { AUTH_COOKIE_NAME, authCookieSetOptions } from '@api/utils/auth-cookie';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import { z } from 'zod';

const verifyPasswordSchema = z.object({
  password: z.string(),
});

export const loginRouter = new Hono<AppEnv>()
  /**
   * Handles the '/super-agents/auth/login' API request by verifying the user's password.
   * If ACCESS_PASSWORD is not set, authentication is disabled and any request succeeds.
   */
  .post(
    '/',
    zValidator('json', verifyPasswordSchema),
    async (c): Promise<Response> => {
      const { password } = c.req.valid('json');
      const accessPassword = getAccessPassword(c);

      if (!accessPassword) {
        console.warn(
          'ACCESS_PASSWORD is not set — dashboard authentication is disabled. Any login will be accepted.',
        );
      } else if (password !== accessPassword) {
        return c.json({ error: 'Invalid password' }, 401);
      }

      const jwtSecret = getAuthJwtSecret(c);
      const jwt = await sign(
        {
          access: true,
          exp: Math.floor(Date.now() / 1000) + AUTH_COOKIE_MAX_AGE,
        },
        jwtSecret,
      );

      setCookie(c, AUTH_COOKIE_NAME, jwt, authCookieSetOptions(c));
      return c.json({ message: 'Password verified' });
    },
  );
