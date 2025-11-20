'use client';

import { useSSE } from '@client/hooks/use-sse';
import { error, info } from '@shared/console-logging';
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
      info('[SSE Provider] Connected to real-time updates');
    } else if (connectionState.error) {
      error('[SSE Provider] Connection error:', connectionState.error);
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
  info('[SSE Provider] Processing event:', event.type);

  switch (event.type) {
    // Agent events
    case 'agent:created':
    case 'agent:updated':
    case 'agent:deleted':
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['agent'] }); // Also invalidate individual agent queries
      queryClient.invalidateQueries({ queryKey: ['agent-validation'] });
      queryClient.invalidateQueries({ queryKey: ['agent-unready-skills'] });
      break;

    // Skill events
    case 'skill:created':
    case 'skill:updated':
    case 'skill:deleted':
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['skill'] }); // Also invalidate individual skill queries
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
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
      break;

    // Log events
    case 'log:created': {
      // Invalidate logs queries to trigger refetch
      const { log } = event.data as {
        log?: { agent_id: string; skill_id: string };
      };
      if (log) {
        // Invalidate all logs queries for this agent/skill combination
        // This will cause active queries to refetch and show the new log
        queryClient.invalidateQueries({
          queryKey: ['logs', 'list', log.agent_id, log.skill_id],
        });
      }
      break;
    }

    // Skill optimization events
    case 'skill-optimization:arm-updated': {
      // Handle two different payload formats
      const eventData = event.data as {
        // Format 1: Direct IDs
        armId?: string;
        skillId?: string;
        clusterId?: string;
        // Format 2: Full objects
        arm?: {
          id: string;
          skill_id: string;
          cluster_id: string;
          [key: string]: unknown;
        };
        cluster?: { id: string; skill_id: string; [key: string]: unknown };
        skill?: { id: string; [key: string]: unknown };
      };

      // Extract IDs from either format
      const armId = eventData.armId || eventData.arm?.id;
      const skillId =
        eventData.skillId || eventData.arm?.skill_id || eventData.skill?.id;
      const clusterId =
        eventData.clusterId ||
        eventData.arm?.cluster_id ||
        eventData.cluster?.id;

      // Invalidate arms queries to trigger refetch and show updated configs
      if (armId || skillId) {
        queryClient.invalidateQueries({
          queryKey: ['skillOptimizationArms'],
        });
      }

      // Invalidate arm stats queries (used for performance colors)
      if (skillId) {
        queryClient.invalidateQueries({
          queryKey: ['skillArmStats', skillId],
        });
      }

      // Invalidate clusters queries
      if (clusterId) {
        queryClient.invalidateQueries({
          queryKey: ['skillOptimizationClusters'],
        });
      }

      // Invalidate skills to update overall stats
      if (skillId) {
        queryClient.invalidateQueries({
          queryKey: ['skills'],
          refetchType: 'none', // Mark stale but don't refetch
        });
      }
      break;
    }

    case 'skill-optimization:cluster-updated':
      queryClient.invalidateQueries({
        queryKey: ['skillOptimizationClusters'],
      });
      break;

    case 'skill-optimization:evaluation-run-created':
    case 'skill-optimization:evaluation-run-updated': {
      const evalData = event.data as {
        evaluationRun?: {
          id: string;
          skill_id: string;
          cluster_id: string;
          [key: string]: unknown;
        };
        agentId?: string;
        skillId?: string;
      };

      // Add/update evaluation run in cache
      if (evalData.evaluationRun && evalData.skillId) {
        const evaluationRun = evalData.evaluationRun;
        queryClient.setQueriesData(
          {
            queryKey: [
              'skillOptimizationEvaluationRuns',
              'list',
              evalData.skillId,
            ],
          },
          (oldData: unknown) => {
            if (!oldData) return oldData;
            const runs = oldData as Array<{
              id: string;
              [key: string]: unknown;
            }>;

            // Check if this is an update or creation
            const existingIndex = runs.findIndex(
              (run) => run.id === evaluationRun.id,
            );

            if (existingIndex >= 0) {
              // Update existing run
              const newRuns = [...runs];
              newRuns[existingIndex] = evaluationRun;
              return newRuns;
            } else {
              // Add new run
              return [evaluationRun, ...runs];
            }
          },
        );
      }

      // Also invalidate logs to update evaluation scores
      if (evalData.agentId && evalData.skillId) {
        queryClient.invalidateQueries({
          queryKey: ['logs', 'list', evalData.agentId, evalData.skillId],
        });
      }

      // Mark skill evaluation scores as stale (but don't refetch immediately)
      // The chart's timer will pick up the changes on next update
      if (evalData.skillId) {
        queryClient.invalidateQueries({
          queryKey: ['skillEvaluationScores', evalData.skillId],
          refetchType: 'none', // Mark stale but don't refetch
        });
      }

      // Mark cluster evaluation scores as stale
      if (evalData.evaluationRun?.cluster_id) {
        queryClient.invalidateQueries({
          queryKey: ['clusterEvaluationScores'],
          refetchType: 'none', // Mark stale but don't refetch
        });
      }
      break;
    }

    case 'skill-optimization:event-created':
      // Invalidate skill events and related queries
      queryClient.invalidateQueries({
        queryKey: ['skillEvents'],
      });
      // Also invalidate skills and arms since events indicate changes
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['skillOptimizationArms'] });
      queryClient.invalidateQueries({
        queryKey: ['skillOptimizationClusters'],
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
