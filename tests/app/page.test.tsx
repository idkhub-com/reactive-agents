import type { Model } from '@shared/types/data/model';
import type { SystemSettings } from '@shared/types/data/system-settings';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock the API functions
vi.mock('@client/api/v1/reactive-agents/models', () => ({
  getModels: vi.fn(),
}));

vi.mock('@client/api/v1/reactive-agents/system-settings', () => ({
  getSystemSettings: vi.fn(),
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
import { getSystemSettings } from '@client/api/v1/reactive-agents/system-settings';
import HomePage from '../../app/page';

const mockGetModels = getModels as Mock;
const mockGetSystemSettings = getSystemSettings as Mock;

// Test fixtures
const textModel: Model = {
  id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef01',
  ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef03',
  model_name: 'gpt-4',
  model_type: 'text',
  embedding_dimensions: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
};

const embedModel: Model = {
  id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef02',
  ai_provider_id: 'b4c5d6e7-f8f9-5012-9345-67890abcdef03',
  model_name: 'text-embedding-ada-002',
  model_type: 'embed',
  embedding_dimensions: 1536,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
};

const completeSettings: SystemSettings = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  system_prompt_reflection_model_id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef01',
  evaluation_generation_model_id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef01',
  judge_model_id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef01',
  embedding_model_id: 'a3b4c5d6-e7f8-4012-8345-67890abcdef02',
  developer_mode: false,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
};

const incompleteSettings: SystemSettings = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  system_prompt_reflection_model_id: null,
  evaluation_generation_model_id: null,
  judge_model_id: null,
  embedding_model_id: null,
  developer_mode: false,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
};

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReplace.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppressing console errors in tests
    });
  });

  describe('Redirect Logic - No Models', () => {
    it('should redirect to /ai-providers when no models exist', async () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSystemSettings.mockResolvedValue(incompleteSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({});
        expect(mockReplace).toHaveBeenCalledWith('/ai-providers');
      });
    });
  });

  describe('Redirect Logic - Missing Model Types', () => {
    it('should redirect to /ai-providers when only text models exist', async () => {
      mockGetModels.mockResolvedValue([textModel]);
      mockGetSystemSettings.mockResolvedValue(incompleteSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/ai-providers');
      });
    });

    it('should redirect to /ai-providers when only embed models exist', async () => {
      mockGetModels.mockResolvedValue([embedModel]);
      mockGetSystemSettings.mockResolvedValue(incompleteSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/ai-providers');
      });
    });
  });

  describe('Redirect Logic - Incomplete Settings', () => {
    it('should redirect to /settings when models exist but settings are incomplete', async () => {
      mockGetModels.mockResolvedValue([textModel, embedModel]);
      mockGetSystemSettings.mockResolvedValue(incompleteSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/settings');
      });
    });

    it('should redirect to /settings when some settings are missing', async () => {
      const partialSettings: SystemSettings = {
        ...completeSettings,
        judge_model_id: null,
      };
      mockGetModels.mockResolvedValue([textModel, embedModel]);
      mockGetSystemSettings.mockResolvedValue(partialSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/settings');
      });
    });
  });

  describe('Redirect Logic - Complete Setup', () => {
    it('should redirect to /agents when models and settings are complete', async () => {
      mockGetModels.mockResolvedValue([textModel, embedModel]);
      mockGetSystemSettings.mockResolvedValue(completeSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/agents');
      });
    });

    it('should redirect to /agents when multiple models exist and settings are complete', async () => {
      const anotherTextModel: Model = {
        ...textModel,
        id: 'c5d6e7f8-9012-3456-7890-abcdef012345',
        model_name: 'claude-3-opus',
      };
      mockGetModels.mockResolvedValue([
        textModel,
        embedModel,
        anotherTextModel,
      ]);
      mockGetSystemSettings.mockResolvedValue(completeSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/agents');
      });
    });
  });

  describe('Error Handling', () => {
    it('should redirect to /settings when API call fails', async () => {
      mockGetModels.mockRejectedValue(new Error('Failed to fetch models'));
      mockGetSystemSettings.mockResolvedValue(incompleteSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/settings');
      });
    });

    it('should log error to console when API call fails', async () => {
      const errorMessage = 'Network error';
      mockGetModels.mockRejectedValue(new Error(errorMessage));
      mockGetSystemSettings.mockResolvedValue(incompleteSettings);

      const consoleErrorSpy = vi.spyOn(console, 'error');

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to check settings:',
          expect.any(Error),
        );
      });
    });

    it('should redirect to /settings when settings fetch fails', async () => {
      mockGetModels.mockResolvedValue([textModel, embedModel]);
      mockGetSystemSettings.mockRejectedValue(
        new Error('Failed to fetch settings'),
      );

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/settings');
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSystemSettings.mockResolvedValue(incompleteSettings);

      render(<HomePage />);

      expect(document.body).toBeInTheDocument();
    });

    it('should return null (no visible UI)', () => {
      mockGetModels.mockResolvedValue([]);
      mockGetSystemSettings.mockResolvedValue(incompleteSettings);

      const { container } = render(<HomePage />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('API Call Behavior', () => {
    it('should fetch all models and settings in parallel', async () => {
      mockGetModels.mockResolvedValue([textModel, embedModel]);
      mockGetSystemSettings.mockResolvedValue(completeSettings);

      render(<HomePage />);

      await vi.waitFor(() => {
        expect(mockGetModels).toHaveBeenCalledWith({});
        expect(mockGetSystemSettings).toHaveBeenCalled();
        expect(mockGetModels).toHaveBeenCalledTimes(1);
        expect(mockGetSystemSettings).toHaveBeenCalledTimes(1);
      });
    });
  });
});
