import { createFileRoute, redirect } from '@tanstack/react-router';
import { getAuthStatus } from '@web/api/v1/super-agents/auth';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const authData = await getAuthStatus();
    if (!authData) return;

    if (!authData.authRequired || authData.authenticated) {
      throw redirect({ to: '/agents' });
    }
  },
});
