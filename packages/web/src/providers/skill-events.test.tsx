import {
  type SkillEvent,
  SkillEventType,
} from '@shared/types/data/skill-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API module - use loose typing for mock to avoid JSONValue compatibility issues
vi.mock('@web/api/v1/super-agents/skill-events', () => ({
  getSkillEvents: vi.fn(),
}));

// Import after mocking
import { getSkillEvents } from '@web/api/v1/super-agents/skill-events';
import {
  SkillEventsProvider,
  useSkillEvents,
} from '@web/providers/skill-events';

// Use any for the mock to avoid type compatibility issues with Hono's JSONValue inference
// biome-ignore lint/suspicious/noExplicitAny: Mock type flexibility needed
const mockGetSkillEvents = getSkillEvents as any;

describe('SkillEventsProvider', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SkillEventsProvider>{children}</SkillEventsProvider>
      </QueryClientProvider>
    );
  };

  const createMockEvent = (
    overrides: Partial<SkillEvent> = {},
  ): SkillEvent => ({
    id: 'event-1',
    agent_id: 'agent-123',
    skill_id: 'skill-123',
    cluster_id: null,
    event_type: SkillEventType.REFLECTION,
    metadata: {} as Record<string, string>,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    mockGetSkillEvents.mockResolvedValue([]);
  });

  describe('useSkillEvents', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSkillEvents());
      }).toThrow('useSkillEvents must be used within a SkillEventsProvider');
    });

    it('provides initial state', () => {
      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.skillId).toBeNull();
      expect(result.current.clusterId).toBeNull();
      expect(result.current.eventType).toBeNull();
      expect(result.current.scope).toBe('all');
      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(20);
    });

    it('fetches events when skillId is set', async () => {
      const mockEvents = [createMockEvent()];
      mockGetSkillEvents.mockResolvedValueOnce(mockEvents);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
      });

      expect(mockGetSkillEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          skill_id: 'skill-123',
        }),
      );
    });

    it('fetches events when clusterId is set', async () => {
      const mockEvents = [createMockEvent({ cluster_id: 'cluster-456' })];
      mockGetSkillEvents.mockResolvedValueOnce(mockEvents);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setClusterId('cluster-456');
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
      });

      expect(mockGetSkillEvents).toHaveBeenCalledWith(
        expect.objectContaining({
          cluster_id: 'cluster-456',
        }),
      );
    });

    it('filters events by scope - skill-wide', async () => {
      const mockEvents = [
        createMockEvent({ id: 'event-1', cluster_id: null }),
        createMockEvent({ id: 'event-2', cluster_id: 'cluster-123' }),
        createMockEvent({ id: 'event-3', cluster_id: null }),
      ];
      mockGetSkillEvents.mockResolvedValueOnce(mockEvents);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
        result.current.setScope('skill-wide');
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });

      expect(result.current.events.every((e) => e.cluster_id === null)).toBe(
        true,
      );
    });

    it('filters events by scope - cluster-specific', async () => {
      const mockEvents = [
        createMockEvent({ id: 'event-1', cluster_id: null }),
        createMockEvent({ id: 'event-2', cluster_id: 'cluster-123' }),
        createMockEvent({ id: 'event-3', cluster_id: 'cluster-456' }),
      ];
      mockGetSkillEvents.mockResolvedValueOnce(mockEvents);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
        result.current.setScope('cluster-specific');
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(2);
      });

      expect(result.current.events.every((e) => e.cluster_id !== null)).toBe(
        true,
      );
    });

    it('sets event type filter', async () => {
      mockGetSkillEvents.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
        result.current.setEventType(SkillEventType.REFLECTION);
      });

      await waitFor(() => {
        expect(mockGetSkillEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            event_type: SkillEventType.REFLECTION,
          }),
        );
      });
    });

    it('handles pagination correctly', async () => {
      mockGetSkillEvents.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
        result.current.setPage(2);
        result.current.setPageSize(10);
      });

      await waitFor(() => {
        expect(mockGetSkillEvents).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 10,
            offset: 10, // (page - 1) * pageSize = (2 - 1) * 10 = 10
          }),
        );
      });
    });

    it('calculates hasMore correctly', async () => {
      // When we get exactly pageSize results, hasMore should be true
      const fullPageEvents = Array(20)
        .fill(null)
        .map((_, i) => createMockEvent({ id: `event-${i}` }));
      mockGetSkillEvents.mockResolvedValueOnce(fullPageEvents);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(20);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('clearFilters resets filter state', () => {
      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setEventType(SkillEventType.REFLECTION);
        result.current.setScope('cluster-specific');
        result.current.setPage(5);
      });

      expect(result.current.eventType).toBe(SkillEventType.REFLECTION);
      expect(result.current.scope).toBe('cluster-specific');
      expect(result.current.page).toBe(5);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.eventType).toBeNull();
      expect(result.current.scope).toBe('all');
      expect(result.current.page).toBe(1);
    });

    it('getEventsByClusterId filters events correctly', async () => {
      const mockEvents = [
        createMockEvent({ id: 'event-1', cluster_id: 'cluster-A' }),
        createMockEvent({ id: 'event-2', cluster_id: 'cluster-B' }),
        createMockEvent({ id: 'event-3', cluster_id: 'cluster-A' }),
      ];
      mockGetSkillEvents.mockResolvedValueOnce(mockEvents);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      const clusterAEvents = result.current.getEventsByClusterId('cluster-A');
      expect(clusterAEvents).toHaveLength(2);
      expect(clusterAEvents.every((e) => e.cluster_id === 'cluster-A')).toBe(
        true,
      );
    });

    it('getEventsBySkillId filters events correctly', async () => {
      const mockEvents = [
        createMockEvent({ id: 'event-1', skill_id: 'skill-X' }),
        createMockEvent({ id: 'event-2', skill_id: 'skill-Y' }),
        createMockEvent({ id: 'event-3', skill_id: 'skill-X' }),
      ];
      mockGetSkillEvents.mockResolvedValueOnce(mockEvents);

      const { result } = renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(3);
      });

      const skillXEvents = result.current.getEventsBySkillId('skill-X');
      expect(skillXEvents).toHaveLength(2);
      expect(skillXEvents.every((e) => e.skill_id === 'skill-X')).toBe(true);
    });

    it('does not fetch when no skillId or clusterId is set', () => {
      renderHook(() => useSkillEvents(), {
        wrapper: createWrapper(),
      });

      expect(mockGetSkillEvents).not.toHaveBeenCalled();
    });
  });
});
