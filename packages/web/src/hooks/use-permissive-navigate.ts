'use client';

import { useNavigate } from '@tanstack/react-router';

// Permissive navigate type that allows any string path during migration
// This can be tightened once all routes are created
export type PermissiveNavigateOptions = {
  to: string;
  replace?: boolean;
  search?: Record<string, unknown>;
  params?: Record<string, string>;
};

export type PermissiveNavigateFn = (opts: PermissiveNavigateOptions) => void;

/**
 * A wrapper around TanStack Router's useNavigate that allows navigation to any path.
 * This is useful during migration when not all routes are defined in the route tree yet.
 * Once all routes are created, replace usages with the typed useNavigate from @tanstack/react-router.
 */
export function usePermissiveNavigate(): PermissiveNavigateFn {
  const navigate = useNavigate();
  return navigate as unknown as PermissiveNavigateFn;
}
