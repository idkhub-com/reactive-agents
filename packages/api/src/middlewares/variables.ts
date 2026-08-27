import type { AppContext } from '@api/types/hono';
import type { HttpMethod } from '@api/types/http';
import { SuperAgentsConfigPreProcessed } from '@shared/types/api/request/headers';
import {
  InvalidRequestBodyError,
  isKnownRoute,
  produceSuperAgentsRequestData,
} from '@shared/utils/sa-request-data';
import { parseAgentSkillPath } from '@shared/utils/url';
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
        // The agent and skill can be named in the path
        // (`/v1/agents/:agent_name/skills/:skill_name/chat/completions`) instead
        // of in the `sa-config` header. When they are, the header is optional.
        const { pathname } = new URL(c.req.url);
        const agentSkillScope = parseAgentSkillPath(pathname);
        const method = c.req.method as HttpMethod;

        // Answer an unroutable path before asking for credentials or config, so
        // a mistyped URL reads as a mistyped URL.
        if (!isKnownRoute(method, c.req.url)) {
          return c.json(
            {
              error: `No API route matches ${method} ${pathname}`,
              // The scoped form is easy to mistype, so point at it whenever the
              // path looks like an attempt at it.
              ...(pathname.startsWith('/v1/agents/') && !agentSkillScope
                ? {
                    hint: 'Expected /v1/agents/{agent_name}/skills/{skill_name}/{endpoint}',
                  }
                : {}),
            },
            404,
          );
        }

        const configString = c.req.header('sa-config');
        if (!configString && !agentSkillScope) {
          return c.json({ error: 'Missing Super Agents config' }, 422);
        }
        const rawConfig = configString ? JSON.parse(configString) : {};

        // The path always wins over the header so that a client pointed at a
        // skill's base URL cannot accidentally target another skill.
        const config = agentSkillScope
          ? {
              ...rawConfig,
              agent_name: agentSkillScope.agent_name,
              skill_name: agentSkillScope.skill_name,
            }
          : rawConfig;

        const saConfigPreProcessed = SuperAgentsConfigPreProcessed.safeParse(
          config,
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

        try {
          const saRequestData = produceSuperAgentsRequestData(
            method,
            c.req.url,
            c.req.header(),
            body,
          );
          c.set('sa_request_data', saRequestData);
        } catch (err) {
          // `isKnownRoute` ignores the body, so a route can still be ruled out
          // here by the request's stream mode or by its schema.
          if (err instanceof InvalidRequestBodyError) {
            return c.json({ error: err.message }, 422);
          }
          throw err;
        }
      }
    }
    await next();
  },
);
