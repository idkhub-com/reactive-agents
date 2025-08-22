import { getDatasets } from '@client/api/v1/idk/evaluations/datasets';
import { useDatasetNameValidation } from '@client/hooks/use-dataset-name-validation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the API function
vi.mock('@client/api/v1/idk/evaluations/datasets', () => ({
  getDatasets: vi.fn(),
}));

const mockGetDatasets = vi.mocked(getDatasets);

// Create a wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDatasetNameValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return idle state for empty name', () => {
    const { result } = renderHook(
      () => useDatasetNameValidation('', 'agent-123'),
      { wrapper: createWrapper() },
    );

    expect(result.current.isValidating).toBe(false);
    expect(result.current.isAvailable).toBe(null);
    expect(result.current.existingNames).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should validate name availability when name is provided', async () => {
    mockGetDatasets.mockResolvedValue([
      {
        id: '1',
        agent_id: 'agent-123',
        name: 'existing-dataset',
        description: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);

    const { result } = renderHook(
      () => useDatasetNameValidation('new-dataset', 'agent-123'),
      { wrapper: createWrapper() },
    );

    // Initially validating
    expect(result.current.isValidating).toBe(true);

    // Wait for validation to complete
    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.existingNames).toEqual(['existing-dataset']);
  });

  it('should detect duplicate names (case insensitive)', async () => {
    mockGetDatasets.mockResolvedValue([
      {
        id: '1',
        agent_id: 'agent-123',
        name: 'My Dataset',
        description: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);

    const { result } = renderHook(
      () => useDatasetNameValidation('my dataset', 'agent-123'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.existingNames).toEqual(['My Dataset']);
  });

  it('should suggest alternative names', async () => {
    mockGetDatasets.mockResolvedValue([
      {
        id: '1',
        agent_id: 'agent-123',
        name: 'test',
        description: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        agent_id: 'agent-123',
        name: 'test_1',
        description: null,
        metadata: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]);

    const { result } = renderHook(
      () => useDatasetNameValidation('test', 'agent-123'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.isAvailable).toBe(false);

    // Test suggestion function
    const suggestion = result.current.suggestAlternativeName('test');
    expect(suggestion).toBe('test_2');
  });

  it('should handle API errors gracefully', async () => {
    mockGetDatasets.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(
      () => useDatasetNameValidation('test-dataset', 'agent-123'),
      { wrapper: createWrapper() },
    );

    await waitFor(
      () => {
        expect(result.current.error).toBe('Failed to validate dataset name');
      },
      { timeout: 2000 },
    );

    expect(result.current.isAvailable).toBe(null);
  });

  it('should not validate when disabled', () => {
    const { result } = renderHook(
      () => useDatasetNameValidation('test-dataset', 'agent-123', false),
      { wrapper: createWrapper() },
    );

    expect(result.current.isValidating).toBe(false);
    expect(result.current.isAvailable).toBe(null);
    expect(mockGetDatasets).not.toHaveBeenCalled();
  });

  it('should not validate when agent ID is missing', () => {
    const { result } = renderHook(
      () => useDatasetNameValidation('test-dataset', undefined),
      { wrapper: createWrapper() },
    );

    expect(result.current.isValidating).toBe(false);
    expect(result.current.isAvailable).toBe(null);
    expect(mockGetDatasets).not.toHaveBeenCalled();
  });
});
