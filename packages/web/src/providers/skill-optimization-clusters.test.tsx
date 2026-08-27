import type { SkillOptimizationCluster } from '@shared/types/data/skill-optimization-cluster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the navigation provider
vi.mock('@web/providers/navigation', () => ({
  useNavigation: vi.fn(() => ({
    navigationState: {
      selectedClusterName: null,
    },
  })),
}));

// Mock the API module
vi.mock('@web/api/v1/super-agents/skills', () => ({
  getSkillClusterStates: vi.fn(),
}));

// Import after mocking
import { getSkillClusterStates } from '@web/api/v1/super-agents/skills';
import { useNavigation } from '@web/providers/navigation';
import {
  clusterQueryKeys,
  SkillOptimizationClustersProvider,
  useSkillOptimizationClusters,
} from '@web/providers/skill-optimization-clusters';

const mockGetSkillClusters = vi.mocked(getSkillClusterStates);
const mockUseNavigation = vi.mocked(useNavigation);

describe('SkillOptimizationClustersProvider', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SkillOptimizationClustersProvider>
          {children}
        </SkillOptimizationClustersProvider>
      </QueryClientProvider>
    );
  };

  const createMockCluster = (
    overrides: Partial<SkillOptimizationCluster> = {},
  ): SkillOptimizationCluster => ({
    id: 'cluster-123',
    agent_id: 'agent-123',
    skill_id: 'skill-123',
    name: 'Test Cluster',
    total_steps: 100,
    observability_total_requests: 50,
    centroid: [0.1, 0.2, 0.3],
    embedding_model_id: null,
    reflection_lock_acquired_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
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
    mockUseNavigation.mockReturnValue({
      navigationState: {
        selectedClusterName: null,
      },
    } as unknown as ReturnType<typeof useNavigation>);
    mockGetSkillClusters.mockResolvedValue([]);
  });

  describe('useSkillOptimizationClusters', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSkillOptimizationClusters());
      }).toThrow('useClusters must be used within a ClustersProvider');
    });

    it('provides initial state', () => {
      const { result } = renderHook(() => useSkillOptimizationClusters(), {
        wrapper: createWrapper(),
      });

      expect(result.current.clusters).toEqual([]);
      expect(result.current.selectedCluster).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.skillId).toBeNull();
    });

    it('fetches clusters when skillId is set', async () => {
      const mockClusters = [createMockCluster()];
      mockGetSkillClusters.mockResolvedValueOnce(mockClusters);

      const { result } = renderHook(() => useSkillOptimizationClusters(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.clusters).toHaveLength(1);
      });

      expect(mockGetSkillClusters).toHaveBeenCalledWith('skill-123');
    });

    it('does not fetch when skillId is null', () => {
      renderHook(() => useSkillOptimizationClusters(), {
        wrapper: createWrapper(),
      });

      expect(mockGetSkillClusters).not.toHaveBeenCalled();
    });

    it('resolves selectedCluster from navigationState', async () => {
      const mockClusters = [
        createMockCluster({ id: 'cluster-1', name: 'Cluster One' }),
        createMockCluster({ id: 'cluster-2', name: 'Cluster Two' }),
      ];
      mockGetSkillClusters.mockResolvedValueOnce(mockClusters);
      mockUseNavigation.mockReturnValue({
        navigationState: {
          selectedClusterName: 'Cluster Two',
        },
      } as unknown as ReturnType<typeof useNavigation>);

      const { result } = renderHook(() => useSkillOptimizationClusters(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.selectedCluster).toBeDefined();
      });

      expect(result.current.selectedCluster?.id).toBe('cluster-2');
      expect(result.current.selectedCluster?.name).toBe('Cluster Two');
    });

    it('getClusterById returns correct cluster', async () => {
      const mockClusters = [
        createMockCluster({ id: 'cluster-1', name: 'First' }),
        createMockCluster({ id: 'cluster-2', name: 'Second' }),
        createMockCluster({ id: 'cluster-3', name: 'Third' }),
      ];
      mockGetSkillClusters.mockResolvedValueOnce(mockClusters);

      const { result } = renderHook(() => useSkillOptimizationClusters(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.clusters).toHaveLength(3);
      });

      const cluster = result.current.getClusterById('cluster-2');
      expect(cluster?.name).toBe('Second');
    });

    it('getClusterById returns undefined for non-existent id', async () => {
      const mockClusters = [createMockCluster({ id: 'cluster-1' })];
      mockGetSkillClusters.mockResolvedValueOnce(mockClusters);

      const { result } = renderHook(() => useSkillOptimizationClusters(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.clusters).toHaveLength(1);
      });

      const cluster = result.current.getClusterById('non-existent');
      expect(cluster).toBeUndefined();
    });

    it('provides refetch function', async () => {
      mockGetSkillClusters.mockResolvedValue([]);

      const { result } = renderHook(() => useSkillOptimizationClusters(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(mockGetSkillClusters).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetSkillClusters).toHaveBeenCalledTimes(2);
    });
  });

  describe('clusterQueryKeys', () => {
    it('generates correct query keys', () => {
      expect(clusterQueryKeys.all).toEqual(['skillOptimizationClusters']);
      expect(clusterQueryKeys.lists()).toEqual([
        'skillOptimizationClusters',
        'list',
      ]);
      expect(clusterQueryKeys.list('skill-123')).toEqual([
        'skillOptimizationClusters',
        'list',
        'skill-123',
      ]);
      expect(clusterQueryKeys.list(null)).toEqual([
        'skillOptimizationClusters',
        'list',
        null,
      ]);
    });
  });
});
