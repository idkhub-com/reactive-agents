'use client';

import { info } from '@shared/console-logging';
import type {
  SSEConnectionOptions,
  SSEEventData,
  SSEEventType,
} from '@shared/types/sse';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * SSE Event Handler
 * Callback function that handles SSE events
 */
export type SSEEventHandler = (event: SSEEventData) => void;

/**
 * SSE Connection State
 */
export interface SSEConnectionState {
  connected: boolean;
  connecting: boolean;
  error: Error | null;
  reconnectAttempts: number;
}

/**
 * useSSE Hook
 * Manages Server-Sent Events connection and event handling
 *
 * @param url - SSE endpoint URL
 * @param options - Connection options
 * @returns Connection state and event subscription methods
 */
export function useSSE(url: string, options: SSEConnectionOptions = {}) {
  const {
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    pingInterval = 30000,
  } = options;

  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<
    Map<SSEEventType | '*', Set<SSEEventHandler>>
  >(new Map());
  const lastPingRef = useRef<number>(Date.now());

  /**
   * Subscribe to specific event type
   */
  const subscribe = (
    eventType: SSEEventType | '*',
    handler: SSEEventHandler,
  ): (() => void) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)?.add(handler);

    // Return unsubscribe function
    return () => {
      eventHandlersRef.current.get(eventType)?.delete(handler);
    };
  };

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected or connecting
    }

    setConnectionState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const eventSource = new EventSource(url, {
        withCredentials: true, // Include cookies for authentication
      });

      eventSource.onopen = () => {
        info('[SSE Client] Connection established');
        setConnectionState({
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempts: 0,
        });
        lastPingRef.current = Date.now();
      };

      eventSource.onmessage = (event) => {
        try {
          // Skip empty data (keep-alive messages, comments, etc.)
          if (!event.data || event.data.trim() === '') {
            return;
          }

          const data: SSEEventData = JSON.parse(event.data);

          // Update last ping time
          if (data.type === 'ping') {
            lastPingRef.current = Date.now();
            return;
          }

          // Log received event
          info('[SSE Client] Received event:', data.type);

          // Call specific event handlers
          const specificHandlers = eventHandlersRef.current.get(data.type);
          if (specificHandlers) {
            for (const handler of specificHandlers) {
              try {
                handler(data);
              } catch (error) {
                console.error('[SSE Client] Error in event handler:', error);
              }
            }
          }

          // Call wildcard handlers
          const wildcardHandlers = eventHandlersRef.current.get('*');
          if (wildcardHandlers) {
            for (const handler of wildcardHandlers) {
              try {
                handler(data);
              } catch (error) {
                console.error('[SSE Client] Error in wildcard handler:', error);
              }
            }
          }
        } catch (error) {
          console.error('[SSE Client] Error parsing event data:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[SSE Client] Connection error:', error);

        eventSource.close();
        eventSourceRef.current = null;

        const currentAttempts = connectionState.reconnectAttempts + 1;

        setConnectionState({
          connected: false,
          connecting: false,
          error: new Error('SSE connection failed'),
          reconnectAttempts: currentAttempts,
        });

        // Attempt to reconnect if under max attempts
        if (currentAttempts < maxReconnectAttempts) {
          info(
            `[SSE Client] Reconnecting in ${reconnectDelay}ms (attempt ${currentAttempts}/${maxReconnectAttempts})`,
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          console.error('[SSE Client] Max reconnection attempts reached');
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('[SSE Client] Error creating EventSource:', error);
      setConnectionState((prev) => ({
        ...prev,
        connecting: false,
        error: error as Error,
      }));
    }
  }, [
    url,
    connectionState.reconnectAttempts,
    maxReconnectAttempts,
    reconnectDelay,
  ]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionState({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
    });

    info('[SSE Client] Disconnected');
  }, []);

  /**
   * Check for stale connection (no ping received within interval)
   */
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (connectionState.connected) {
        const timeSinceLastPing = Date.now() - lastPingRef.current;
        if (timeSinceLastPing > pingInterval * 2) {
          console.warn(
            '[SSE Client] Connection appears stale, reconnecting...',
          );
          disconnect();
          connect();
        }
      }
    }, pingInterval);

    return () => clearInterval(checkInterval);
  }, [connectionState.connected, pingInterval, connect, disconnect]);

  /**
   * Auto-connect on mount, disconnect on unmount
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionState,
    subscribe,
    connect,
    disconnect,
  };
}
