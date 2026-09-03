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
  /**
   * True once the endpoint has refused us `maxReconnectAttempts` times in a
   * row without a single successful open. The server is not going to start
   * streaming on its own -- it is a runtime without SSE support, or it is
   * down -- so the caller should fall back to polling instead of waiting.
   */
  degraded: boolean;
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
    reconnectDelay = 8787,
    maxReconnectAttempts = 5,
    pingInterval = 30000,
    enabled = true,
  } = options;

  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
    degraded: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<
    Map<SSEEventType | '*', Set<SSEEventHandler>>
  >(new Map());
  const lastPingRef = useRef<number>(Date.now());
  /**
   * Attempts live in a ref rather than in state so that `connect` keeps a
   * stable identity. Reading them from state made every failed attempt
   * produce a new `connect`, which the mount effect below then treated as a
   * reason to tear the connection down and build it again.
   */
  const reconnectAttemptsRef = useRef(0);

  /**
   * Subscribe to specific event type
   */
  const subscribe = useCallback(
    (eventType: SSEEventType | '*', handler: SSEEventHandler): (() => void) => {
      if (!eventHandlersRef.current.has(eventType)) {
        eventHandlersRef.current.set(eventType, new Set());
      }
      eventHandlersRef.current.get(eventType)?.add(handler);

      // Return unsubscribe function
      return () => {
        eventHandlersRef.current.get(eventType)?.delete(handler);
      };
    },
    [],
  );

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected or connecting
    }

    if (typeof EventSource === 'undefined') {
      return; // No EventSource (SSR, or a test environment without one)
    }

    setConnectionState((prev) => ({ ...prev, connecting: true, error: null }));

    try {
      const eventSource = new EventSource(url, {
        withCredentials: true, // Include cookies for authentication
      });

      eventSource.onopen = () => {
        info('[SSE Client] Connection established');
        reconnectAttemptsRef.current = 0;
        setConnectionState({
          connected: true,
          connecting: false,
          error: null,
          reconnectAttempts: 0,
          degraded: false,
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

          // Only in development: a busy gateway emits a `log:created` per
          // request, which in production would be a console line per request.
          if (process.env.NODE_ENV === 'development') {
            info('[SSE Client] Received event:', data.type);
          }

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

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;

        const currentAttempts = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = currentAttempts;
        const givingUp = currentAttempts >= maxReconnectAttempts;

        setConnectionState({
          connected: false,
          connecting: false,
          error: new Error('SSE connection failed'),
          reconnectAttempts: currentAttempts,
          degraded: givingUp,
        });

        // Attempt to reconnect if under max attempts
        if (!givingUp) {
          info(
            `[SSE Client] Reconnecting in ${reconnectDelay}ms (attempt ${currentAttempts}/${maxReconnectAttempts})`,
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          // Not an error worth shouting about: the endpoint answers 501 on
          // runtimes that cannot hold a stream open, and the caller polls.
          info(
            '[SSE Client] Giving up on the event stream; falling back to polling',
          );
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
  }, [url, maxReconnectAttempts, reconnectDelay]);

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
      degraded: false,
    });

    info('[SSE Client] Disconnected');
  }, []);

  /**
   * Check for stale connection (no ping received within interval)
   */
  useEffect(() => {
    if (!connectionState.connected) {
      return;
    }

    const checkInterval = setInterval(() => {
      const timeSinceLastPing = Date.now() - lastPingRef.current;
      if (timeSinceLastPing > pingInterval * 2) {
        console.warn('[SSE Client] Connection appears stale, reconnecting...');
        // Reconnecting counts as a fresh start, not as a failed attempt.
        reconnectAttemptsRef.current = 0;
        disconnect();
        connect();
      }
    }, pingInterval);

    return () => clearInterval(checkInterval);
  }, [connectionState.connected, pingInterval, connect, disconnect]);

  /**
   * Auto-connect on mount, disconnect on unmount
   */
  useEffect(() => {
    if (!enabled) {
      return;
    }

    reconnectAttemptsRef.current = 0;
    connect();

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connectionState,
    subscribe,
    connect,
    disconnect,
  };
}
