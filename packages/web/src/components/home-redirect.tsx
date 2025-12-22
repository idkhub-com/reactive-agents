'use client';

import { usePermissiveNavigate } from '@web/hooks/use-permissive-navigate';
import { useSettingsValidation } from '@web/hooks/use-settings-validation';
import type { ReactElement } from 'react';
import { useEffect } from 'react';

interface HomeRedirectProps {
  /** Children to render while checking redirect or if no redirect needed */
  children: ReactElement;
}

/**
 * Component that handles automatic redirection from the home page.
 * - Redirects to /settings when settings are not complete
 * - Redirects to /agents when settings are complete
 */
export function HomeRedirect({ children }: HomeRedirectProps): ReactElement {
  const navigate = usePermissiveNavigate();
  const { isComplete, isLoading } = useSettingsValidation();

  useEffect(() => {
    // Wait for validation to complete
    if (isLoading) return;

    if (isComplete) {
      // Settings are complete, redirect to agents
      navigate({ to: '/agents', replace: true });
    } else {
      // Settings are incomplete, redirect to settings
      navigate({ to: '/settings', replace: true });
    }
  }, [isLoading, isComplete, navigate]);

  return children;
}
