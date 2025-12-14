import { zValidator } from '@hono/zod-validator';
import { ACCESS_PASSWORD, JWT_SECRET } from '@server/constants';
import type { AppEnv } from '@server/types/hono';
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

      // If ACCESS_PASSWORD is not set, authentication is disabled - allow any login
      if (ACCESS_PASSWORD && password !== ACCESS_PASSWORD) {
        return c.json({ error: 'Invalid password' }, 401);
      }

      const jwt = await sign({ access: true }, JWT_SECRET);
      // Set cookie without domain restriction for cross-origin development
      // In production, set appropriate domain via environment variable
      setCookie(c, 'access_token', jwt, {
        maxAge: 604800,
        path: '/',
        sameSite: 'None',
        secure: false, // Set to true in production with HTTPS
        httpOnly: false, // Allow JS access for client-side auth checks
      });
      return c.json({ message: 'Password verified' });
    },
  );
