import type { SkillOptimizationArm } from '@shared/types/data/skill-optimization-arm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the navigation provider
vi.mock('@web/providers/navigation', () => ({
  useNavigation: vi.fn(() => ({
    navigationState: {
      selectedArmName: null,
    },
  })),
}));

// Mock the API module
vi.mock('@web/api/v1/super-agents/skills', () => ({
  getSkillArms: vi.fn(),
}));

// Import after mocking
import { getSkillArms } from '@web/api/v1/super-agents/skills';
import { useNavigation } from '@web/providers/navigation';
import {
  armQueryKeys,
  SkillOptimizationArmsProvider,
  useSkillOptimizationArms,
} from '@web/providers/skill-optimization-arms';

const mockGetSkillArms = vi.mocked(getSkillArms);
const mockUseNavigation = vi.mocked(useNavigation);

describe('SkillOptimizationArmsProvider', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SkillOptimizationArmsProvider>
          {children}
        </SkillOptimizationArmsProvider>
      </QueryClientProvider>
    );
  };

  const createMockArm = (
    overrides: Partial<SkillOptimizationArm> = {},
  ): SkillOptimizationArm => ({
    id: 'arm-123',
    agent_id: 'agent-123',
    skill_id: 'skill-123',
    cluster_id: 'cluster-123',
    name: 'Test Arm',
    params: {
      model_id: 'model-123',
      system_prompt: 'You are a helpful assistant.',
      temperature_min: 0,
      temperature_max: 1,
      top_p_min: 0,
      top_p_max: 1,
      top_k_min: 0,
      top_k_max: 1,
      frequency_penalty_min: 0,
      frequency_penalty_max: 1,
      presence_penalty_min: 0,
      presence_penalty_max: 1,
      thinking_min: 0,
      thinking_max: 1,
    },
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
        selectedArmName: null,
      },
    } as unknown as ReturnType<typeof useNavigation>);
    mockGetSkillArms.mockResolvedValue([]);
  });

  describe('useSkillOptimizationArms', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSkillOptimizationArms());
      }).toThrow('useArms must be used within an ArmsProvider');
    });

    it('provides initial state', () => {
      const { result } = renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      expect(result.current.arms).toEqual([]);
      expect(result.current.selectedArm).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.skillId).toBeNull();
      expect(result.current.clusterId).toBeNull();
    });

    it('fetches arms when skillId is set', async () => {
      const mockArms = [createMockArm()];
      mockGetSkillArms.mockResolvedValueOnce(mockArms);

      const { result } = renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.arms).toHaveLength(1);
      });

      expect(mockGetSkillArms).toHaveBeenCalledWith('skill-123');
    });

    it('does not fetch when skillId is null', () => {
      renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      expect(mockGetSkillArms).not.toHaveBeenCalled();
    });

    it('filters arms by clusterId', async () => {
      const mockArms = [
        createMockArm({ id: 'arm-1', cluster_id: 'cluster-A' }),
        createMockArm({ id: 'arm-2', cluster_id: 'cluster-B' }),
        createMockArm({ id: 'arm-3', cluster_id: 'cluster-A' }),
      ];
      mockGetSkillArms.mockResolvedValueOnce(mockArms);

      const { result } = renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
        result.current.setClusterId('cluster-A');
      });

      await waitFor(() => {
        expect(result.current.arms).toHaveLength(2);
      });

      expect(
        result.current.arms.every((a) => a.cluster_id === 'cluster-A'),
      ).toBe(true);
    });

    it('returns all arms when clusterId is null', async () => {
      const mockArms = [
        createMockArm({ id: 'arm-1', cluster_id: 'cluster-A' }),
        createMockArm({ id: 'arm-2', cluster_id: 'cluster-B' }),
      ];
      mockGetSkillArms.mockResolvedValueOnce(mockArms);

      const { result } = renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.arms).toHaveLength(2);
      });
    });

    it('resolves selectedArm from navigationState', async () => {
      const mockArms = [
        createMockArm({ id: 'arm-1', name: 'Arm One' }),
        createMockArm({ id: 'arm-2', name: 'Arm Two' }),
      ];
      mockGetSkillArms.mockResolvedValueOnce(mockArms);
      mockUseNavigation.mockReturnValue({
        navigationState: {
          selectedArmName: 'Arm Two',
        },
      } as unknown as ReturnType<typeof useNavigation>);

      const { result } = renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.selectedArm).toBeDefined();
      });

      expect(result.current.selectedArm?.id).toBe('arm-2');
      expect(result.current.selectedArm?.name).toBe('Arm Two');
    });

    it('getArmById returns correct arm', async () => {
      const mockArms = [
        createMockArm({ id: 'arm-1', name: 'First' }),
        createMockArm({ id: 'arm-2', name: 'Second' }),
        createMockArm({ id: 'arm-3', name: 'Third' }),
      ];
      mockGetSkillArms.mockResolvedValueOnce(mockArms);

      const { result } = renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.arms).toHaveLength(3);
      });

      const arm = result.current.getArmById('arm-2');
      expect(arm?.name).toBe('Second');
    });

    it('getArmById returns undefined for non-existent id', async () => {
      const mockArms = [createMockArm({ id: 'arm-1' })];
      mockGetSkillArms.mockResolvedValueOnce(mockArms);

      const { result } = renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(result.current.arms).toHaveLength(1);
      });

      const arm = result.current.getArmById('non-existent');
      expect(arm).toBeUndefined();
    });

    it('provides refetch function', async () => {
      mockGetSkillArms.mockResolvedValue([]);

      const { result } = renderHook(() => useSkillOptimizationArms(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setSkillId('skill-123');
      });

      await waitFor(() => {
        expect(mockGetSkillArms).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetSkillArms).toHaveBeenCalledTimes(2);
    });
  });

  describe('armQueryKeys', () => {
    it('generates correct query keys', () => {
      expect(armQueryKeys.all).toEqual(['skillOptimizationArms']);
      expect(armQueryKeys.lists()).toEqual(['skillOptimizationArms', 'list']);
      expect(armQueryKeys.list('skill-123', 'cluster-456')).toEqual([
        'skillOptimizationArms',
        'list',
        'skill-123',
        'cluster-456',
      ]);
      expect(armQueryKeys.list(null, null)).toEqual([
        'skillOptimizationArms',
        'list',
        null,
        null,
      ]);
    });
  });
});
