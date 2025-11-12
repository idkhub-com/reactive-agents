import { BEARER_TOKEN, SUPABASE_JWT_SECRET } from '@server/constants';
import type { AppEnv } from '@server/types/hono';
import type { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Factory } from 'hono/factory';
import { jwt } from 'hono/jwt';
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
    if (c.req.path.startsWith('/v1/reactive-agents/auth')) {
      return next();
    }

    // First, check for bearer token (API key auth)
    const bearerHeaderString = c.req.header('authorization');
    if (bearerHeaderString) {
      const bearerToken = bearerHeaderString.split(' ')[1];
      if (bearerToken === BEARER_TOKEN) {
        await next();
        return;
      }
    }

    // Note: WorkOS AuthKit session verification in Hono middleware is complex
    // because WorkOS encrypts session cookies. For API routes:
    // 1. Bearer token auth (for API keys) - handled above
    // 2. Old JWT cookie auth - handled below as fallback
    // 3. WorkOS session cookies are verified by Next.js middleware for client routes
    //
    // For API routes that need WorkOS session verification, consider:
    // - Passing session info from Next.js middleware to Hono via custom headers
    // - Or using WorkOS Node SDK to verify the encrypted session cookie
    // This requires additional implementation based on your specific needs

    // Fallback to old JWT cookie auth for backward compatibility
    const accessTokenCookie = getCookie(c, 'access_token');
    if (accessTokenCookie) {
      return jwt({ cookie: 'access_token', secret: SUPABASE_JWT_SECRET })(
        c,
        next,
      );
    }

    // No valid authentication found
    return c.text('Unauthorized', 401);
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
  // Check for WorkOS session and set access_token cookie for API routes
  // This allows SSE and other API endpoints to authenticate
  const { authkit } = await import('@workos-inc/authkit-nextjs');
  const { session } = await authkit(request, {
    debug: process.env.NODE_ENV === 'development',
  });

  const response = request.nextUrl.pathname.startsWith('/v1')
    ? NextResponse.next()
    : null;

  // Set access_token cookie if we have a valid WorkOS session
  // This is needed for API routes that use the old JWT cookie auth
  if (session.user) {
    const { createSupabaseAccessTokenFromUserInfo } = await import(
      '@server/utils/auth'
    );
    try {
      const { accessToken } = await createSupabaseAccessTokenFromUserInfo({
        user: session.user,
        sessionId: session.sessionId,
        organizationId: session.organizationId,
        role: session.role,
        permissions: session.permissions,
        entitlements: session.entitlements,
        featureFlags: session.featureFlags,
        impersonator: session.impersonator,
        accessToken: session.accessToken,
      });

      const finalResponse =
        response ||
        (await (async () => {
          // For non-API routes, check authentication and get headers
          const { headers, authorizationUrl } = await authkit(request, {
            debug: process.env.NODE_ENV === 'development',
          });

          // Redirect to login if the user is not authenticated
          if (!session.user) {
            return NextResponse.redirect(authorizationUrl || '/login');
          }

          return NextResponse.next({ headers });
        })());

      // Set the access_token cookie with same settings as WorkOS cookies
      finalResponse.cookies.set('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 hour, matching the JWT expiration
      });

      return finalResponse;
    } catch (error) {
      console.error('Error creating access token cookie:', error);
      // Continue without the cookie
    }
  }

  // For API routes, let Hono middleware handle authentication
  if (request.nextUrl.pathname.startsWith('/v1')) {
    return response || NextResponse.next();
  }

  // Bypass the middleware for the login and callback routes
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/callback')
  ) {
    return NextResponse.next();
  }

  // For non-API routes, check authentication
  const { headers, authorizationUrl } = await authkit(request, {
    debug: process.env.NODE_ENV === 'development',
  });

  // Redirect to login if the user is not authenticated
  if (!session.user) {
    return NextResponse.redirect(authorizationUrl || '/login');
  }

  // Create response with WorkOS headers
  const finalResponse = NextResponse.next({
    headers: headers,
  });

  // Set access_token cookie (already handled above for API routes)
  if (session.user) {
    const { createSupabaseAccessTokenFromUserInfo } = await import(
      '@server/utils/auth'
    );
    try {
      const { accessToken } = await createSupabaseAccessTokenFromUserInfo({
        user: session.user,
        sessionId: session.sessionId,
        organizationId: session.organizationId,
        role: session.role,
        permissions: session.permissions,
        entitlements: session.entitlements,
        featureFlags: session.featureFlags,
        impersonator: session.impersonator,
        accessToken: session.accessToken,
      });

      finalResponse.cookies.set('access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60, // 1 hour, matching the JWT expiration
      });
    } catch (error) {
      console.error('Error creating access token cookie:', error);
    }
  }

  return finalResponse;
}
