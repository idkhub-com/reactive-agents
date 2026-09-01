import type { authRouter } from '@api/v1/super-agents/auth';
import { hc } from 'hono/client';

const client = hc<typeof authRouter>('/v1/super-agents/auth', {
  init: {
    credentials: 'include',
  },
});

export interface AuthStatus {
  authRequired: boolean;
  authenticated: boolean;
}

/**
 * The server is up but cannot serve anyone, and said why -- a database it
 * refuses to use, for instance. Not a reason to log in again: the message
 * is for whoever runs the server, so it is shown instead.
 */
export class ServerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerUnavailableError';
  }
}

/**
 * The dashboard's authentication status; null when the server could not be
 * reached or answered with anything but a status.
 *
 * @throws ServerUnavailableError when the server answered 503 with a reason.
 */
export async function getAuthStatus(): Promise<AuthStatus | null> {
  let response: Response;
  try {
    response = await client.status.$get();
  } catch {
    return null;
  }
  if (response.status === 503) {
    const reason = await response
      .json()
      .then((body) => (body as { error?: unknown }).error)
      .catch(() => undefined);
    if (typeof reason === 'string' && reason) {
      throw new ServerUnavailableError(reason);
    }
  }
  if (!response.ok) return null;
  return (await response.json()) as AuthStatus;
}

export async function login(password: string): Promise<boolean> {
  const response = await client.login.$post({
    json: { password },
  });
  return response.ok;
}

export async function logout(): Promise<boolean> {
  const response = await client.logout.$post();
  return response.ok;
}
