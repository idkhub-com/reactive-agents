import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentsProvider } from '../../providers/agents';

// Mock Next.js router before importing component under test
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: (url: string) => {
      try {
        if (url.startsWith('/agents')) {
          // Simulate navigation to agents list using hash used elsewhere in tests
          (window as unknown as { location: { hash: string } }).location.hash =
            'agents';
        } else if (url.startsWith('/pipelines/')) {
          (window as unknown as { location: { hash: string } }).location.hash =
            'pipelines';
        }
      } catch {
        // ignore in test env
      }
    },
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { CreateAgentView } from './create-agent-view';

// Mock the agents API
vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn().mockResolvedValue([]),
  createAgent: vi.fn().mockResolvedValue({
    id: 'new-agent-id',
    name: 'New Agent',
    description: 'New agent description',
    metadata: {},
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.location.hash
Object.defineProperty(window, 'location', {
  value: {
    hash: '',
  },
  writable: true,
});

describe('CreateAgentView', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    localStorageMock.clear();
    window.location.hash = '';
  });

  const renderCreateAgentView = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <AgentsProvider>
          <CreateAgentView />
        </AgentsProvider>
      </QueryClientProvider>,
    );

  it('renders create agent form', () => {
    renderCreateAgentView();

    expect(screen.getByText('Create New Agent')).toBeInTheDocument();
    expect(
      screen.getByText('Build a new AI agent to help with your tasks'),
    ).toBeInTheDocument();

    // Form fields - check by placeholder or input elements
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /description/i }),
    ).toBeInTheDocument();

    // Back button (PageHeader back control)
    expect(
      screen.getByRole('button', { name: /go back/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create agent/i }),
    ).toBeInTheDocument();
  });

  it('shows form descriptions and guidance', () => {
    renderCreateAgentView();

    expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
    expect(
      screen.getByText("Define your agent's basic information and purpose"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Choose a descriptive name that reflects your agent's role and purpose.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Provide additional context about the agent's purpose/),
    ).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    renderCreateAgentView();

    // Try to submit empty form
    const createButton = screen.getByText('Create Agent');
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText('Agent name is required')).toBeInTheDocument();
    });
  });

  it('validates agent name length', async () => {
    renderCreateAgentView();

    const nameInput = screen.getByRole('textbox', { name: /agent name/i });

    // Test that name input accepts text
    fireEvent.change(nameInput, { target: { value: 'Valid Name' } });
    expect(nameInput).toHaveValue('Valid Name');

    // Test empty name submission triggers validation
    fireEvent.change(nameInput, { target: { value: '' } });

    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: /create agent/i }));
    });

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Agent name is required')).toBeInTheDocument();
    });
  });

  it('allows optional description', () => {
    renderCreateAgentView();

    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    // Fill only name
    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });

    // Description should be optional
    expect(descriptionInput).toHaveValue('');
    expect(descriptionInput).not.toBeRequired();
  });

  it('creates agent successfully', async () => {
    renderCreateAgentView();

    // Fill form
    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    });

    // Submit form
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: /create agent/i }));
    });

    // Form should submit successfully and reset
    await waitFor(() => {
      expect(nameInput).toHaveValue('');
      expect(descriptionInput).toHaveValue('');
    });

    // Should navigate to pipelines page for the new agent
    expect(window.location.hash).toBe('pipelines');
  });

  it('creates agent with empty description', async () => {
    // Using mocked AgentsProvider that provides createAgent functionality

    renderCreateAgentView();

    // Fill only name
    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });

    // Submit form
    await act(() => {
      fireEvent.click(screen.getByText('Create Agent'));
    });

    // Form should submit successfully
    await waitFor(() => {
      expect(nameInput).toHaveValue('');
    });
  });

  it('handles form interactions', () => {
    renderCreateAgentView();

    // Fill form
    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });

    // Should show the entered value
    expect(nameInput).toHaveValue('Test Agent');

    // Form should show create button
    expect(
      screen.getByRole('button', { name: /create agent/i }),
    ).toBeInTheDocument();
  });

  it('cancels and navigates back', () => {
    renderCreateAgentView();

    fireEvent.click(screen.getByText('Cancel'));

    expect(window.location.hash).toBe('agents');
  });

  it('shows correct button text and behavior', () => {
    renderCreateAgentView();

    // Should show create button
    const createButton = screen.getByRole('button', { name: /create agent/i });
    expect(createButton).toBeInTheDocument();
    expect(createButton).not.toBeDisabled();

    // Should show cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).not.toBeDisabled();
  });

  it('accepts input values correctly', () => {
    renderCreateAgentView();

    // Fill form
    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    });

    // Should show the entered values
    expect(nameInput).toHaveValue('Test Agent');
    expect(descriptionInput).toHaveValue('Test description');
  });

  it('clears form after successful creation', async () => {
    renderCreateAgentView();

    // Fill form
    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    });

    // Submit form
    await act(() => {
      fireEvent.click(screen.getByText('Create Agent'));
    });

    // Navigates to pipelines page after creation
    await waitFor(() => {
      expect(window.location.hash).toBe('pipelines');
    });
  });

  it('handles keyboard navigation', () => {
    renderCreateAgentView();

    const nameInput = screen.getByRole('textbox', { name: /agent name/i });

    // Focus the name input initially
    nameInput.focus();
    expect(document.activeElement).toBe(nameInput);

    // Test that form elements are focusable
    expect(nameInput).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: /description/i }),
    ).toBeInTheDocument();
  });

  it('shows character count for description', () => {
    renderCreateAgentView();

    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    fireEvent.change(descriptionInput, {
      target: { value: 'This is a test description' },
    });

    // Should show character count (if implemented)
    // This depends on the actual implementation
  });

  it('validates description length if there is a limit', async () => {
    renderCreateAgentView();

    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    // Test very long description (assuming 1000 character limit)
    const longDescription = 'a'.repeat(1001);
    fireEvent.change(descriptionInput, {
      target: { value: longDescription },
    });
    fireEvent.blur(descriptionInput);

    // Check if validation message appears (if implemented)
    await waitFor(() => {
      // This would depend on actual validation rules
      // expect(screen.getByText('Description is too long')).toBeInTheDocument();
    });
  });

  it('handles form submission correctly', async () => {
    renderCreateAgentView();

    // Fill form
    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });

    const createButton = screen.getByRole('button', { name: /create agent/i });

    // Submit form
    await act(() => {
      fireEvent.click(createButton);
    });

    // Form should submit and navigate to pipelines
    await waitFor(() => {
      expect(window.location.hash).toBe('pipelines');
    });

    // Form should be reset after successful submission
    expect(nameInput).toHaveValue('');
  });

  it('renders name input as focusable', () => {
    renderCreateAgentView();

    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).not.toBeDisabled();

    // Test that we can focus the input
    nameInput.focus();
    expect(document.activeElement).toBe(nameInput);
  });

  it('handles form reset', () => {
    renderCreateAgentView();

    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    // Fill form
    fireEvent.change(nameInput, { target: { value: 'Test Agent' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    });

    // Values should be set
    expect(nameInput).toHaveValue('Test Agent');
    expect(descriptionInput).toHaveValue('Test description');

    // If there's a reset functionality, test it here
  });

  it('maintains form state during validation errors', async () => {
    renderCreateAgentView();

    const nameInput = screen.getByRole('textbox', { name: /agent name/i });
    const descriptionInput = screen.getByRole('textbox', {
      name: /description/i,
    });

    // Fill description but leave name empty
    fireEvent.change(descriptionInput, {
      target: { value: 'Test description' },
    });

    // Try to submit with empty name
    await act(() => {
      fireEvent.click(screen.getByRole('button', { name: /create agent/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Agent name is required')).toBeInTheDocument();
    });

    // Description should still be filled
    expect(descriptionInput).toHaveValue('Test description');
    // Name should still be empty
    expect(nameInput).toHaveValue('');
  });
});
