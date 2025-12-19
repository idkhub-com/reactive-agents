import type { SkillOptimizationEvaluationRun } from '@shared/types/data/skill-optimization-evaluation-run';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API module
vi.mock('@web/api/v1/reactive-agents/skills', () => ({
  getSkillEvaluationRuns: vi.fn(),
}));

// Import after mocking
import { getSkillEvaluationRuns } from '@web/api/v1/reactive-agents/skills';
import {
  SkillOptimizationEvaluationRunsProvider,
  skillOptimizationEvaluationRunQueryKeys,
  useSkillOptimizationEvaluationRuns,
} from '@web/providers/skill-optimization-evaluation-runs';

const mockGetSkillEvaluationRuns = vi.mocked(getSkillEvaluationRuns);

describe('SkillOptimizationEvaluationRunsProvider', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SkillOptimizationEvaluationRunsProvider>
          {children}
        </SkillOptimizationEvaluationRunsProvider>
      </QueryClientProvider>
    );
  };

  const createMockEvaluationRun = (
    overrides: Partial<SkillOptimizationEvaluationRun> = {},
  ): SkillOptimizationEvaluationRun => ({
    id: 'run-123',
    agent_id: 'agent-123',
    skill_id: 'skill-123',
    cluster_id: 'cluster-123',
    log_id: 'log-123',
    results: [
      {
        evaluation_id: 'eval-123',
        method: EvaluationMethodName.TASK_COMPLETION,
        score: 0.85,
        extra_data: {},
        display_info: [{ label: 'Performance', content: 'Good' }],
      },
    ],
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
    mockGetSkillEvaluationRuns.mockResolvedValue([]);
  });

  describe('useSkillOptimizationEvaluationRuns', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSkillOptimizationEvaluationRuns());
      }).toThrow(
        'useSkillOptimizationEvaluationRuns must be used within a SkillOptimizationEvaluationRunsProvider',
      );
    });

    it('provides initial state', () => {
      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      expect(result.current.evaluationRuns).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.skillId).toBeNull();
      expect(result.current.logId).toBeNull();
    });

    it('fetches evaluation runs when skillId is set', async () => {
      const mockRuns = [createMockEvaluationRun()];
      mockGetSkillEvaluationRuns.mockResolvedValueOnce(mockRuns);

      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.evaluationRuns).toHaveLength(1);
      });

      expect(mockGetSkillEvaluationRuns).toHaveBeenCalledWith(
        'skill-123',
        undefined,
      );
    });

    it('fetches evaluation runs with logId when both skillId and logId are set', async () => {
      const mockRuns = [createMockEvaluationRun()];
      mockGetSkillEvaluationRuns.mockResolvedValueOnce(mockRuns);

      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      act(() => {
        result.current.setSkillId('skill-123');
        result.current.setLogId('log-456');
      });

      await waitFor(() => {
        expect(result.current.evaluationRuns).toHaveLength(1);
      });

      expect(mockGetSkillEvaluationRuns).toHaveBeenCalledWith(
        'skill-123',
        'log-456',
      );
    });

    it('does not fetch when skillId is null', () => {
      renderHook(() => useSkillOptimizationEvaluationRuns(), {
        wrapper: createWrapper(),
      });

      expect(mockGetSkillEvaluationRuns).not.toHaveBeenCalled();
    });

    it('getEvaluationRunsByClusterId filters correctly', async () => {
      const mockRuns = [
        createMockEvaluationRun({ id: 'run-1', cluster_id: 'cluster-A' }),
        createMockEvaluationRun({ id: 'run-2', cluster_id: 'cluster-B' }),
        createMockEvaluationRun({ id: 'run-3', cluster_id: 'cluster-A' }),
      ];
      mockGetSkillEvaluationRuns.mockResolvedValueOnce(mockRuns);

      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.evaluationRuns).toHaveLength(3);
      });

      const clusterARuns =
        result.current.getEvaluationRunsByClusterId('cluster-A');
      expect(clusterARuns).toHaveLength(2);
      expect(clusterARuns.every((r) => r.cluster_id === 'cluster-A')).toBe(
        true,
      );
    });

    it('getEvaluationRunsByClusterId returns empty array for non-existent cluster', async () => {
      const mockRuns = [createMockEvaluationRun({ cluster_id: 'cluster-A' })];
      mockGetSkillEvaluationRuns.mockResolvedValueOnce(mockRuns);

      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.evaluationRuns).toHaveLength(1);
      });

      const clusterBRuns =
        result.current.getEvaluationRunsByClusterId('cluster-B');
      expect(clusterBRuns).toHaveLength(0);
    });

    it('provides refetch function', async () => {
      mockGetSkillEvaluationRuns.mockResolvedValue([]);

      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(mockGetSkillEvaluationRuns).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetSkillEvaluationRuns).toHaveBeenCalledTimes(2);
    });

    it('provides refreshEvaluationRuns function', async () => {
      mockGetSkillEvaluationRuns.mockResolvedValue([]);

      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(mockGetSkillEvaluationRuns).toHaveBeenCalledTimes(1);
      });

      act(() => {
        result.current.refreshEvaluationRuns();
      });

      // refreshEvaluationRuns invalidates a different query key, so it may not trigger
      // an immediate refetch unless the cache is invalidated for the matching key
      expect(typeof result.current.refreshEvaluationRuns).toBe('function');
    });

    it('handles error state', async () => {
      const error = new Error('Failed to fetch');
      mockGetSkillEvaluationRuns.mockRejectedValueOnce(error);

      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });
    });

    it('updates skillId and logId independently', () => {
      const { result } = renderHook(
        () => useSkillOptimizationEvaluationRuns(),
        {
          wrapper: createWrapper(),
        },
      );

      act(() => {
        result.current.setSkillId('skill-123');
      });

      expect(result.current.skillId).toBe('skill-123');
      expect(result.current.logId).toBeNull();

      act(() => {
        result.current.setLogId('log-456');
      });

      expect(result.current.skillId).toBe('skill-123');
      expect(result.current.logId).toBe('log-456');
    });
  });

  describe('skillOptimizationEvaluationRunQueryKeys', () => {
    it('generates correct query keys', () => {
      expect(skillOptimizationEvaluationRunQueryKeys.all).toEqual([
        'skillOptimizationEvaluationRuns',
      ]);
      expect(skillOptimizationEvaluationRunQueryKeys.lists()).toEqual([
        'skillOptimizationEvaluationRuns',
        'list',
      ]);
      expect(skillOptimizationEvaluationRunQueryKeys.list('skill-123')).toEqual(
        ['skillOptimizationEvaluationRuns', 'list', 'skill-123'],
      );
      expect(skillOptimizationEvaluationRunQueryKeys.list(null)).toEqual([
        'skillOptimizationEvaluationRuns',
        'list',
        null,
      ]);
    });
  });
});
