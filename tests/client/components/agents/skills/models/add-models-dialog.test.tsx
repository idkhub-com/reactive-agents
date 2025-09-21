import { AddModelsDialog } from '@client/components/agents/skills/models/add-models-dialog';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { useModels } from '@client/providers/models';
import { useSkills } from '@client/providers/skills';
import { render } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock all dependencies with simple implementations
vi.mock('@client/api/v1/idk/skills', () => ({
  addModelsToSkill: vi.fn(),
}));

vi.mock('@client/providers/ai-provider-api-keys', () => ({
  useAIProviderAPIKeys: vi.fn(),
}));

vi.mock('@client/providers/models', () => ({
  useModels: vi.fn(),
}));

vi.mock('@client/providers/skills', () => ({
  useSkills: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Mock all UI components with minimal implementations
vi.mock('@client/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog">{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@client/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@client/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@client/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span>Select value</span>,
}));

vi.mock('@client/components/ui/checkbox', () => ({
  Checkbox: () => <input type="checkbox" />,
}));

vi.mock('@client/components/ui/label', () => ({
  Label: ({ children }: { children: React.ReactNode }) => (
    <label htmlFor="test-input">{children}</label>
  ),
}));

vi.mock('@client/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  CpuIcon: () => <div data-testid="cpu-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
  SearchIcon: () => <div data-testid="search-icon" />,
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

describe('AddModelsDialog', () => {
  const mockOnModelsAdded = vi.fn();

  const defaultProps = {
    skillId: 'skill-123',
    onModelsAdded: mockOnModelsAdded,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAIProviderAPIKeys as Mock).mockReturnValue({
      apiKeys: [],
      isLoading: false,
      error: null,
    });

    (useModels as Mock).mockReturnValue({
      models: [],
      isLoading: false,
      error: null,
      queryParams: {},
      setQueryParams: vi.fn(),
      refetch: vi.fn(),
      skillModels: [],
      isLoadingSkillModels: false,
      skillModelsError: null,
      refetchSkillModels: vi.fn(),
    });

    (useSkills as Mock).mockReturnValue({
      refetch: vi.fn(),
    });
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      expect(() => render(<AddModelsDialog {...defaultProps} />)).not.toThrow();
    });

    it('should render dialog component', () => {
      const { container } = render(<AddModelsDialog {...defaultProps} />);

      expect(
        container.querySelector('[data-testid="dialog"]'),
      ).toBeInTheDocument();
    });

    it('should handle custom trigger prop', () => {
      const customTrigger = <button type="button">Custom Trigger</button>;

      expect(() =>
        render(<AddModelsDialog {...defaultProps} trigger={customTrigger} />),
      ).not.toThrow();
    });
  });

  describe('Provider Integration', () => {
    it('should handle loading state for models', () => {
      (useModels as Mock).mockReturnValue({
        models: [],
        isLoading: true,
        error: null,
        queryParams: {},
        setQueryParams: vi.fn(),
        refetch: vi.fn(),
        skillModels: [],
        isLoadingSkillModels: false,
        skillModelsError: null,
        refetchSkillModels: vi.fn(),
      });

      expect(() => render(<AddModelsDialog {...defaultProps} />)).not.toThrow();
    });

    it('should handle error state for models', () => {
      (useModels as Mock).mockReturnValue({
        models: [],
        isLoading: false,
        error: 'Failed to load models',
        queryParams: {},
        setQueryParams: vi.fn(),
        refetch: vi.fn(),
        skillModels: [],
        isLoadingSkillModels: false,
        skillModelsError: null,
        refetchSkillModels: vi.fn(),
      });

      expect(() => render(<AddModelsDialog {...defaultProps} />)).not.toThrow();
    });

    it('should handle loading state for API keys', () => {
      (useAIProviderAPIKeys as Mock).mockReturnValue({
        apiKeys: [],
        isLoading: true,
        error: null,
      });

      expect(() => render(<AddModelsDialog {...defaultProps} />)).not.toThrow();
    });

    it('should handle error state for API keys', () => {
      (useAIProviderAPIKeys as Mock).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        error: 'Failed to load API keys',
      });

      expect(() => render(<AddModelsDialog {...defaultProps} />)).not.toThrow();
    });
  });

  describe('Props Handling', () => {
    it('should accept skillId prop', () => {
      expect(() =>
        render(
          <AddModelsDialog
            skillId="test-skill-id"
            onModelsAdded={mockOnModelsAdded}
          />,
        ),
      ).not.toThrow();
    });

    it('should accept onModelsAdded callback', () => {
      const callback = vi.fn();

      expect(() =>
        render(
          <AddModelsDialog skillId="skill-123" onModelsAdded={callback} />,
        ),
      ).not.toThrow();
    });

    it('should handle missing props gracefully', () => {
      // Test with minimal required props
      expect(() =>
        render(<AddModelsDialog skillId="skill-123" onModelsAdded={vi.fn()} />),
      ).not.toThrow();
    });
  });
});
