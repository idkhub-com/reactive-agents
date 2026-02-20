import { BEARER_TOKEN, getJwtSecret } from '@api/constants';
import type { AppEnv } from '@api/types/hono';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Factory } from 'hono/factory';
import { jwt } from 'hono/jwt';

/**
 * Authenticated middleware for API requests.
 *
 * Blocks unauthenticated requests when either ACCESS_PASSWORD or BEARER_TOKEN is configured.
 *
 * Authentication is checked in this order:
 * 1. JWT cookie (access_token) — set by the login flow when ACCESS_PASSWORD is configured
 * 2. Bearer token header — for programmatic API access
 *
 * If neither ACCESS_PASSWORD nor BEARER_TOKEN is configured, all requests are allowed through.
 * Auth endpoints (/v1/reactive-agents/auth/*) are always exempt.
 */
export const authenticatedMiddleware = (
  factory: Factory<AppEnv>,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    // Allow access to auth endpoints so that we can login or verify authorization
    if (
      c.req.path.startsWith('/v1/reactive-agents/auth/login') ||
      c.req.path.startsWith('/v1/reactive-agents/auth/verify') ||
      c.req.path.startsWith('/v1/reactive-agents/auth/status')
    ) {
      await next();
      return;
    }

    const jwtSecret = c.env?.JWT_SECRET ?? getJwtSecret();
    const bearerToken = c.env?.BEARER_TOKEN ?? BEARER_TOKEN;
    const accessPassword = c.env?.ACCESS_PASSWORD;

    // If neither ACCESS_PASSWORD nor BEARER_TOKEN is configured, skip auth
    if (!accessPassword && !bearerToken) {
      await next();
      return;
    }

    // Check JWT cookie first (set by login flow)
    const accessTokenCookie = getCookie(c, 'access_token');
    if (accessTokenCookie) {
      await jwt({ cookie: 'access_token', secret: jwtSecret })(c, next);
      return;
    }

    // Check Bearer token header (for programmatic access)
    const bearerHeaderString = c.req.header('authorization');
    if (bearerHeaderString) {
      const parts = bearerHeaderString.split(' ');
      if (
        parts.length === 2 &&
        parts[0].toLowerCase() === 'bearer' &&
        bearerToken &&
        parts[1] === bearerToken
      ) {
        await next();
        return;
      }
    }

    c.res = c.text('Unauthorized', 401);
  });
