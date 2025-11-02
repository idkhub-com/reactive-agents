import { sseEventManager } from '@server/utils/sse-event-manager';
import type { SSEEventData } from '@shared/types/sse';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('SSE Event Manager', () => {
  // Mock stream writer
  const createMockStream = () => ({
    write: vi.fn().mockResolvedValue(undefined),
  });

  beforeEach(() => {
    // Clear all clients before each test
    // biome-ignore lint/suspicious/noExplicitAny: Accessing private property for testing
    const clients = (sseEventManager as any).clients;
    clients.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addClient', () => {
    it('should add a client to the manager', () => {
      const stream = createMockStream();
      const clientId = 'test-client-1';
      const userId = 'user-1';

      sseEventManager.addClient(clientId, stream, userId);

      expect(sseEventManager.getClientCount()).toBe(1);
    });

    it('should track multiple clients', () => {
      const stream1 = createMockStream();
      const stream2 = createMockStream();

      sseEventManager.addClient('client-1', stream1, 'user-1');
      sseEventManager.addClient('client-2', stream2, 'user-2');

      expect(sseEventManager.getClientCount()).toBe(2);
    });
  });

  describe('removeClient', () => {
    it('should remove a client from the manager', () => {
      const stream = createMockStream();
      const clientId = 'test-client-1';

      sseEventManager.addClient(clientId, stream, 'user-1');
      expect(sseEventManager.getClientCount()).toBe(1);

      sseEventManager.removeClient(clientId);
      expect(sseEventManager.getClientCount()).toBe(0);
    });

    it('should handle removing non-existent client', () => {
      expect(() => {
        sseEventManager.removeClient('non-existent');
      }).not.toThrow();
    });
  });

  describe('broadcast', () => {
    it('should broadcast event to all connected clients', async () => {
      const stream1 = createMockStream();
      const stream2 = createMockStream();

      sseEventManager.addClient('client-1', stream1, 'user-1');
      sseEventManager.addClient('client-2', stream2, 'user-2');

      const event: SSEEventData = {
        type: 'agent:created',
        timestamp: Date.now(),
        data: { agentId: 'test-agent' },
      };

      await sseEventManager.broadcast(event);

      expect(stream1.write).toHaveBeenCalledTimes(1);
      expect(stream2.write).toHaveBeenCalledTimes(1);

      const call1 = stream1.write.mock.calls[0][0] as string;
      expect(call1).toContain('event: message');
      expect(call1).toContain('agent:created');
    });

    it('should remove failed clients during broadcast', async () => {
      const workingStream = createMockStream();
      const failingStream = {
        write: vi.fn().mockRejectedValue(new Error('Write failed')),
      };

      sseEventManager.addClient('working-client', workingStream, 'user-1');
      sseEventManager.addClient('failing-client', failingStream, 'user-2');

      expect(sseEventManager.getClientCount()).toBe(2);

      const event: SSEEventData = {
        type: 'skill:updated',
        timestamp: Date.now(),
      };

      await sseEventManager.broadcast(event);

      // Failed client should be removed
      expect(sseEventManager.getClientCount()).toBe(1);
    });

    it('should format SSE message correctly', async () => {
      const stream = createMockStream();
      sseEventManager.addClient('client-1', stream, 'user-1');

      const event: SSEEventData = {
        type: 'model:created',
        timestamp: 12345678,
        data: { modelId: 'model-123' },
      };

      await sseEventManager.broadcast(event);

      const message = stream.write.mock.calls[0][0] as string;
      expect(message).toMatch(/^event: message\ndata: .*\n\n$/);

      // Extract and parse the data
      const dataMatch = message.match(/data: (.*)\n/);
      expect(dataMatch).not.toBeNull();
      const parsedData = JSON.parse(dataMatch![1]);

      expect(parsedData).toEqual(event);
    });
  });

  describe('broadcastToUser', () => {
    it('should broadcast only to specific user clients', async () => {
      const user1Stream1 = createMockStream();
      const user1Stream2 = createMockStream();
      const user2Stream = createMockStream();

      sseEventManager.addClient('user1-client1', user1Stream1, 'user-1');
      sseEventManager.addClient('user1-client2', user1Stream2, 'user-1');
      sseEventManager.addClient('user2-client1', user2Stream, 'user-2');

      const event: SSEEventData = {
        type: 'log:created',
        timestamp: Date.now(),
        data: { logId: 'log-123' },
      };

      await sseEventManager.broadcastToUser('user-1', event);

      expect(user1Stream1.write).toHaveBeenCalledTimes(1);
      expect(user1Stream2.write).toHaveBeenCalledTimes(1);
      expect(user2Stream.write).not.toHaveBeenCalled();
    });

    it('should handle broadcasting to user with no clients', async () => {
      const stream = createMockStream();
      sseEventManager.addClient('client-1', stream, 'user-1');

      const event: SSEEventData = {
        type: 'agent:deleted',
        timestamp: Date.now(),
      };

      await expect(
        sseEventManager.broadcastToUser('user-2', event),
      ).resolves.not.toThrow();

      expect(stream.write).not.toHaveBeenCalled();
    });
  });

  describe('getUserClients', () => {
    it('should return all client IDs for a user', () => {
      const stream1 = createMockStream();
      const stream2 = createMockStream();
      const stream3 = createMockStream();

      sseEventManager.addClient('user1-client1', stream1, 'user-1');
      sseEventManager.addClient('user1-client2', stream2, 'user-1');
      sseEventManager.addClient('user2-client1', stream3, 'user-2');

      const user1Clients = sseEventManager.getUserClients('user-1');

      expect(user1Clients).toHaveLength(2);
      expect(user1Clients).toContain('user1-client1');
      expect(user1Clients).toContain('user1-client2');
    });

    it('should return empty array for user with no clients', () => {
      const clients = sseEventManager.getUserClients('non-existent-user');
      expect(clients).toEqual([]);
    });
  });

  describe('getClientCount', () => {
    it('should return correct count of active clients', () => {
      expect(sseEventManager.getClientCount()).toBe(0);

      const stream1 = createMockStream();
      sseEventManager.addClient('client-1', stream1, 'user-1');
      expect(sseEventManager.getClientCount()).toBe(1);

      const stream2 = createMockStream();
      sseEventManager.addClient('client-2', stream2, 'user-2');
      expect(sseEventManager.getClientCount()).toBe(2);

      sseEventManager.removeClient('client-1');
      expect(sseEventManager.getClientCount()).toBe(1);
    });
  });
});
