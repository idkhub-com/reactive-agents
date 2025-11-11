import type { SSEEventData, SSEEventType } from '@shared/types/sse';

/**
 * SSE Stream Writer
 * Interface for writing to SSE stream (compatible with Hono StreamingApi)
 */
interface SSEStreamWriter {
  write: (data: string) => Promise<unknown>;
}

/**
 * SSE Client Connection
 * Represents a single client connection for Server-Sent Events
 */
interface SSEClient {
  id: string;
  stream: SSEStreamWriter;
  userId: string;
  connectedAt: number;
}

/**
 * SSE Event Manager
 * Manages all active SSE connections and broadcasts events to clients
 * Implements singleton pattern for global event broadcasting
 */
class SSEEventManager {
  private clients: Map<string, SSEClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start ping interval to keep connections alive
    this.startPingInterval();
  }

  /**
   * Register a new SSE client connection
   */
  addClient(id: string, stream: SSEStreamWriter, userId: string): void {
    this.clients.set(id, {
      id,
      stream,
      userId,
      connectedAt: Date.now(),
    });
  }

  /**
   * Remove a client connection
   */
  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      // Stream cleanup is handled by Hono
      this.clients.delete(id);
    }
  }

  /**
   * Broadcast an event to all connected clients
   */
  async broadcast(event: SSEEventData): Promise<void> {
    const message = this.formatSSEMessage(event);
    const failedClients: string[] = [];

    // Send to all clients in parallel
    await Promise.all(
      Array.from(this.clients.entries()).map(async ([clientId, client]) => {
        try {
          await client.stream.write(message);
        } catch (error) {
          console.error(`[SSE] Failed to send to client ${clientId}:`, error);
          failedClients.push(clientId);
        }
      }),
    );

    // Clean up failed clients
    for (const clientId of failedClients) {
      this.removeClient(clientId);
    }
  }

  /**
   * Broadcast an event to a specific user's connections
   */
  async broadcastToUser(userId: string, event: SSEEventData): Promise<void> {
    const message = this.formatSSEMessage(event);
    const failedClients: string[] = [];

    // Send to user's clients in parallel
    await Promise.all(
      Array.from(this.clients.entries())
        .filter(([, client]) => client.userId === userId)
        .map(async ([clientId, client]) => {
          try {
            await client.stream.write(message);
          } catch (error) {
            console.error(`[SSE] Failed to send to client ${clientId}:`, error);
            failedClients.push(clientId);
          }
        }),
    );

    // Clean up failed clients
    for (const clientId of failedClients) {
      this.removeClient(clientId);
    }
  }

  /**
   * Format SSE message according to the SSE protocol
   */
  private formatSSEMessage(event: SSEEventData): string {
    const data = JSON.stringify(event);
    return `event: message\ndata: ${data}\n\n`;
  }

  /**
   * Send periodic ping to keep connections alive
   */
  private startPingInterval(): void {
    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      void this.broadcast({
        type: 'ping',
        timestamp: Date.now(),
      });
    }, 30 * 1000);
  }

  /**
   * Stop ping interval (for cleanup)
   */
  stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get number of active connections
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get client IDs for a specific user
   */
  getUserClients(userId: string): string[] {
    return Array.from(this.clients.values())
      .filter((client) => client.userId === userId)
      .map((client) => client.id);
  }
}

// Export singleton instance
export const sseEventManager = new SSEEventManager();

/**
 * Helper function to emit an event to all clients
 */
export function emitSSEEvent(
  type: SSEEventType,
  data?: Record<string, unknown>,
): void {
  void sseEventManager.broadcast({
    type,
    timestamp: Date.now(),
    data,
  });
}

/**
 * Helper function to emit an event to a specific user
 */
export function emitSSEEventToUser(
  userId: string,
  type: SSEEventType,
  data?: Record<string, unknown>,
): void {
  void sseEventManager.broadcastToUser(userId, {
    type,
    timestamp: Date.now(),
    data,
  });
}
