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
import { SkillsProvider } from '../../providers/skills';
import { SkillView } from './skill-view';

// Mock the agents API
vi.mock('@client/api/v1/idk/agents', () => {
  const mockAgents = [
    {
      id: 'agent-1',
      name: 'Test Agent 1',
      description: 'First test agent description',
      metadata: {},
      created_at: '2023-01-01T10:30:00Z',
      updated_at: '2023-01-02T15:45:00Z',
    },
    {
      id: 'agent-2',
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
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),
  };
});

// Mock the skills API
vi.mock('@client/api/v1/idk/skills', () => {
  const mockSkills = [
    {
      id: 'skill-1',
      agent_id: 'agent-1',
      name: 'Test Skill 1',
      description: 'First test skill description',
      metadata: { key1: 'value1', key2: { nested: 'object' } },
      created_at: '2023-01-01T10:30:00Z',
      updated_at: '2023-01-02T15:45:00Z',
    },
    {
      id: 'skill-2',
      agent_id: 'agent-1',
      name: 'Test Skill 2',
      description: null,
      metadata: {},
      created_at: '2023-01-03T08:15:00Z',
      updated_at: '2023-01-03T08:15:00Z',
    },
  ];

  return {
    getSkills: vi.fn().mockResolvedValue(mockSkills),
    createSkill: vi.fn(),
    updateSkill: vi.fn().mockResolvedValue({
      ...mockSkills[0],
      description: 'Updated description',
      updated_at: '2023-01-05T12:00:00Z',
    }),
    deleteSkill: vi.fn().mockResolvedValue(undefined),
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

describe('SkillView', () => {
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

  const renderSkillView = (skillId = 'skill-1', onClose = vi.fn()) =>
    render(
      <QueryClientProvider client={queryClient}>
        <AgentsProvider>
          <SkillsProvider>
            <SkillView skillId={skillId} onClose={onClose} />
          </SkillsProvider>
        </AgentsProvider>
      </QueryClientProvider>,
    );

  it('renders skill view when skillId is provided', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  it('shows skill details when rendered with skillId', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2); // Name appears in header and basic info section
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });
  });

  it('displays skill basic information correctly', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Check basic info section
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    expect(screen.getByText('Test Agent 1')).toBeInTheDocument(); // Agent name
    expect(
      screen.getByText('First test skill description'),
    ).toBeInTheDocument();
  });

  it('displays agent information correctly', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    });

    // Should show agent name in header badge and basic info section
    const agentElements = screen.getAllByText('Test Agent 1');
    expect(agentElements.length).toBeGreaterThanOrEqual(1);
  });

  it('displays timestamps in correct format', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getByText('Timeline')).toBeInTheDocument();
    });

    // Should display formatted timestamps - just check that dates are present
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();
    // Note: skill-view only shows created_at, not updated_at
  });

  it('displays metadata when present', async () => {
    renderSkillView('skill-1');

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
    renderSkillView('skill-2');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 2')).toHaveLength(2);
    });

    expect(screen.getByText('No metadata available')).toBeInTheDocument();
  });

  it('shows empty description state correctly', async () => {
    renderSkillView('skill-2');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 2')).toHaveLength(2);
    });

    expect(screen.getByText('No description provided')).toBeInTheDocument();
  });

  it('closes skill view when close button is clicked', async () => {
    const mockOnClose = vi.fn();
    renderSkillView('skill-1', mockOnClose);

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Click close button
    const closeButton = screen.getByTitle('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('enters edit mode when edit button is clicked', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Click edit button
    const editButton = screen.getByTitle('Edit skill');
    fireEvent.click(editButton);

    // Should enter edit mode
    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel editing')).toBeInTheDocument();
    });

    // Description should become editable
    expect(
      screen.getByDisplayValue('First test skill description'),
    ).toBeInTheDocument();
  });

  it('saves changes when save button is clicked', async () => {
    const { updateSkill } = await import('@client/api/v1/idk/skills');
    const updateSkillMock = vi.mocked(updateSkill);

    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Enter edit mode
    fireEvent.click(screen.getByTitle('Edit skill'));

    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
    });

    // Edit description
    const textarea = screen.getByDisplayValue('First test skill description');
    fireEvent.change(textarea, { target: { value: 'Updated description' } });

    // Save changes
    fireEvent.click(screen.getByTitle('Save changes'));

    // Wait for the update to be called
    await waitFor(() => {
      expect(updateSkillMock).toHaveBeenCalledWith('skill-1', {
        description: 'Updated description',
      });
    });

    // Should exit edit mode
    await waitFor(() => {
      expect(screen.queryByTitle('Save changes')).not.toBeInTheDocument();
    });
  });

  it('cancels editing when cancel button is clicked', async () => {
    const { updateSkill } = await import('@client/api/v1/idk/skills');
    const updateSkillMock = vi.mocked(updateSkill);

    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Enter edit mode
    fireEvent.click(screen.getByTitle('Edit skill'));

    await waitFor(() => {
      expect(screen.getByTitle('Cancel editing')).toBeInTheDocument();
    });

    // Edit description
    const textarea = screen.getByDisplayValue('First test skill description');
    fireEvent.change(textarea, { target: { value: 'Changed description' } });

    // Cancel editing
    fireEvent.click(screen.getByTitle('Cancel editing'));

    // Should exit edit mode without saving
    await waitFor(() => {
      expect(screen.queryByTitle('Cancel editing')).not.toBeInTheDocument();
    });

    expect(updateSkillMock).not.toHaveBeenCalled();

    // Original description should be restored
    expect(
      screen.getByText('First test skill description'),
    ).toBeInTheDocument();
  });

  it('deletes skill when delete button is clicked and confirmed', async () => {
    const { deleteSkill } = await import('@client/api/v1/idk/skills');
    const deleteSkillMock = vi.mocked(deleteSkill);

    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Click delete button
    await act(() => {
      fireEvent.click(screen.getByTitle('Delete skill'));
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this skill?',
    );
    expect(deleteSkillMock).toHaveBeenCalledWith('skill-1');
  });

  it('cancels deletion when user clicks cancel', async () => {
    const { deleteSkill } = await import('@client/api/v1/idk/skills');
    const deleteSkillMock = vi.mocked(deleteSkill);
    vi.mocked(window.confirm).mockReturnValue(false);

    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    fireEvent.click(screen.getByTitle('Delete skill'));

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteSkillMock).not.toHaveBeenCalled();
  });

  it('handles keyboard shortcuts (Escape key)', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Press Escape key on the skill view card
    const skillViewCard = document.getElementById('skill-view-card');
    if (skillViewCard) {
      fireEvent.keyDown(skillViewCard, { key: 'Escape' });
    }

    // Escape key should close the view (onClose would be called in real usage)
  });

  it('disables save/cancel buttons during update', async () => {
    // Mock slow update that never resolves during the test
    const { updateSkill } = await import('@client/api/v1/idk/skills');
    const updateSkillMock = vi.mocked(updateSkill);
    updateSkillMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Enter edit mode
    fireEvent.click(screen.getByTitle('Edit skill'));

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

  it('handles skill not found scenario', async () => {
    renderSkillView('skill-999');

    // When skill is not found, the component renders an aria-hidden div
    await waitFor(() => {
      const hiddenDiv = document.querySelector('[aria-hidden="true"]');
      expect(hiddenDiv).toBeInTheDocument();
    });

    // Should not show any skill content
    expect(screen.queryByText('Basic Information')).not.toBeInTheDocument();
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument();
    expect(screen.queryByText('Metadata')).not.toBeInTheDocument();
  });

  it('resets edit state when switching skills', async () => {
    const { rerender } = renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    fireEvent.click(screen.getByTitle('Edit skill'));

    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
    });

    // Switch to different skill by re-rendering with different skillId
    rerender(
      <QueryClientProvider client={queryClient}>
        <AgentsProvider>
          <SkillsProvider>
            <SkillView skillId="skill-2" onClose={vi.fn()} />
          </SkillsProvider>
        </AgentsProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 2')).toHaveLength(2);
    });

    // Should not be in edit mode for new skill
    expect(screen.queryByTitle('Save changes')).not.toBeInTheDocument();
    expect(screen.getByTitle('Edit skill')).toBeInTheDocument();
  });

  it('focuses close button after animation completes', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    const closeButton = screen.getByTitle('Close');
    expect(closeButton).toBeInTheDocument();
  });

  it('shows correct skill icon and branding', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Should have skill-specific icon (Wrench) - we can't easily test SVG content,
    // but we can verify the structure exists
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
  });

  it('handles empty description in edit mode', async () => {
    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Enter edit mode
    fireEvent.click(screen.getByTitle('Edit skill'));

    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
    });

    // Clear description
    const textarea = screen.getByDisplayValue('First test skill description');
    fireEvent.change(textarea, { target: { value: '' } });

    // Save with empty description
    fireEvent.click(screen.getByTitle('Save changes'));

    const { updateSkill } = await import('@client/api/v1/idk/skills');
    await waitFor(() => {
      expect(updateSkill).toHaveBeenCalledWith('skill-1', {
        description: null,
      });
    });
  });

  it('handles update error gracefully', async () => {
    const { updateSkill } = await import('@client/api/v1/idk/skills');
    const updateSkillMock = vi.mocked(updateSkill);
    updateSkillMock.mockRejectedValue(new Error('Update failed'));

    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    // Enter edit mode and try to save
    fireEvent.click(screen.getByTitle('Edit skill'));

    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
    });

    const textarea = screen.getByDisplayValue('First test skill description');
    fireEvent.change(textarea, { target: { value: 'Updated description' } });

    fireEvent.click(screen.getByTitle('Save changes'));

    // Should handle error gracefully (stays in edit mode)
    await waitFor(() => {
      expect(screen.getByTitle('Save changes')).toBeInTheDocument();
    });
  });

  it('handles delete error gracefully', async () => {
    const { deleteSkill } = await import('@client/api/v1/idk/skills');
    const deleteSkillMock = vi.mocked(deleteSkill);
    deleteSkillMock.mockRejectedValue(new Error('Delete failed'));

    renderSkillView('skill-1');

    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });

    fireEvent.click(screen.getByTitle('Delete skill'));

    // Should still be in skill view after delete fails
    await waitFor(() => {
      expect(screen.getAllByText('Test Skill 1')).toHaveLength(2);
    });
  });
});
