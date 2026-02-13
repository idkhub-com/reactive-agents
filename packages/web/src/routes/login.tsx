import { createFileRoute, redirect } from '@tanstack/react-router';
import { API_URL } from '@web/constants';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    let authData: { authRequired: boolean; authenticated: boolean } | null =
      null;

    try {
      const response = await fetch(
        `${API_URL}/v1/reactive-agents/auth/status`,
        { credentials: 'include' },
      );
      if (response.ok) {
        authData = await response.json();
      }
    } catch {
      return;
    }

    if (authData && (!authData.authRequired || authData.authenticated)) {
      throw redirect({ to: '/agents' });
    }
  },
});
