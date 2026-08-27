import type { Skill } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API module
vi.mock('@web/api/v1/super-agents/skills', () => ({
  getSkillModels: vi.fn(),
  getSkillEvaluations: vi.fn(),
}));

// Import after mocking
import {
  getSkillEvaluations,
  getSkillModels,
} from '@web/api/v1/super-agents/skills';
import { useSkillValidation } from '@web/hooks/use-skill-validation';

const mockGetSkillModels = vi.mocked(getSkillModels);
const mockGetSkillEvaluations = vi.mocked(getSkillEvaluations);

describe('useSkillValidation', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const createMockSkill = (overrides: Partial<Skill> = {}): Skill => ({
    id: 'skill-123',
    agent_id: 'agent-123',
    name: 'Test Skill',
    description: 'A test skill',
    metadata: {},
    optimize: false,
    configuration_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    clustering_interval: 0,
    reflection_min_requests_per_arm: 0,
    exploration_temperature: 1.0,
    last_clustering_at: null,
    last_clustering_log_start_time: null,
    evaluations_regenerated_at: null,
    evaluation_lock_acquired_at: null,
    total_requests: 0,
    allowed_template_variables: [],
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
  });

  it('returns loading state initially', () => {
    mockGetSkillModels.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves - simulates loading state
        }),
    );
    mockGetSkillEvaluations.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves - simulates loading state
        }),
    );

    const { result } = renderHook(() => useSkillValidation(createMockSkill()), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns ready state when skill has models (no optimization)', async () => {
    mockGetSkillModels.mockResolvedValueOnce([
      { id: 'model-1', name: 'GPT-4' },
    ] as never);
    mockGetSkillEvaluations.mockResolvedValueOnce([]);

    const { result } = renderHook(
      () => useSkillValidation(createMockSkill({ optimize: false })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.modelsCount).toBe(1);
    expect(result.current.evaluationsCount).toBe(0);
    expect(result.current.missingRequirements).toEqual([]);
  });

  it('returns not ready when skill has no models', async () => {
    mockGetSkillModels.mockResolvedValueOnce([]);
    mockGetSkillEvaluations.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useSkillValidation(createMockSkill()), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.modelsCount).toBe(0);
    expect(result.current.missingRequirements).toContain(
      'At least one model must be configured',
    );
  });

  it('requires evaluations when optimization is enabled', async () => {
    mockGetSkillModels.mockResolvedValueOnce([
      { id: 'model-1', name: 'GPT-4' },
    ] as never);
    mockGetSkillEvaluations.mockResolvedValueOnce([]);

    const { result } = renderHook(
      () => useSkillValidation(createMockSkill({ optimize: true })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.missingRequirements).toContain(
      'At least one evaluation must be configured',
    );
  });

  it('returns ready when optimization is enabled with models and evaluations', async () => {
    mockGetSkillModels.mockResolvedValueOnce([
      { id: 'model-1', name: 'GPT-4' },
    ] as never);
    mockGetSkillEvaluations.mockResolvedValueOnce([
      { id: 'eval-1', name: 'Quality Check' },
    ] as never);

    const { result } = renderHook(
      () => useSkillValidation(createMockSkill({ optimize: true })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.modelsCount).toBe(1);
    expect(result.current.evaluationsCount).toBe(1);
    expect(result.current.missingRequirements).toEqual([]);
  });

  it('handles null skill', () => {
    const { result } = renderHook(() => useSkillValidation(null), {
      wrapper: createWrapper(),
    });

    expect(mockGetSkillModels).not.toHaveBeenCalled();
    expect(mockGetSkillEvaluations).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(result.current.modelsCount).toBe(0);
    expect(result.current.evaluationsCount).toBe(0);
  });

  it('handles undefined skill', () => {
    const { result } = renderHook(() => useSkillValidation(undefined), {
      wrapper: createWrapper(),
    });

    expect(mockGetSkillModels).not.toHaveBeenCalled();
    expect(mockGetSkillEvaluations).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(false);
  });

  it('calls APIs with correct skill_id', async () => {
    mockGetSkillModels.mockResolvedValueOnce([]);
    mockGetSkillEvaluations.mockResolvedValueOnce([]);

    renderHook(() => useSkillValidation(createMockSkill({ id: 'skill-xyz' })), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGetSkillModels).toHaveBeenCalledWith('skill-xyz');
      expect(mockGetSkillEvaluations).toHaveBeenCalledWith('skill-xyz');
    });
  });

  it('shows multiple missing requirements when both are missing', async () => {
    mockGetSkillModels.mockResolvedValueOnce([]);
    mockGetSkillEvaluations.mockResolvedValueOnce([]);

    const { result } = renderHook(
      () => useSkillValidation(createMockSkill({ optimize: true })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.missingRequirements).toHaveLength(2);
    expect(result.current.missingRequirements).toContain(
      'At least one model must be configured',
    );
    expect(result.current.missingRequirements).toContain(
      'At least one evaluation must be configured',
    );
  });

  it('counts multiple models and evaluations correctly', async () => {
    mockGetSkillModels.mockResolvedValueOnce([
      { id: 'model-1' },
      { id: 'model-2' },
      { id: 'model-3' },
    ] as never);
    mockGetSkillEvaluations.mockResolvedValueOnce([
      { id: 'eval-1' },
      { id: 'eval-2' },
    ] as never);

    const { result } = renderHook(
      () => useSkillValidation(createMockSkill({ optimize: true })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.modelsCount).toBe(3);
    expect(result.current.evaluationsCount).toBe(2);
    expect(result.current.isReady).toBe(true);
  });

  it('shows loading while either query is pending', () => {
    // Models resolve immediately, evaluations never resolve
    mockGetSkillModels.mockResolvedValueOnce([{ id: 'model-1' }] as never);
    mockGetSkillEvaluations.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves - simulates loading state
        }),
    );

    const { result } = renderHook(() => useSkillValidation(createMockSkill()), {
      wrapper: createWrapper(),
    });

    // Should remain loading until both queries complete
    expect(result.current.isLoading).toBe(true);
  });

  it('does not require evaluations when optimization is disabled', async () => {
    mockGetSkillModels.mockResolvedValueOnce([{ id: 'model-1' }] as never);
    mockGetSkillEvaluations.mockResolvedValueOnce([]);

    const { result } = renderHook(
      () => useSkillValidation(createMockSkill({ optimize: false })),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.missingRequirements).not.toContain(
      'At least one evaluation must be configured',
    );
  });
});
