import type { Agent } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API module
vi.mock('@web/api/v1/reactive-agents/skills', () => ({
  getSkills: vi.fn(),
}));

// Import after mocking
import { getSkills } from '@web/api/v1/reactive-agents/skills';
import { useAgentValidation } from '@web/hooks/use-agent-validation';

const mockGetSkills = vi.mocked(getSkills);

describe('useAgentValidation', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockAgent: Agent = {
    id: 'agent-123',
    name: 'Test Agent',
    description: 'A test agent',
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

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
    mockGetSkills.mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves - simulates loading state
        }),
    );

    const { result } = renderHook(() => useAgentValidation(mockAgent), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.skillsCount).toBe(0);
  });

  it('returns ready state when agent has skills', async () => {
    mockGetSkills.mockResolvedValueOnce([
      {
        id: 'skill-1',
        agent_id: 'agent-123',
        name: 'Skill 1',
        description: 'Test skill',
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
      },
    ]);

    const { result } = renderHook(() => useAgentValidation(mockAgent), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.skillsCount).toBe(1);
    expect(result.current.missingRequirements).toEqual([]);
  });

  it('returns not ready state when agent has no skills', async () => {
    mockGetSkills.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAgentValidation(mockAgent), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.skillsCount).toBe(0);
    expect(result.current.missingRequirements).toContain(
      'At least one skill must be configured',
    );
  });

  it('handles null agent', () => {
    const { result } = renderHook(() => useAgentValidation(null), {
      wrapper: createWrapper(),
    });

    // Should not make API call and return default state
    expect(mockGetSkills).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(false);
    expect(result.current.skillsCount).toBe(0);
  });

  it('handles undefined agent', () => {
    const { result } = renderHook(() => useAgentValidation(undefined), {
      wrapper: createWrapper(),
    });

    expect(mockGetSkills).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isReady).toBe(false);
  });

  it('calls API with correct agent_id', async () => {
    mockGetSkills.mockResolvedValueOnce([]);

    renderHook(() => useAgentValidation(mockAgent), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGetSkills).toHaveBeenCalledWith({ agent_id: 'agent-123' });
    });
  });

  it('counts multiple skills correctly', async () => {
    mockGetSkills.mockResolvedValueOnce([
      {
        id: 'skill-1',
        agent_id: 'agent-123',
        name: 'Skill 1',
        description: '',
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
      },
      {
        id: 'skill-2',
        agent_id: 'agent-123',
        name: 'Skill 2',
        description: '',
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
      },
      {
        id: 'skill-3',
        agent_id: 'agent-123',
        name: 'Skill 3',
        description: '',
        metadata: {},
        optimize: true,
        configuration_count: 5,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        clustering_interval: 15,
        reflection_min_requests_per_arm: 3,
        exploration_temperature: 1.0,
        last_clustering_at: null,
        last_clustering_log_start_time: null,
        evaluations_regenerated_at: null,
        evaluation_lock_acquired_at: null,
        total_requests: 0,
        allowed_template_variables: [],
      },
    ]);

    const { result } = renderHook(() => useAgentValidation(mockAgent), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.skillsCount).toBe(3);
    expect(result.current.isReady).toBe(true);
  });

  it('uses correct query key for caching', async () => {
    mockGetSkills.mockResolvedValue([]);

    const agent1 = { ...mockAgent, id: 'agent-1' };
    const agent2 = { ...mockAgent, id: 'agent-2' };

    renderHook(() => useAgentValidation(agent1), {
      wrapper: createWrapper(),
    });

    renderHook(() => useAgentValidation(agent2), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGetSkills).toHaveBeenCalledTimes(2);
    });

    expect(mockGetSkills).toHaveBeenCalledWith({ agent_id: 'agent-1' });
    expect(mockGetSkills).toHaveBeenCalledWith({ agent_id: 'agent-2' });
  });
});
