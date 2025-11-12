import { handleAuth } from '@workos-inc/authkit-nextjs';
import { type NextRequest, NextResponse } from 'next/server';

export const GET = async (request: NextRequest) => {
  // Validate required WorkOS environment variables
  const requiredEnvVars = {
    WORKOS_API_KEY: process.env.WORKOS_API_KEY,
    WORKOS_CLIENT_ID: process.env.WORKOS_CLIENT_ID,
    WORKOS_COOKIE_PASSWORD: process.env.WORKOS_COOKIE_PASSWORD,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error(
      'Missing required WorkOS environment variables:',
      missingVars,
    );
    return NextResponse.json(
      {
        error: {
          message: 'Configuration error',
          description: `Missing required environment variables: ${missingVars.join(', ')}. Please check your .env file.`,
        },
      },
      { status: 500 },
    );
  }

  try {
    const handler = handleAuth();
    const response = await handler(request);

    // After successful authentication, set access_token cookie for API routes
    // This allows SSE and other API endpoints to authenticate
    if (response instanceof Response && response.ok) {
      const { authkit } = await import('@workos-inc/authkit-nextjs');
      const { session } = await authkit(request, {
        debug: process.env.NODE_ENV === 'development',
      });

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

          // Clone the response to add the cookie
          const responseWithCookie = NextResponse.next();
          responseWithCookie.cookies.set('access_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60, // 1 hour, matching the JWT expiration
          });

          // Copy headers from the original response
          response.headers.forEach((value, key) => {
            responseWithCookie.headers.set(key, value);
          });

          // Copy cookies from the original response (WorkOS sets its own cookies)
          response.headers.getSetCookie().forEach((cookie) => {
            responseWithCookie.headers.append('Set-Cookie', cookie);
          });

          return responseWithCookie;
        } catch (error) {
          console.error('Error creating access token cookie:', error);
          // Continue with original response if cookie creation fails
        }
      }
    }

    return response;
  } catch (error) {
    console.error('WorkOS callback error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const isPasswordError = errorMessage.toLowerCase().includes('password');

    return NextResponse.json(
      {
        error: {
          message: 'Authentication failed',
          description: isPasswordError
            ? 'WorkOS cookie password is missing or invalid. Please check your WORKOS_COOKIE_PASSWORD environment variable.'
            : `Couldn't sign in. If you are not sure what happened, please contact your organization admin. Error: ${errorMessage}`,
        },
      },
      { status: 500 },
    );
  }
};
