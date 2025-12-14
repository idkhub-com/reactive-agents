'use client';

import { useEffect } from 'react';

export function DevToolsInit() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Dynamically import and initialize performance devtools
      import('@client/utils/performance-devtools').catch((error) => {
        console.warn('Failed to load performance devtools:', error);
      });
    }
  }, []);

  // This component renders nothing
  return null;
}
