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
   *
   * With no ACCESS_PASSWORD there is nothing to verify, so this refuses rather
   * than issuing a session. Minting one would be an authentication bypass: the
   * auth middleware exempts `/auth/*` so that an unauthenticated visitor can
   * reach the login form, and it trusts the cookie ahead of the bearer token.
   * A deployment that sets only BEARER_TOKEN -- the gateway configuration,
   * where the dashboard password is documented as optional -- would hand full
   * access to anyone who posted an arbitrary password here.
   */
  .post(
    '/',
    zValidator('json', verifyPasswordSchema),
    async (c): Promise<Response> => {
      const { password } = c.req.valid('json');
      const accessPassword = getAccessPassword(c);

      if (!accessPassword) {
        return c.json(
          {
            error:
              'Dashboard authentication is disabled because ACCESS_PASSWORD is not configured.',
          },
          400,
        );
      }

      if (password !== accessPassword) {
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
