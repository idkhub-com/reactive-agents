import { clientAuthenticatedMiddleware } from '@server/middlewares/auth';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self' ${process.env.NEXT_PUBLIC_API_URL};
    connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL};
    script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/editor/editor.main.css;
    img-src 'self' blob: data: *.googleusercontent.com ${process.env.NEXT_PUBLIC_APP_URL};
    frame-src 'self' https://docs.google.com *.apps.googleusercontent.com;
    font-src 'self' https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/browser/ui/codicons/codicon/codicon.ttf;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`;

  const contentSecurityPolicyHeaderValue = cspHeader
    .replace(/\s{2,}/g, ' ')
    .trim();

  const response = NextResponse.next();
  response.headers.set('x-nonce', nonce);
  response.headers.set(
    'Content-Security-Policy',
    contentSecurityPolicyHeaderValue,
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');

  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [`${process.env.NEXT_PUBLIC_APP_URL}`];
    const origin = request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    } else {
      response.headers.set(
        'Access-Control-Allow-Origin',
        `${process.env.NEXT_PUBLIC_APP_URL}`,
      );
    }
  }
  return await clientAuthenticatedMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
