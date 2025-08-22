import { BEARER_TOKEN, JWT_SECRET } from '@server/constants';
import type { AppEnv } from '@server/types/hono';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Factory } from 'hono/factory';
import { jwt, verify } from 'hono/jwt';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Authenticated middleware for API requests that blocks requests to the API
 * without a valid authorization header.
 *
 * Native Hono middleware to check if the user is authenticated.
 *
 * If the user is authenticated, the request will be passed to the next middleware
 * If the user is not authenticated, the request will be rejected with a 401 Unauthorized status
 */
export const authenticatedMiddleware = (
  factory: Factory<AppEnv>,
): MiddlewareHandler =>
  factory.createMiddleware(async (c, next) => {
    if (c.req.path.startsWith('/v1/idk/auth')) {
      return next();
    }

    const accessTokenCookie = getCookie(c, 'access_token');

    if (accessTokenCookie) {
      return jwt({ cookie: 'access_token', secret: JWT_SECRET })(c, next);
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

/**
 * Authenticated middleware for client that blocks unauthenticated users
 * from reaching the dashboard without a valid access token cookie.
 *
 * Next.js middleware to check if the user is authenticated.
 *
 * Runs before the Hono middleware.
 * API requests are bypassed and handled by the Hono middleware.
 *
 * If the user is authenticated, the request will be passed to the next middleware
 * If the user is not authenticated, the request will be redirected to the login page
 */
export async function clientAuthenticatedMiddleware(
  request: NextRequest,
): Promise<NextResponse> {
  const nextResponse = NextResponse.next({
    request,
  });

  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/v1/idk/auth/login') ||
    request.nextUrl.pathname.startsWith('/v1/idk/auth/logout')
  ) {
    // Always allow these so the user can login and logout
    return nextResponse;
  }

  const accessToken = request.cookies.get('access_token');

  let isLoggedIn = false;
  if (accessToken) {
    const decoded = await verify(accessToken.value, JWT_SECRET);
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      request.cookies.delete('access_token');
    } else {
      isLoggedIn = true;
    }
  }

  if (!isLoggedIn) {
    if (request.nextUrl.pathname.startsWith('/v1')) {
      // Allows API requests to pass through
      // We will handle checking the bearer token in the authenticatedMiddleware
      return nextResponse;
    }

    // Everything else redirects to the login page
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return nextResponse;
}
