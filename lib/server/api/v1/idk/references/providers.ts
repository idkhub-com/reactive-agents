import providers from '@server/data/providers.json';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';

export const providersRouter = new Hono<AppEnv>().get((c): Response => {
  return c.json({
    ...providers,
    count: providers.data.length,
  });
});
