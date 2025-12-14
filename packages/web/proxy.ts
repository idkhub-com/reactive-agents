import { verify } from 'hono/jwt';
import { type NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'development_jwt_secret';
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD;

/**
 * Generate CSP header with nonce for script security
 */
function generateCSPHeader(nonce: string): string {
  const cspHeader = `
    default-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'};
    connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'};
    script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/editor/editor.main.css;
    img-src 'self' blob: data: *.googleusercontent.com ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8787'};
    frame-src 'self' https://docs.google.com *.apps.googleusercontent.com;
    font-src 'self' https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/browser/ui/codicons/codicon/codicon.ttf;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `;

  return cspHeader.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Set security headers on response
 */
function setSecurityHeaders(
  response: NextResponse,
  request: NextRequest,
  nonce: string,
): void {
  response.headers.set('x-nonce', nonce);
  response.headers.set('Content-Security-Policy', generateCSPHeader(nonce));
  response.headers.set('X-Content-Type-Options', 'nosniff');

  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL || ''];
    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      response.headers.set(
        'Access-Control-Allow-Origin',
        process.env.NEXT_PUBLIC_APP_URL,
      );
    }
  }
}

/**
 * Next.js Proxy - runs at the network boundary before routes are rendered.
 *
 * Handles:
 * - Authentication: blocks unauthenticated users from the dashboard
 * - Security headers: CSP with nonce, X-Content-Type-Options
 * - CORS headers in production
 *
 * If authenticated, the request proceeds to the route.
 * If not authenticated, redirects to the login page.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  // Always allow these paths without auth check
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon')
  ) {
    const response = NextResponse.next({ request });
    setSecurityHeaders(response, request, nonce);
    return response;
  }

  // If ACCESS_PASSWORD is not set, allow all requests without authentication
  if (!ACCESS_PASSWORD) {
    const response = NextResponse.next({ request });
    setSecurityHeaders(response, request, nonce);
    return response;
  }

  const accessToken = request.cookies.get('access_token');

  let isLoggedIn = false;
  if (accessToken) {
    try {
      const decoded = await verify(accessToken.value, JWT_SECRET);
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        // Token expired
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('access_token');
        setSecurityHeaders(response, request, nonce);
        return response;
      }
      isLoggedIn = true;
    } catch {
      // Invalid token
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('access_token');
      setSecurityHeaders(response, request, nonce);
      return response;
    }
  }

  if (!isLoggedIn) {
    // Redirect to login page
    const response = NextResponse.redirect(new URL('/login', request.url));
    setSecurityHeaders(response, request, nonce);
    return response;
  }

  const response = NextResponse.next({ request });
  setSecurityHeaders(response, request, nonce);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
