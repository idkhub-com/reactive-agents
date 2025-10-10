import type { AppContext } from '@server/types/hono';
import type { HttpMethod } from '@server/types/http';

import { IdkConfigPreProcessed } from '@shared/types/api/request/headers';
import { produceIdkRequestData } from '@shared/utils/idk-request-data';
import type { Next } from 'hono';
import { createMiddleware } from 'hono/factory';

import z from 'zod';

/**
 * Middleware to set common variables in the context
 */
export const commonVariablesMiddleware = createMiddleware(
  async (c: AppContext, next: Next) => {
    // Only set variables for  API requests
    if (c.req.url.includes('/v1/')) {
      // Don't set variables for IDK API requests
      if (!c.req.url.includes('/v1/idk')) {
        const configString = c.req.header('x-idk-config');
        if (!configString) {
          return c.json({ error: 'Missing IDK config' }, 422);
        }
        const rawConfig = JSON.parse(configString);

        const idkConfigPreProcessed = IdkConfigPreProcessed.safeParse(
          rawConfig,
          {
            error: (error) => `Invalid IDK config as ${error.message}`,
          },
        );
        if (idkConfigPreProcessed.error) {
          const prettyError = z.prettifyError(idkConfigPreProcessed.error);

          return c.json(
            {
              error: `--Invalid IDK config--\n ${prettyError}`,
              details: idkConfigPreProcessed.error.message,
            },
            422,
          );
        }
        c.set('idk_config_pre_processed', idkConfigPreProcessed.data);

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
  },
);
