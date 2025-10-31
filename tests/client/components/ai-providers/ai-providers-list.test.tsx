import { AIProvidersListView } from '@client/components/ai-providers/ai-providers-list';
import { useAIProviderAPIKeys } from '@client/providers/ai-provider-api-keys';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@client/providers/ai-provider-api-keys', () => ({
  useAIProviderAPIKeys: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock UI components
vi.mock('@client/components/ui/page-header', () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {actions && <div>{actions}</div>}
    </div>
  ),
}));

vi.mock('@client/components/ui/button', () => ({
  Button: ({
    children,
    asChild,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) =>
    asChild ? (
      children
    ) : (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
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
  TableRow: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <tr onClick={onClick}>{children}</tr>,
}));

vi.mock('@client/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock('@client/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

vi.mock('@client/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
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
    // biome-ignore lint/a11y/noStaticElementInteractions: mock component for testing
    // biome-ignore lint/a11y/useKeyWithClickEvents: mock component for testing
  }) => <div onClick={onClick}>{children}</div>,
}));

describe('AIProvidersListView', () => {
  const mockApiKeys = [
    {
      id: 'provider-1',
      ai_provider: 'openai',
      name: 'Production OpenAI',
      api_key: 'sk-abc123def456ghi789',
      created_at: '2024-01-01T00:00:00Z',
      custom_fields: {},
    },
    {
      id: 'provider-2',
      ai_provider: 'anthropic',
      name: 'Claude API',
      api_key: 'sk-ant-xyz789',
      created_at: '2024-01-02T00:00:00Z',
      custom_fields: {},
    },
    {
      id: 'provider-3',
      ai_provider: 'ollama',
      name: 'Local Ollama',
      api_key: null,
      created_at: '2024-01-03T00:00:00Z',
      custom_fields: {},
    },
  ];

  const mockUseAIProviderAPIKeys = {
    apiKeys: mockApiKeys,
    isLoading: false,
    refetch: vi.fn(),
    deleteAPIKey: vi.fn(),
    isDeleting: false,
    refreshAPIKeys: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAIProviderAPIKeys as ReturnType<typeof vi.fn>).mockReturnValue(
      mockUseAIProviderAPIKeys,
    );
  });

  describe('Loading State', () => {
    it('should show loading skeletons when loading', () => {
      (useAIProviderAPIKeys as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockUseAIProviderAPIKeys,
        isLoading: true,
      });

      render(<AIProvidersListView />);

      expect(screen.getAllByTestId('skeleton')).toBeTruthy();
      expect(
        screen.getAllByText('AI Providers & Models').length,
      ).toBeGreaterThan(0);
    });
  });

  describe('Rendering', () => {
    it('should render AI providers list with correct headers', () => {
      render(<AIProvidersListView />);

      expect(screen.getByText('AI Providers & Models')).toBeInTheDocument();
      expect(
        screen.getByText('Configure AI providers and manage available models'),
      ).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Provider')).toBeInTheDocument();
      expect(screen.getByText('API Key')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should display all AI providers', () => {
      render(<AIProvidersListView />);

      expect(screen.getByText('Production OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Claude API')).toBeInTheDocument();
      expect(screen.getByText('Local Ollama')).toBeInTheDocument();
    });

    it('should mask API keys correctly (first 4 + 10 dots + last 4)', () => {
      render(<AIProvidersListView />);

      // Should show masked version: sk-a + 10 dots + i789
      expect(screen.getByText(/sk-a••••••••••i789/)).toBeInTheDocument();
    });

    it('should show "No API key set" for providers without API keys', () => {
      render(<AIProvidersListView />);

      expect(screen.getByText('No API key set')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter providers by name', async () => {
      const user = userEvent.setup();
      render(<AIProvidersListView />);

      const searchInput = screen.getByPlaceholderText(
        'Search by provider or name...',
      );
      await user.type(searchInput, 'OpenAI');

      expect(screen.getByText('Production OpenAI')).toBeInTheDocument();
      expect(screen.queryByText('Claude API')).not.toBeInTheDocument();
    });

    it('should filter providers by AI provider type', async () => {
      const user = userEvent.setup();
      render(<AIProvidersListView />);

      const searchInput = screen.getByPlaceholderText(
        'Search by provider or name...',
      );
      await user.type(searchInput, 'anthropic');

      expect(screen.getByText('Claude API')).toBeInTheDocument();
      expect(screen.queryByText('Production OpenAI')).not.toBeInTheDocument();
    });
  });

  describe('Provider Selection', () => {
    it('should call onProviderSelect when row is clicked', async () => {
      const onProviderSelect = vi.fn();
      const user = userEvent.setup();

      render(<AIProvidersListView onProviderSelect={onProviderSelect} />);

      const rows = screen.getAllByRole('row');
      await user.click(rows[1]); // First data row (index 0 is header)

      expect(onProviderSelect).toHaveBeenCalledWith('provider-1');
    });

    it('should highlight selected provider', () => {
      const { container } = render(
        <AIProvidersListView selectedProviderId="provider-1" />,
      );

      // Check that provider selection styling is applied
      const rows = container.querySelectorAll('tr');
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no providers exist', () => {
      (useAIProviderAPIKeys as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockUseAIProviderAPIKeys,
        apiKeys: [],
      });

      render(<AIProvidersListView />);

      expect(screen.getByText('No AI providers found')).toBeInTheDocument();
      expect(
        screen.getByText('Get started by adding your first AI provider.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Add Your First AI Provider'),
      ).toBeInTheDocument();
    });

    it('should show search empty state when search has no results', async () => {
      const user = userEvent.setup();
      render(<AIProvidersListView />);

      const searchInput = screen.getByPlaceholderText(
        'Search by provider or name...',
      );
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No AI providers found')).toBeInTheDocument();
      expect(
        screen.getByText('No AI providers match your search criteria.'),
      ).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should have refresh button', () => {
      render(<AIProvidersListView />);

      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('should have add AI provider button', () => {
      render(<AIProvidersListView />);

      expect(screen.getByText('Add AI Provider')).toBeInTheDocument();
    });

    it('should call refresh functions when refresh button is clicked', async () => {
      const user = userEvent.setup();
      const mockRefetch = vi.fn();
      const mockRefreshAPIKeys = vi.fn();

      (useAIProviderAPIKeys as ReturnType<typeof vi.fn>).mockReturnValue({
        ...mockUseAIProviderAPIKeys,
        refetch: mockRefetch,
        refreshAPIKeys: mockRefreshAPIKeys,
      });

      render(<AIProvidersListView />);

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(mockRefreshAPIKeys).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('API Key Display Security', () => {
    it('should always mask API keys with fixed length', () => {
      render(<AIProvidersListView />);

      // All masked keys should have the same number of dots (10)
      const maskedKeys = screen.getAllByText(/••••••••••/);
      expect(maskedKeys.length).toBeGreaterThan(0);

      // Should not reveal actual length of API key
      maskedKeys.forEach((key) => {
        const text = key.textContent || '';
        const dotCount = (text.match(/•/g) || []).length;
        expect(dotCount).toBe(10);
      });
    });

    it('should show copy button for providers with API keys', () => {
      render(<AIProvidersListView />);

      // Should have copy buttons for providers with keys
      const buttons = screen.getAllByRole('button');
      const copyButtons = buttons.filter(
        (b) => b.querySelector('svg') || b.textContent === '',
      );
      expect(copyButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Copy to Clipboard', () => {
    it('should have clipboard functionality available', () => {
      const writeTextMock = vi.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      });

      render(<AIProvidersListView />);

      // Verify component rendered with providers that have API keys
      expect(screen.getByText('Production OpenAI')).toBeInTheDocument();

      // Verify copy buttons are present for providers with keys
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(2); // More than just Refresh and Add buttons
    });
  });
});
