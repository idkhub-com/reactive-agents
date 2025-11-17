import { z } from 'zod';

/**
 * SSE Event Types
 * Defines all possible real-time events that can be broadcast to clients
 */
export const SSEEventType = z.enum([
  // Agent events
  'agent:created',
  'agent:updated',
  'agent:deleted',

  // Skill events
  'skill:created',
  'skill:updated',
  'skill:deleted',

  // Model events
  'model:created',
  'model:updated',
  'model:deleted',

  // Evaluation events
  'evaluation:created',
  'evaluation:updated',
  'evaluation:deleted',

  // AI Provider events
  'ai-provider:created',
  'ai-provider:updated',
  'ai-provider:deleted',

  // Log events
  'log:created',

  // Skill optimization events
  'skill-optimization:arm-updated',
  'skill-optimization:cluster-updated',
  'skill-optimization:evaluation-run-created',
  'skill-optimization:evaluation-run-updated',
  'skill-optimization:evaluations-regenerated',
  'skill-optimization:event-created',
  'cluster:reset',
  'skill:reset',

  // Feedback events
  'feedback:created',
  'improved-response:created',

  // System events
  'ping',
]);

export type SSEEventType = z.infer<typeof SSEEventType>;

/**
 * SSE Event Data
 * Contains the payload for each event type
 */
export const SSEEventData = z.object({
  type: SSEEventType,
  timestamp: z.number(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type SSEEventData = z.infer<typeof SSEEventData>;

/**
 * SSE Connection Options
 */
export interface SSEConnectionOptions {
  /**
   * Reconnection delay in milliseconds (default: 3000)
   */
  reconnectDelay?: number;

  /**
   * Maximum number of reconnection attempts (default: 5)
   */
  maxReconnectAttempts?: number;

  /**
   * Ping interval in milliseconds to keep connection alive (default: 30000)
   */
  pingInterval?: number;
}
