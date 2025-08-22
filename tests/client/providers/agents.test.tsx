import { AgentsProvider, useAgents } from '@client/providers/agents';
import type { Agent } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API module
vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}));

import { getAgents } from '@client/api/v1/idk/agents';

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Agent 1',
    description: 'Test agent 1',
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Agent 2',
    description: 'Test agent 2',
    metadata: {},
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

describe('AgentsProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AgentsProvider>{children}</AgentsProvider>
    </QueryClientProvider>
  );

  it('should fetch agents', async () => {
    vi.mocked(getAgents).mockResolvedValue(mockAgents);

    const { result } = renderHook(() => useAgents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.agents).toEqual(mockAgents);
    expect(getAgents).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
    });
  });

  it('should fetch with custom limit', async () => {
    const firstPage = [mockAgents[0]];
    vi.mocked(getAgents).mockResolvedValue(firstPage);

    const { result } = renderHook(() => useAgents(), { wrapper });

    // Set custom limit
    act(() => {
      result.current.setQueryParams({ limit: 1 });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.agents).toEqual(firstPage);
    expect(result.current.hasNextPage).toBe(true);
    expect(getAgents).toHaveBeenCalledWith({
      limit: 1,
      offset: 0,
    });
  });

  it('should fetch next page', async () => {
    const firstPage = [mockAgents[0]];
    const secondPage = [mockAgents[1]];

    let callCount = 0;
    vi.mocked(getAgents).mockImplementation((params) => {
      callCount++;
      if (callCount === 1) {
        expect(params).toEqual({ limit: 20, offset: 0 });
        return Promise.resolve(mockAgents);
      } else if (callCount === 2) {
        expect(params).toEqual({ limit: 1, offset: 0 });
        return Promise.resolve(firstPage);
      } else if (callCount === 3) {
        expect(params).toEqual({ limit: 1, offset: 1 });
        return Promise.resolve(secondPage);
      }
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => useAgents(), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Set query params to trigger new query
    act(() => {
      result.current.setQueryParams({ limit: 1 });
    });

    // Wait for the query with new params to complete
    await waitFor(() => {
      expect(result.current.agents).toEqual(firstPage);
    });

    // Fetch next page
    act(() => {
      result.current.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.isFetchingNextPage).toBe(false);
      expect(result.current.agents).toEqual(mockAgents);
    });

    expect(getAgents).toHaveBeenCalledTimes(3);
  });

  it('should handle pagination with no more pages', async () => {
    const lastPage: Agent[] = [];
    vi.mocked(getAgents).mockResolvedValue(lastPage);

    const { result } = renderHook(() => useAgents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.agents).toEqual([]);
    expect(result.current.hasNextPage).toBe(false);
  });
});
