import type { AppContext } from '@server/types/hono';
import type { HttpMethod } from '@server/types/http';
import { ReactiveAgentsConfigPreProcessed } from '@shared/types/api/request/headers';
import { produceReactiveAgentsRequestData } from '@shared/utils/ra-request-data';
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
      // Don't set variables for Reactive Agents API requests
      if (!c.req.url.includes('/v1/reactive-agents')) {
        const configString = c.req.header('ra-config');
        if (!configString) {
          return c.json({ error: 'Missing Reactive Agents config' }, 422);
        }
        const rawConfig = JSON.parse(configString);

        const raConfigPreProcessed = ReactiveAgentsConfigPreProcessed.safeParse(
          rawConfig,
          {
            error: (error) =>
              `Invalid Reactive Agents config as ${error.message}`,
          },
        );
        if (raConfigPreProcessed.error) {
          const prettyError = z.prettifyError(raConfigPreProcessed.error);

          return c.json(
            {
              error: `--Invalid Reactive Agents config--\n ${prettyError}`,
              details: raConfigPreProcessed.error.message,
            },
            422,
          );
        }
        c.set('ra_config_pre_processed', raConfigPreProcessed.data);

        const body = await c.req.json();

        const raRequestData = produceReactiveAgentsRequestData(
          c.req.method as HttpMethod,
          c.req.url,
          c.req.header(),
          body,
        );
        c.set('ra_request_data', raRequestData);
      }
    }
    await next();
  },
);
