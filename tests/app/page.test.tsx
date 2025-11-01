import type { Model } from '@shared/types/data/model';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock the API functions
vi.mock('@client/api/v1/reactive-agents/models', () => ({
  getModels: vi.fn(),
}));

// Mock Next.js router
const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { getModels } from '@client/api/v1/reactive-agents/models';
import HomePage from '../../app/page';

const mockGetModels = getModels as Mock;

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppressing console errors in tests
    });
  });

  describe('Redirect Logic', () => {
    it('should redirect to /ai-providers when no models exist', async () => {
      mockGetModels.mockResolvedValue([]);

      render(<HomePage />);

      // Wait for the async operation to complete
      await vi.waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({ limit: 1 });
        expect(mockReplace).toHaveBeenCalledWith('/ai-providers');
      });
    });

    it('should redirect to /agents when models exist', async () => {
      const mockModels: Model[] = [
        {
          id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef01',
          ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef03',
          model_name: 'gpt-4',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockGetModels.mockResolvedValue(mockModels);

      render(<HomePage />);

      // Wait for the async operation to complete
      await vi.waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({ limit: 1 });
        expect(mockReplace).toHaveBeenCalledWith('/agents');
      });
    });

    it('should redirect to /agents when multiple models exist', async () => {
      const mockModels: Model[] = [
        {
          id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef01',
          ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef03',
          model_name: 'gpt-4',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
        {
          id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef02',
          ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef04',
          model_name: 'claude-3-opus',
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ];

      mockGetModels.mockResolvedValue(mockModels);

      render(<HomePage />);

      // Wait for the async operation to complete
      await vi.waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({ limit: 1 });
        expect(mockReplace).toHaveBeenCalledWith('/agents');
      });
    });
  });

  describe('Error Handling', () => {
    it('should redirect to /agents when API call fails', async () => {
      mockGetModels.mockRejectedValue(new Error('Failed to fetch models'));

      render(<HomePage />);

      // Wait for the async operation to complete
      await vi.waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({ limit: 1 });
        expect(mockReplace).toHaveBeenCalledWith('/agents');
      });
    });

    it('should log error to console when API call fails', async () => {
      const errorMessage = 'Network error';
      mockGetModels.mockRejectedValue(new Error(errorMessage));

      const consoleErrorSpy = vi.spyOn(console, 'error');

      render(<HomePage />);

      // Wait for the async operation to complete
      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to fetch models:',
          expect.any(Error),
        );
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockGetModels.mockRejectedValue('String error');

      render(<HomePage />);

      // Wait for the async operation to complete
      await vi.waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({ limit: 1 });
        expect(mockReplace).toHaveBeenCalledWith('/agents');
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      mockGetModels.mockResolvedValue([]);

      render(<HomePage />);

      expect(document.body).toBeInTheDocument();
    });

    it('should return null (no visible UI)', () => {
      mockGetModels.mockResolvedValue([]);

      const { container } = render(<HomePage />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('API Call Optimization', () => {
    it('should fetch only one model (limit=1) for efficiency', async () => {
      mockGetModels.mockResolvedValue([]);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({ limit: 1 });
        expect(mockGetModels).toHaveBeenCalledTimes(1);
      });
    });
  });
});
