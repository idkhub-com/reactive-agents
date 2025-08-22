import type { AppEnv } from '@server/types/hono';
import type { HttpMethod } from '@server/types/http';

import { IdkConfig } from '@shared/types/api/request/headers';
import { produceIdkRequestData } from '@shared/utils/idk-request-data';

import type { MiddlewareHandler } from 'hono';
import type { Factory } from 'hono/factory';

/**
 * Middleware to set common variables in the context
 */
export const commonVariablesMiddleware = (
  factory: Factory<AppEnv>,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    // Only set variables for  API requests
    if (c.req.url.includes('/v1/')) {
      // Don't set variables for IDK API requests
      if (!c.req.url.includes('/v1/idk')) {
        const configString = c.req.header('x-idk-config');
        if (!configString) {
          return c.json({ error: 'Missing IDK config' }, 422);
        }
        const rawConfig = JSON.parse(configString);

        const idkConfig = IdkConfig.safeParse(rawConfig);
        if (idkConfig.error) {
          return c.json(
            {
              error: 'Invalid IDK config',
              details: idkConfig.error.message,
            },
            422,
          );
        }
        c.set('idk_config', idkConfig.data);

        const body = await c.req.json();

        const idkRequestData = produceIdkRequestData(
          c.req.method as HttpMethod,
          c.req.url,
          c.req.header(),
          body,
        );
        c.set('idk_request_data', idkRequestData);
      }
    }
    await next();
  });
