import * as skillsApi from '@client/api/v1/reactive-agents/skills';
import {
  SkillOptimizationEvaluationsProvider,
  useSkillOptimizationEvaluations,
} from '@client/providers/skill-optimization-evaluations';
import type { SkillOptimizationEvaluation } from '@shared/types/data';
import { EvaluationMethodName } from '@shared/types/evaluations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API module
vi.mock('@client/api/v1/reactive-agents/skills');

describe('SkillOptimizationEvaluationsProvider', () => {
  let queryClient: QueryClient;

  const mockEvaluations: SkillOptimizationEvaluation[] = [
    {
      id: 'eval-1',
      agent_id: 'agent-1',
      skill_id: 'skill-1',
      evaluation_method: EvaluationMethodName.TASK_COMPLETION,
      params: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'eval-2',
      agent_id: 'agent-1',
      skill_id: 'skill-1',
      evaluation_method: EvaluationMethodName.ARGUMENT_CORRECTNESS,
      params: {},
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SkillOptimizationEvaluationsProvider>
        {children}
      </SkillOptimizationEvaluationsProvider>
    </QueryClientProvider>
  );

  describe('Provider Setup', () => {
    it('should initialize with empty evaluations', () => {
      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      expect(result.current.evaluations).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCreating).toBe(false);
      expect(result.current.isDeleting).toBe(false);
    });

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useSkillOptimizationEvaluations());
      }).toThrow(
        'useSkillOptimizationEvaluations must be used within a SkillOptimizationEvaluationsProvider',
      );
    });
  });

  describe('Fetching evaluations', () => {
    it('should fetch evaluations when skill ID is set', async () => {
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue(
        mockEvaluations,
      );

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(skillsApi.getSkillEvaluations).toHaveBeenCalledWith('skill-1');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.evaluations).toEqual(mockEvaluations);
      });
    });

    it('should not fetch evaluations when skill ID is null', async () => {
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue(
        mockEvaluations,
      );

      renderHook(() => useSkillOptimizationEvaluations(), { wrapper });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(skillsApi.getSkillEvaluations).not.toHaveBeenCalled();
    });

    it('should handle loading state correctly', async () => {
      let resolvePromise: (value: SkillOptimizationEvaluation[]) => void;
      const promise = new Promise<SkillOptimizationEvaluation[]>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(skillsApi.getSkillEvaluations).mockReturnValue(promise);

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      resolvePromise!(mockEvaluations);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.evaluations).toEqual(mockEvaluations);
      });
    });

    it('should clear evaluations when skill ID is set to null', async () => {
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue(
        mockEvaluations,
      );

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      // First set a skill ID
      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.evaluations).toEqual(mockEvaluations);
      });

      // Then clear it
      result.current.setSkillId(null);

      await waitFor(() => {
        expect(result.current.evaluations).toEqual([]);
      });
    });
  });

  describe('Creating evaluations', () => {
    it('should create evaluation successfully', async () => {
      const createdEvaluations: SkillOptimizationEvaluation[] = [
        mockEvaluations[0],
      ];

      vi.mocked(skillsApi.createSkillEvaluation).mockResolvedValue(
        createdEvaluations,
      );
      vi.mocked(skillsApi.getSkillEvaluations)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(createdEvaluations);

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const createdResult = await result.current.createEvaluation('skill-1', [
        EvaluationMethodName.TASK_COMPLETION,
      ]);

      expect(skillsApi.createSkillEvaluation).toHaveBeenCalledWith('skill-1', [
        EvaluationMethodName.TASK_COMPLETION,
      ]);
      expect(createdResult).toEqual(createdEvaluations);
    });

    it('should handle creating state correctly', async () => {
      let resolvePromise: (value: SkillOptimizationEvaluation[]) => void =
        () => {
          // Intentionally empty - will be assigned in promise constructor
        };
      const promise = new Promise<SkillOptimizationEvaluation[]>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(skillsApi.createSkillEvaluation).mockReturnValue(promise);
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue([]);

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start creating
      const createPromise = result.current.createEvaluation('skill-1', [
        EvaluationMethodName.TASK_COMPLETION,
      ]);

      await waitFor(() => {
        expect(result.current.isCreating).toBe(true);
      });

      // Resolve the creation
      resolvePromise(mockEvaluations);
      await createPromise;

      await waitFor(() => {
        expect(result.current.isCreating).toBe(false);
      });
    });

    it('should invalidate queries after successful creation', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(skillsApi.createSkillEvaluation).mockResolvedValue(
        mockEvaluations,
      );
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue([]);

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.createEvaluation('skill-1', [
        EvaluationMethodName.TASK_COMPLETION,
      ]);

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['evaluations', 'skill', 'skill-1'],
        });
      });
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create evaluation');
      vi.mocked(skillsApi.createSkillEvaluation).mockRejectedValue(error);
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue([]);

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.createEvaluation('skill-1', [
          EvaluationMethodName.TASK_COMPLETION,
        ]),
      ).rejects.toThrow('Failed to create evaluation');
    });
  });

  describe('Deleting evaluations', () => {
    it('should delete evaluation successfully', async () => {
      vi.mocked(skillsApi.deleteSkillEvaluation).mockResolvedValue(undefined);
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue(
        mockEvaluations,
      );

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.deleteEvaluation('skill-1', 'eval-1');

      expect(skillsApi.deleteSkillEvaluation).toHaveBeenCalledWith(
        'skill-1',
        'eval-1',
      );
    });

    it('should handle deleting state correctly', async () => {
      let resolvePromise: () => void = () => {
        // Intentionally empty - will be assigned in promise constructor
      };
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(skillsApi.deleteSkillEvaluation).mockReturnValue(promise);
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue(
        mockEvaluations,
      );

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start deleting
      const deletePromise = result.current.deleteEvaluation(
        'skill-1',
        'eval-1',
      );

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      // Resolve the deletion
      resolvePromise();
      await deletePromise;

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });

    it('should invalidate queries after successful deletion', async () => {
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(skillsApi.deleteSkillEvaluation).mockResolvedValue(undefined);
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue(
        mockEvaluations,
      );

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.deleteEvaluation('skill-1', 'eval-1');

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: ['evaluations', 'skill', 'skill-1'],
        });
      });
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Failed to delete evaluation');
      vi.mocked(skillsApi.deleteSkillEvaluation).mockRejectedValue(error);
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue(
        mockEvaluations,
      );

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        result.current.deleteEvaluation('skill-1', 'eval-1'),
      ).rejects.toThrow('Failed to delete evaluation');
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid skill ID changes', async () => {
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue(
        mockEvaluations,
      );

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      // Rapidly change skill ID
      result.current.setSkillId('skill-1');
      result.current.setSkillId('skill-2');
      result.current.setSkillId('skill-3');

      await waitFor(() => {
        expect(skillsApi.getSkillEvaluations).toHaveBeenLastCalledWith(
          'skill-3',
        );
      });
    });

    it('should support multiple evaluation methods in creation', async () => {
      const multiMethodEvaluations: SkillOptimizationEvaluation[] = [
        mockEvaluations[0],
        mockEvaluations[1],
      ];

      vi.mocked(skillsApi.createSkillEvaluation).mockResolvedValue(
        multiMethodEvaluations,
      );
      vi.mocked(skillsApi.getSkillEvaluations).mockResolvedValue([]);

      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      result.current.setSkillId('skill-1');

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const created = await result.current.createEvaluation('skill-1', [
        EvaluationMethodName.TASK_COMPLETION,
        EvaluationMethodName.ARGUMENT_CORRECTNESS,
      ]);

      expect(skillsApi.createSkillEvaluation).toHaveBeenCalledWith('skill-1', [
        EvaluationMethodName.TASK_COMPLETION,
        EvaluationMethodName.ARGUMENT_CORRECTNESS,
      ]);
      expect(created).toEqual(multiMethodEvaluations);
    });
  });

  describe('Context integration', () => {
    it('should provide all expected context values', () => {
      const { result } = renderHook(() => useSkillOptimizationEvaluations(), {
        wrapper,
      });

      expect(result.current).toHaveProperty('evaluations');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isCreating');
      expect(result.current).toHaveProperty('isDeleting');
      expect(result.current).toHaveProperty('setSkillId');
      expect(result.current).toHaveProperty('createEvaluation');
      expect(result.current).toHaveProperty('deleteEvaluation');
    });
  });
});
