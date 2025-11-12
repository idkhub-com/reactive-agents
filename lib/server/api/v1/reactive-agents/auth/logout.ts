import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';

export const logoutRouter = new Hono<AppEnv>()
  /**
   * Handles the '/auth/logout' API request by logging out the user.
   * For WorkOS AuthKit, we return the logout URL that the client should redirect to.
   * The actual logout is handled by WorkOS AuthKit's handleAuth() in the callback route.
   */
  .post((c): Response => {
    const clientId = process.env.WORKOS_CLIENT_ID;
    if (!clientId) {
      return c.json(
        { error: 'WORKOS_CLIENT_ID is not configured' },
        { status: 500 },
      );
    }

    // Construct the WorkOS logout URL
    // WorkOS AuthKit logout endpoint format
    const returnTo = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/login`,
    );
    const signOutUrl = `https://api.workos.com/sso/logout?client_id=${clientId}&return_pathname=${returnTo}`;

    return c.json({ signOutUrl });
  });
