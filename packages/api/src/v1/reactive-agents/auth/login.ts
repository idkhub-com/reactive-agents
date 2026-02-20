import { getJwtSecret } from '@api/constants';
import type { AppEnv } from '@api/types/hono';
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
   * Handles the '/reactive-agents/auth/login' API request by verifying the user's password.
   * If ACCESS_PASSWORD is not set, authentication is disabled and any request succeeds.
   */
  .post(
    zValidator('json', verifyPasswordSchema),
    async (c): Promise<Response> => {
      const { password } = c.req.valid('json');
      const accessPassword = c.env?.ACCESS_PASSWORD;

      if (!accessPassword) {
        console.warn(
          'ACCESS_PASSWORD is not set — dashboard authentication is disabled. Any login will be accepted.',
        );
      } else if (password !== accessPassword) {
        return c.json({ error: 'Invalid password' }, 401);
      }

      const jwtSecret = c.env?.JWT_SECRET ?? getJwtSecret();
      const jwt = await sign({ access: true }, jwtSecret);
      // Set cookie without domain restriction for cross-origin development
      // In production, set appropriate domain via environment variable
      setCookie(c, 'access_token', jwt, {
        maxAge: 604800,
        path: '/',
        sameSite: 'Lax',
        httpOnly: false, // Allow JS access for client-side auth checks
      });
      return c.json({ message: 'Password verified' });
    },
  );
