'use client';

import { useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback } from 'react';

/**
 * Hook for smart back navigation that respects browser history
 */
export function useSmartBack() {
  const router = useRouter();
  const navigate = useNavigate();

  return useCallback(
    (fallbackUrl?: string) => {
      // Check if we can go back in browser history
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.history.back();
      } else if (fallbackUrl) {
        // Fallback to provided URL
        navigate({ to: fallbackUrl });
      } else {
        // Ultimate fallback to agents
        navigate({ to: '/agents' });
      }
    },
    [router, navigate],
  );
}
