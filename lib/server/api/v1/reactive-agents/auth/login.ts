import { zValidator } from '@hono/zod-validator';
import { ACCESS_PASSWORD, API_URL, JWT_SECRET } from '@server/constants';
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
   */
  .post(
    zValidator('json', verifyPasswordSchema),
    async (c): Promise<Response> => {
      const { password } = c.req.valid('json');

      if (password !== ACCESS_PASSWORD) {
        return c.json({ error: 'Invalid password' }, 401);
      }

      let domainWithoutProtocol = API_URL.split('://')[1];
      if (domainWithoutProtocol.endsWith('/')) {
        domainWithoutProtocol = domainWithoutProtocol.slice(0, -1);
      }
      const domainWithoutPort = domainWithoutProtocol.split(':')[0];
      const domain = domainWithoutPort;

      const jwt = await sign({ access: true }, JWT_SECRET);
      setCookie(c, 'access_token', jwt, {
        maxAge: 604800,
        domain: domain,
        path: '/',
      });
      return c.json({ message: 'Password verified' });
    },
  );
