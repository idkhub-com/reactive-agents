'use client';

import { useSettingsValidation } from '@client/hooks/use-settings-validation';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { isComplete, isLoading } = useSettingsValidation();

  useEffect(() => {
    // Wait for validation to complete
    if (isLoading) return;

    if (isComplete) {
      // Settings are complete, redirect to agents
      router.replace('/agents');
    } else {
      // Settings are incomplete, redirect to settings
      router.replace('/settings');
    }
  }, [isLoading, isComplete, router]);

  return children;
}
