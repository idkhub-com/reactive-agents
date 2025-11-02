'use client';

import { useSSE } from '@client/hooks/use-sse';
import type { SSEEventData } from '@shared/types/sse';
import { useQueryClient } from '@tanstack/react-query';
import type React from 'react';
import { createContext, type ReactElement, useContext, useEffect } from 'react';

interface SSEContextType {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
}

const SSEContext = createContext<SSEContextType | undefined>(undefined);

/**
 * SSE Provider
 * Manages Server-Sent Events connection and integrates with React Query
 * Automatically invalidates queries when relevant events are received
 */
export const SSEProvider = ({
  children,
}: {
  children: React.ReactNode;
}): ReactElement => {
  const queryClient = useQueryClient();

  // Connect to SSE endpoint
  const { connectionState, subscribe } = useSSE('/v1/reactive-agents/events', {
    reconnectDelay: 3000,
    maxReconnectAttempts: 5,
    pingInterval: 30000,
  });

  // Handle SSE events and invalidate React Query caches
  useEffect(() => {
    const unsubscribe = subscribe('*', (event: SSEEventData) => {
      handleSSEEvent(event, queryClient);
    });

    return unsubscribe;
  }, [subscribe, queryClient]);

  // Log connection status changes
  useEffect(() => {
    if (connectionState.connected) {
      console.log('[SSE Provider] Connected to real-time updates');
    } else if (connectionState.error) {
      console.error('[SSE Provider] Connection error:', connectionState.error);
    }
  }, [connectionState.connected, connectionState.error]);

  const contextValue: SSEContextType = {
    connected: connectionState.connected,
    connecting: connectionState.connecting,
    error: connectionState.error,
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

/**
 * Handle SSE events and invalidate appropriate React Query caches
 */
function handleSSEEvent(
  event: SSEEventData,
  queryClient: ReturnType<typeof useQueryClient>,
): void {
  console.log('[SSE Provider] Processing event:', event.type);

  switch (event.type) {
    // Agent events
    case 'agent:created':
    case 'agent:updated':
    case 'agent:deleted':
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent-validation'] });
      queryClient.invalidateQueries({ queryKey: ['agent-unready-skills'] });
      break;

    // Skill events
    case 'skill:created':
    case 'skill:updated':
    case 'skill:deleted':
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['skill-validation-models'] });
      queryClient.invalidateQueries({
        queryKey: ['skill-validation-evaluations'],
      });
      queryClient.invalidateQueries({ queryKey: ['agent-validation'] });
      queryClient.invalidateQueries({ queryKey: ['agent-unready-skills'] });
      break;

    // Model events
    case 'model:created':
    case 'model:updated':
    case 'model:deleted':
      // Invalidate all models queries (includes skill models)
      queryClient.invalidateQueries({ queryKey: ['models'] });
      queryClient.invalidateQueries({ queryKey: ['skill-validation-models'] });
      queryClient.invalidateQueries({ queryKey: ['agent-unready-skills'] });
      break;

    // Evaluation events
    case 'evaluation:created':
    case 'evaluation:updated':
    case 'evaluation:deleted':
      // Invalidate all evaluations queries
      queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      queryClient.invalidateQueries({
        queryKey: ['skill-validation-evaluations'],
      });
      queryClient.invalidateQueries({ queryKey: ['agent-unready-skills'] });
      break;

    // AI Provider events
    case 'ai-provider:created':
    case 'ai-provider:updated':
    case 'ai-provider:deleted':
      queryClient.invalidateQueries({ queryKey: ['ai-provider-api-keys'] });
      break;

    // Log events
    case 'log:created':
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      break;

    // Skill optimization events
    case 'skill-optimization:arm-updated':
      queryClient.invalidateQueries({ queryKey: ['skillOptimizationArms'] });
      break;

    case 'skill-optimization:cluster-updated':
      queryClient.invalidateQueries({
        queryKey: ['skillOptimizationClusters'],
      });
      break;

    case 'skill-optimization:evaluation-run-created':
    case 'skill-optimization:evaluation-run-updated':
      queryClient.invalidateQueries({
        queryKey: ['skillOptimizationEvaluationRuns'],
      });
      break;

    // Feedback events
    case 'feedback:created':
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
      break;

    case 'improved-response:created':
      queryClient.invalidateQueries({ queryKey: ['improved-responses'] });
      break;

    // Ignore ping events
    case 'ping':
      break;

    default:
      console.warn('[SSE Provider] Unknown event type:', event.type);
  }
}
