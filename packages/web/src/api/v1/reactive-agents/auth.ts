import type { authRouter } from '@api/v1/reactive-agents/auth';
import { hc } from 'hono/client';

const client = hc<typeof authRouter>('/v1/reactive-agents/auth', {
  init: {
    credentials: 'include',
  },
});

export interface AuthStatus {
  authRequired: boolean;
  authenticated: boolean;
}

export async function getAuthStatus(): Promise<AuthStatus | null> {
  try {
    const response = await client.status.$get();
    if (!response.ok) return null;
    return (await response.json()) as AuthStatus;
  } catch {
    return null;
  }
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
