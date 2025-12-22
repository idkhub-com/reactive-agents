import { Link } from '@tanstack/react-router';
import type { ComponentProps, ReactNode } from 'react';

type LinkProps = ComponentProps<typeof Link>;

export interface PermissiveLinkProps
  extends Omit<LinkProps, 'to' | 'params' | 'search'> {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  children?: ReactNode;
}

/**
 * A wrapper around TanStack Router's Link component that accepts any string path.
 * Use this during the migration period when not all routes are defined in the route tree.
 */
export function PermissiveLink({
  to,
  params,
  search,
  children,
  ...props
}: PermissiveLinkProps) {
  return (
    <Link
      to={to as '/'}
      params={params as Record<string, string>}
      search={search as Record<string, string>}
      {...props}
    >
      {children}
    </Link>
  );
}
