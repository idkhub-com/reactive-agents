'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Hook for smart back navigation that respects browser history
 */
export function useSmartBack() {
  const router = useRouter();

  return useCallback(
    (fallbackUrl?: string) => {
      // Check if we can go back in browser history
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else if (fallbackUrl) {
        // Fallback to provided URL
        router.push(fallbackUrl);
      } else {
        // Ultimate fallback to agents
        router.push('/agents');
      }
    },
    [router],
  );
}
