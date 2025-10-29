import { ModelsListView } from '@client/components/models/models-list';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { useModels } from '@client/providers/models';
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock all dependencies with minimal implementations
vi.mock('@client/api/v1/idk/models', () => ({
  deleteModel: vi.fn(),
}));

vi.mock('@client/providers/ai-provider-api-keys', () => ({
  useAIProviderAPIKeys: vi.fn(),
}));

vi.mock('@client/providers/models', () => ({
  useModels: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock UI components to avoid complex dependencies
vi.mock('@client/components/ui/page-header', () => ({
  PageHeader: ({
    title,
    description,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
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

vi.mock('@client/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock('@client/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableCell: ({ children }: { children: React.ReactNode }) => (
    <td>{children}</td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
}));

vi.mock('@client/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@client/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('@client/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('@client/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock all Lucide icons
vi.mock('lucide-react', () => ({
  CalendarIcon: () => <div data-testid="calendar-icon" />,
  CpuIcon: () => <div data-testid="cpu-icon" />,
  MoreHorizontalIcon: () => <div data-testid="more-icon" />,
  PlusIcon: () => <div data-testid="plus-icon" />,
  RefreshCwIcon: () => <div data-testid="refresh-icon" />,
  SearchIcon: () => <div data-testid="search-icon" />,
  TrashIcon: () => <div data-testid="trash-icon" />,
}));

// Mock date-fns
vi.mock('date-fns', () => ({
  format: () => 'Jan 1, 2023',
}));

// Mock nanoid
vi.mock('nanoid', () => ({
  nanoid: () => 'test-id',
}));

const mockAPIKeys = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    provider: 'openai' as const,
    name: 'OpenAI Key',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
];

const mockModels = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    ai_provider_id: '550e8400-e29b-41d4-a716-446655440000',
    model_name: 'gpt-4',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
];

describe('ModelsListView', () => {
  const mockPush = vi.fn();
  const mockSetQueryParams = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as Mock).mockReturnValue({
      push: mockPush,
    });

    (useAIProviderAPIKeys as Mock).mockReturnValue({
      apiKeys: mockAPIKeys,
      isLoading: false,
      error: null,
    });

    (useModels as Mock).mockReturnValue({
      models: mockModels,
      isLoading: false,
      error: null,
      queryParams: {},
      setQueryParams: mockSetQueryParams,
      refetch: mockRefetch,
    });
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<ModelsListView />);
      expect(screen.getByText('Models')).toBeInTheDocument();
    });

    it('should show loading skeleton when models are loading', () => {
      (useModels as Mock).mockReturnValue({
        models: [],
        isLoading: true,
        error: null,
        queryParams: {},
        setQueryParams: mockSetQueryParams,
        refetch: mockRefetch,
      });

      render(<ModelsListView />);
      expect(screen.getAllByTestId('skeleton')).toHaveLength(15);
    });

    it('should show error message when models fail to load', () => {
      (useModels as Mock).mockReturnValue({
        models: [],
        isLoading: false,
        error: 'Failed to load models',
        queryParams: {},
        setQueryParams: mockSetQueryParams,
        refetch: mockRefetch,
      });

      render(<ModelsListView />);
      expect(screen.getByText('Failed to load models')).toBeInTheDocument();
    });

    it('should render models when loaded successfully', () => {
      render(<ModelsListView />);
      expect(screen.getByText('gpt-4')).toBeInTheDocument();
    });

    it('should show empty state when no models exist', () => {
      (useModels as Mock).mockReturnValue({
        models: [],
        isLoading: false,
        error: null,
        queryParams: {},
        setQueryParams: mockSetQueryParams,
        refetch: mockRefetch,
      });

      render(<ModelsListView />);
      expect(screen.getByText('No models configured')).toBeInTheDocument();
    });
  });

  describe('Provider Integration', () => {
    it('should handle API keys loading state', () => {
      (useAIProviderAPIKeys as Mock).mockReturnValue({
        apiKeys: [],
        isLoading: true,
        error: null,
      });

      render(<ModelsListView />);
      expect(screen.getByText('Models')).toBeInTheDocument();
    });

    it('should handle API keys error state', () => {
      (useAIProviderAPIKeys as Mock).mockReturnValue({
        apiKeys: [],
        isLoading: false,
        error: 'Failed to load API keys',
      });

      render(<ModelsListView />);
      expect(screen.getByText('Models')).toBeInTheDocument();
    });
  });
});
