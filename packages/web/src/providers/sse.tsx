'use client';

import type React from 'react';
import { createContext, type ReactElement, useContext } from 'react';

interface SSEContextType {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

/**
 * SSE Provider
 *
 * NOTE: SSE is disabled because the API runs on Cloudflare Workers,
 * which doesn't support long-running connections like Server-Sent Events.
 *
 * This provider returns a disabled state. Real-time updates are not available.
 * To see updates, refresh the page manually.
 *
 * For real-time functionality with Cloudflare Workers, consider:
 * - Durable Objects with WebSockets
 * - Cloudflare Queues + polling
 * - Third-party services (Pusher, Ably, etc.)
 */
export const SSEProvider = ({
  children,
}: {
  children: React.ReactNode;
}): ReactElement => {
  // SSE is disabled - Cloudflare Workers doesn't support long-running connections
  const contextValue: SSEContextType = {
    connected: false,
    connecting: false,
    error: new Error('SSE not supported on Cloudflare Workers'),
  };

  return (
    <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>
  );
};

/**
 * Hook to access SSE connection status
 */
export const useSSEStatus = (): SSEContextType => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSEStatus must be used within an SSEProvider');
  }
  return context;
};
