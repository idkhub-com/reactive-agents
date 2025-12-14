import { BEARER_TOKEN, JWT_SECRET } from '@server/constants';
import type { AppEnv } from '@server/types/hono';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Factory } from 'hono/factory';
import { jwt } from 'hono/jwt';

/**
 * Authenticated middleware for API requests that blocks requests to the API
 * without a valid authorization header.
 *
 * Native Hono middleware to check if the user is authenticated.
 *
 * If the user is authenticated, the request will be passed to the next middleware
 * If the user is not authenticated, the request will be rejected with a 401 Unauthorized status
 *
 * If BEARER_TOKEN is not configured, API requests without JWT authentication will be allowed through.
 */
export const authenticatedMiddleware = (
  factory: Factory<AppEnv>,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    if (c.req.path.startsWith('/v1/reactive-agents/auth')) {
      return next();
    }

    const accessTokenCookie = getCookie(c, 'access_token');

    if (accessTokenCookie) {
      return jwt({ cookie: 'access_token', secret: JWT_SECRET })(c, next);
    }

    // If BEARER_TOKEN is not configured, allow requests through without authentication
    if (!BEARER_TOKEN) {
      return next();
    }

    const bearerHeaderString = c.req.header('authorization');

    if (!bearerHeaderString) {
      return c.text('Unauthorized', 401);
    }

    const bearerToken = bearerHeaderString.split(' ')[1];

    if (bearerToken === BEARER_TOKEN) {
      await next();
    } else {
      return c.text('Unauthorized', 401);
    }
  });
