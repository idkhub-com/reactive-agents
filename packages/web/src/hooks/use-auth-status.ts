'use client';

import { useQuery } from '@tanstack/react-query';
import { type AuthStatus, getAuthStatus } from '@web/api/v1/super-agents/auth';

export const authStatusQueryKeys = {
  all: ['auth-status'] as const,
  detail: () => [...authStatusQueryKeys.all, 'detail'] as const,
};

/**
 * The dashboard's authentication status, or null while it loads and whenever
 * the server could not be reached.
 *
 * `authRequired` is false when the server has no ACCESS_PASSWORD set. Nothing
 * that offers to end a session should render in that case: there is no session
 * to end, and `/login` sends an arriving visitor straight back to the
 * dashboard.
 */
export function useAuthStatus(): AuthStatus | null {
  const { data = null } = useQuery({
    queryKey: authStatusQueryKeys.detail(),
    queryFn: getAuthStatus,
  });

  return data;
}
