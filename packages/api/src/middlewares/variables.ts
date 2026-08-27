import type { AppContext } from '@api/types/hono';
import type { HttpMethod } from '@api/types/http';
import { SuperAgentsConfigPreProcessed } from '@shared/types/api/request/headers';
import { produceSuperAgentsRequestData } from '@shared/utils/sa-request-data';
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
      // Don't set variables for Super Agents API requests
      if (!c.req.url.includes('/v1/super-agents')) {
        const configString = c.req.header('sa-config');
        if (!configString) {
          return c.json({ error: 'Missing Super Agents config' }, 422);
        }
        const rawConfig = JSON.parse(configString);

        const saConfigPreProcessed = SuperAgentsConfigPreProcessed.safeParse(
          rawConfig,
          {
            error: (error) => `Invalid Super Agents config as ${error.message}`,
          },
        );
        if (saConfigPreProcessed.error) {
          const prettyError = z.prettifyError(saConfigPreProcessed.error);

          return c.json(
            {
              error: `--Invalid Super Agents config--\n ${prettyError}`,
              details: saConfigPreProcessed.error.message,
            },
            422,
          );
        }
        c.set('sa_config_pre_processed', saConfigPreProcessed.data);

        const body = await c.req.json();

        const saRequestData = produceSuperAgentsRequestData(
          c.req.method as HttpMethod,
          c.req.url,
          c.req.header(),
          body,
        );
        c.set('sa_request_data', saRequestData);
      }
    }
    await next();
  },
);
