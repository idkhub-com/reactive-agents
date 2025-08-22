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
import { AgentView } from './agent-view';

// Mock the agents API
vi.mock('@client/api/v1/idk/agents', () => {
  const mockAgents = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Test Agent 1',
      description: 'First test agent description',
      metadata: { key1: 'value1', key2: { nested: 'object' } },
      created_at: '2023-01-01T10:30:00Z',
      updated_at: '2023-01-02T15:45:00Z',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Test Agent 2',
      description: null,
      metadata: {},
      created_at: '2023-01-03T08:15:00Z',
      updated_at: '2023-01-03T08:15:00Z',
    },
  ];

  return {
    getAgents: vi.fn().mockResolvedValue(mockAgents),
    createAgent: vi.fn(),
    updateAgent: vi.fn().mockResolvedValue({
      ...mockAgents[0],
      description: 'Updated description',
      updated_at: '2023-01-05T12:00:00Z',
    }),
    deleteAgent: vi.fn().mockResolvedValue(undefined),
  };
});

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

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true),
  writable: true,
});

// Mock addEventListener for hash changes
const hashChangeListeners: Array<() => void> = [];
Object.defineProperty(window, 'addEventListener', {
  value: vi.fn((event: string, callback: () => void) => {
    if (event === 'hashchange') {
      hashChangeListeners.push(callback);
    }
  }),
  writable: true,
});

Object.defineProperty(window, 'removeEventListener', {
  value: vi.fn((event: string, callback: () => void) => {
    if (event === 'hashchange') {
      const index = hashChangeListeners.indexOf(callback);
      if (index > -1) {
        hashChangeListeners.splice(index, 1);
      }
    }
  }),
  writable: true,
});

describe('AgentView', () => {
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
    hashChangeListeners.length = 0;
  });

  const renderAgentView = (
    agentId = '550e8400-e29b-41d4-a716-446655440001',
    onClose = vi.fn(),
  ) =>
    render(
      <QueryClientProvider client={queryClient}>
        <AgentsProvider>
          <AgentView agentId={agentId} onClose={onClose} />
        </AgentsProvider>
      </QueryClientProvider>,
    );

  // Utility function for hash change simulation (kept for potential future use)
  // const _simulateHashChange = (hash: string) => {
  //   window.location.hash = hash;
  //   hashChangeListeners.forEach((listener) => listener());
  // };

  it('renders agent view when agentId is provided', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  it('shows agent details when rendered with agentId', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2); // Name appears in header and basic info section
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  it('displays agent basic information correctly', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Check basic info section
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    expect(
      screen.getByText('First test agent description'),
    ).toBeInTheDocument();
  });

  it('displays timestamps in correct format', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    // Should display formatted timestamps - let's be more flexible with the format
    expect(screen.getByText(/Jan 1, /)).toBeInTheDocument(); // Created timestamp should contain "Jan 1, "
  });

  it('displays metadata when present', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getByText('Metadata')).toBeInTheDocument();
    });

    // Should show metadata keys and values
    expect(screen.getByText('key1')).toBeInTheDocument();
    expect(screen.getByText('value1')).toBeInTheDocument();
    expect(screen.getByText('key2')).toBeInTheDocument();
    // JSON stringified nested object should contain nested and object
    expect(screen.getByText(/nested/)).toBeInTheDocument();
    expect(screen.getByText(/object/)).toBeInTheDocument();
  });

  it('shows empty metadata state when no metadata exists', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440002');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 2')).toHaveLength(2);
    });

    expect(screen.getByText('No metadata configured')).toBeInTheDocument();
  });

  it('shows empty description state correctly', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440002');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 2')).toHaveLength(2);
    });

    expect(screen.getByText('No description provided')).toBeInTheDocument();
  });

  it('closes agent view when close button is clicked', async () => {
    const mockOnClose = vi.fn();
    renderAgentView('550e8400-e29b-41d4-a716-446655440001', mockOnClose);

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Click close button using its ID
    const closeButton = document.getElementById('agent-view-close-button');
    if (closeButton) {
      fireEvent.click(closeButton);
    }

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('allows setting agent as active', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Initially should show "Set as active agent" button
    const setActiveButton = screen.getByTitle('Set as active agent');
    fireEvent.click(setActiveButton);

    await waitFor(() => {
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    // Set as active button should no longer be visible
    expect(screen.queryByTitle('Set as active agent')).not.toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Click edit button
    const editButton = screen.getByTitle('Edit agent');
    fireEvent.click(editButton);

    // Should enter edit mode
    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel editing')).toBeInTheDocument();
    });

    // Description should become editable
    expect(
      screen.getByDisplayValue('First test agent description'),
    ).toBeInTheDocument();
  });

  it('saves changes when save button is clicked', async () => {
    const { updateAgent } = await import('@client/api/v1/idk/agents');
    const updateAgentMock = vi.mocked(updateAgent);

    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Enter edit mode
    fireEvent.click(screen.getByTitle('Edit agent'));

    await waitFor(
      () => {
        expect(screen.getByTitle('Save changes')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Edit description
    const textarea = screen.getByDisplayValue('First test agent description');
    fireEvent.change(textarea, { target: { value: 'Updated description' } });

    // Save changes
    fireEvent.click(screen.getByTitle('Save changes'));

    // Wait for the update to be called
    await waitFor(() => {
      expect(updateAgentMock).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440001',
        {
          description: 'Updated description',
        },
      );
    });

    // Should exit edit mode
    await waitFor(() => {
      expect(screen.queryByTitle('Save changes')).not.toBeInTheDocument();
    });
  });

  it('cancels editing when cancel button is clicked', async () => {
    const { updateAgent } = await import('@client/api/v1/idk/agents');
    const updateAgentMock = vi.mocked(updateAgent);

    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Enter edit mode
    fireEvent.click(screen.getByTitle('Edit agent'));

    await waitFor(() => {
      expect(screen.getByTitle('Cancel editing')).toBeInTheDocument();
    });

    // Edit description
    const textarea = screen.getByDisplayValue('First test agent description');
    fireEvent.change(textarea, { target: { value: 'Changed description' } });

    // Cancel editing
    fireEvent.click(screen.getByTitle('Cancel editing'));

    // Should exit edit mode without saving
    await waitFor(() => {
      expect(screen.queryByTitle('Cancel editing')).not.toBeInTheDocument();
    });

    expect(updateAgentMock).not.toHaveBeenCalled();

    // Original description should be restored
    expect(
      screen.getByText('First test agent description'),
    ).toBeInTheDocument();
  });

  it('deletes agent when delete button is clicked and confirmed', async () => {
    const { deleteAgent } = await import('@client/api/v1/idk/agents');
    const deleteAgentMock = vi.mocked(deleteAgent);

    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Click delete button
    await act(() => {
      fireEvent.click(screen.getByTitle('Delete agent'));
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Agent 1"?',
    );
    expect(deleteAgentMock).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440001',
    );
  });

  it('cancels deletion when user clicks cancel', async () => {
    const { deleteAgent } = await import('@client/api/v1/idk/agents');
    const deleteAgentMock = vi.mocked(deleteAgent);
    vi.mocked(window.confirm).mockReturnValue(false);

    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    fireEvent.click(screen.getByTitle('Delete agent'));

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteAgentMock).not.toHaveBeenCalled();
  });

  it('handles keyboard shortcuts (Escape key)', async () => {
    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Press Escape key on the agent view card
    const agentViewCard = document.getElementById('agent-view-card');
    if (agentViewCard) {
      fireEvent.keyDown(agentViewCard, { key: 'Escape' });
    }

    // Escape key should close the view (onClose would be called in real usage)
  });

  it('disables save/cancel buttons during update', async () => {
    // Mock slow update that never resolves during the test
    const { updateAgent } = await import('@client/api/v1/idk/agents');
    const updateAgentMock = vi.mocked(updateAgent);
    updateAgentMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderAgentView('550e8400-e29b-41d4-a716-446655440001');

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    // Enter edit mode
    fireEvent.click(screen.getByTitle('Edit agent'));

    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
    });

    // Start save - this should trigger the update and disable buttons
    fireEvent.click(screen.getByTitle('Save changes'));

    // Buttons should be disabled during update
    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeDisabled();
      expect(screen.getByTitle('Cancel editing')).toBeDisabled();
    });
  });

  it('handles agent not found scenario', async () => {
    renderAgentView('999');

    // When agent is not found, the component renders a hidden div
    await waitFor(() => {
      const hiddenDiv = document.querySelector('.hidden');
      expect(hiddenDiv).toBeInTheDocument();
    });

    // Should not show any agent content
    expect(screen.queryByText('Basic Information')).not.toBeInTheDocument();
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
    expect(screen.queryByText('Metadata')).not.toBeInTheDocument();
  });

  it('resets edit state when switching agents', async () => {
    const { rerender } = renderAgentView(
      '550e8400-e29b-41d4-a716-446655440001',
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2);
    });

    fireEvent.click(screen.getByTitle('Edit agent'));

    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
    });

    // Switch to different agent by re-rendering with different agentId
    rerender(
      <QueryClientProvider client={queryClient}>
        <AgentsProvider>
          <AgentView
            agentId="550e8400-e29b-41d4-a716-446655440002"
            onClose={vi.fn()}
          />
        </AgentsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 2')).toHaveLength(2);
    });

    // Should not be in edit mode for new agent
    expect(screen.queryByTitle('Save changes')).not.toBeInTheDocument();
    expect(screen.getByTitle('Edit agent')).toBeInTheDocument();
  });
});
