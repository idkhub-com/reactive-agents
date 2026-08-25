import { AUTH_COOKIE_MAX_AGE } from '@api/constants';
import type { AppContext } from '@api/types/hono';
import type { CookieOptions } from 'hono/utils/cookie';

export const AUTH_COOKIE_NAME = 'access_token';

/**
 * Whether the request reached us over HTTPS.
 *
 * In production the API usually sits behind a TLS-terminating proxy (nginx in
 * the Docker deployment), so `c.req.url` reports `http:` even though the
 * browser is on HTTPS. Trust `X-Forwarded-Proto` when the proxy sets it, and
 * fall back to the request's own protocol.
 */
const isSecureRequest = (c: AppContext): boolean => {
  const forwardedProto = c.req.header('X-Forwarded-Proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase() === 'https';
  }
  return new URL(c.req.url).protocol === 'https:';
};

/**
 * Cookie options for the dashboard session cookie.
 *
 * `login` and `logout` must agree on these: a browser only replaces a cookie
 * when the name, domain and path match, so the delete has to mirror the set.
 */
export const authCookieOptions = (c: AppContext): CookieOptions => ({
  path: '/',
  sameSite: 'Lax',
  secure: isSecureRequest(c),
  httpOnly: true,
});

export const authCookieSetOptions = (c: AppContext): CookieOptions => ({
  ...authCookieOptions(c),
  maxAge: AUTH_COOKIE_MAX_AGE,
});
