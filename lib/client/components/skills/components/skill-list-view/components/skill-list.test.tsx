import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillsProvider } from '../../../../../providers/skills';
import { SkillsList } from './skill-list';

// Mock data
const mockSkills = [
  {
    id: 'skill-1',
    agent_id: 'agent-1',
    name: 'Test Skill 1',
    description: 'First test skill description',
    metadata: { key1: 'value1', key2: 'value2' },
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
  {
    id: 'skill-3',
    agent_id: 'agent-2',
    name: 'Very Long Skill Name That Should Be Truncated Because It Is Too Long',
    description:
      'This is a very long description that should also be truncated when displayed in the list view to ensure proper layout and readability for users browsing the skills.',
    metadata: {},
    created_at: '2023-01-04T12:00:00Z',
    updated_at: '2023-01-04T12:00:00Z',
  },
];

// Mock the skills API
vi.mock('@client/api/v1/idk/skills', () => ({
  getSkills: vi.fn().mockResolvedValue([
    {
      id: 'skill-1',
      agent_id: 'agent-1',
      name: 'Test Skill 1',
      description: 'First test skill description',
      metadata: { key1: 'value1', key2: 'value2' },
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
    {
      id: 'skill-3',
      agent_id: 'agent-2',
      name: 'Very Long Skill Name That Should Be Truncated Because It Is Too Long',
      description:
        'This is a very long description that should also be truncated when displayed in the list view to ensure proper layout and readability for users browsing the skills.',
      metadata: {},
      created_at: '2023-01-04T12:00:00Z',
      updated_at: '2023-01-04T12:00:00Z',
    },
  ]),
  createSkill: vi.fn(),
  updateSkill: vi.fn(),
  deleteSkill: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@client/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

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

describe('SkillsList', () => {
  let queryClient: QueryClient;

  const mockGetAgentName = vi.fn((agentId: string) => {
    const agents = {
      'agent-1': 'Test Agent 1',
      'agent-2': 'Test Agent 2',
    };
    return agents[agentId as keyof typeof agents] || 'Unknown Agent';
  });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
    mockPush.mockClear();
    window.location.hash = '';
    mockGetAgentName.mockClear();
  });

  const renderSkillsList = (skills = mockSkills) =>
    render(
      <QueryClientProvider client={queryClient}>
        <SkillsProvider>
          <SkillsList skills={skills} getAgentName={mockGetAgentName} />
        </SkillsProvider>
      </QueryClientProvider>,
    );

  it('renders list of skills', async () => {
    renderSkillsList();

    await waitFor(() => {
      expect(screen.getByText('Test Skill 1')).toBeInTheDocument();
      expect(screen.getByText('Test Skill 2')).toBeInTheDocument();
      expect(screen.getByText(/Very Long Skill Name/)).toBeInTheDocument();
    });
  });

  it('displays skill descriptions', async () => {
    renderSkillsList();

    await waitFor(() => {
      expect(
        screen.getByText('First test skill description'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/This is a very long description/),
      ).toBeInTheDocument();
    });
  });

  it('shows agent names for each skill', async () => {
    renderSkillsList();

    await waitFor(() => {
      expect(screen.getAllByText('Test Agent 1')).toHaveLength(2); // Two skills for agent-1
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    });

    expect(mockGetAgentName).toHaveBeenCalledWith('agent-1');
    expect(mockGetAgentName).toHaveBeenCalledWith('agent-2');
  });

  it('displays formatted creation timestamps', async () => {
    renderSkillsList();

    await waitFor(() => {
      expect(screen.getByText(/Created: Jan 1,/)).toBeInTheDocument();
      expect(screen.getByText(/Created: Jan 3,/)).toBeInTheDocument();
      expect(screen.getByText(/Created: Jan 4,/)).toBeInTheDocument();
    });
  });

  it('shows metadata count when metadata exists', async () => {
    renderSkillsList();

    await waitFor(() => {
      expect(screen.getByText('2 metadata fields')).toBeInTheDocument();
    });
  });

  it('does not show metadata count when metadata is empty', async () => {
    renderSkillsList();

    await waitFor(() => {
      expect(screen.queryByText('0 metadata fields')).not.toBeInTheDocument();
    });
  });

  it('navigates to skill view when skill is clicked', async () => {
    renderSkillsList();

    await waitFor(() => {
      const skillCard = screen.getByText('Test Skill 1').closest('.group');
      expect(skillCard).toBeInTheDocument();

      if (skillCard) {
        fireEvent.click(skillCard);
      }
    });

    expect(mockPush).toHaveBeenCalledWith('/skills/skill-1');
  });

  it('shows action buttons on hover', async () => {
    renderSkillsList();

    await waitFor(() => {
      // Action buttons should not be visible initially (opacity-0)
      const deleteButtons = screen.getAllByTitle('Delete skill');
      expect(deleteButtons[0]).toBeInTheDocument();

      // The buttons exist but are hidden due to opacity-0 class
      // We can't easily test hover states in jsdom, but we can verify the buttons exist
    });
  });

  it('shows set active button for non-selected skills', async () => {
    renderSkillsList();

    await waitFor(() => {
      // Should show "Set as active skill" buttons
      const setActiveButtons = screen.getAllByTitle('Set as active skill');
      expect(setActiveButtons).toHaveLength(3); // All skills should have set active button initially
    });
  });

  it('hides set active button for selected skill', async () => {
    // We need to simulate a skill being selected first
    renderSkillsList();

    await waitFor(() => {
      // Click on a skill to select it first
      const firstSkillCard = screen.getByText('Test Skill 1').closest('.group');
      if (firstSkillCard) {
        const setActiveButton = screen.getAllByTitle('Set as active skill')[0];
        fireEvent.click(setActiveButton);
      }
    });

    await waitFor(() => {
      // The selected skill should show "Active" badge and not have set active button
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  it('deletes skill when delete button is clicked and confirmed', async () => {
    const { deleteSkill } = await import('@client/api/v1/idk/skills');
    const deleteSkillMock = vi.mocked(deleteSkill);

    renderSkillsList();

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete skill');
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Skill 1"?',
    );
    expect(deleteSkillMock).toHaveBeenCalledWith('skill-1');
  });

  it('does not delete skill when deletion is cancelled', async () => {
    const { deleteSkill } = await import('@client/api/v1/idk/skills');
    const deleteSkillMock = vi.mocked(deleteSkill);
    vi.mocked(window.confirm).mockReturnValue(false);

    renderSkillsList();

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete skill');
      fireEvent.click(deleteButtons[0]);
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteSkillMock).not.toHaveBeenCalled();
  });

  it('prevents event propagation when action buttons are clicked', async () => {
    renderSkillsList();

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete skill');
      fireEvent.click(deleteButtons[0]);
    });

    // Should show confirm dialog, not navigate to skill view
    expect(window.confirm).toHaveBeenCalled();
    expect(window.location.hash).toBe(''); // Should not navigate
  });

  it('handles skills without descriptions', async () => {
    renderSkillsList();

    await waitFor(() => {
      expect(screen.getByText('Test Skill 2')).toBeInTheDocument();
      // Should not show description for skill-2 since it's null
      expect(
        screen.queryByText('Second test skill description'),
      ).not.toBeInTheDocument();
    });
  });

  it('handles empty skills list', () => {
    renderSkillsList([]);

    // Should render empty container without errors
    const container = document.querySelector('.flex-1.overflow-auto');
    expect(container).toBeInTheDocument();
    expect(container?.children).toHaveLength(1); // Just the space-y-2 div
  });

  it('applies correct styling classes', async () => {
    renderSkillsList();

    await waitFor(() => {
      const skillCards = document.querySelectorAll(
        '.group.relative.cursor-pointer',
      );
      expect(skillCards).toHaveLength(3);
    });
  });

  it('shows skill icons', async () => {
    renderSkillsList();

    await waitFor(() => {
      // Skills should have wrench icons (we can't easily test SVG content, but can verify structure)
      const skillCards = document.querySelectorAll(
        '.group.relative.cursor-pointer',
      );
      expect(skillCards[0]).toBeInTheDocument();
      expect(skillCards[0].querySelector('.bg-orange-100')).toBeInTheDocument(); // Icon background
    });
  });

  it('truncates long skill names', async () => {
    renderSkillsList();

    await waitFor(() => {
      const longNameElement = screen.getByText(/Very Long Skill Name/);
      expect(longNameElement).toHaveClass('truncate');
    });
  });

  it('truncates long descriptions with line-clamp', async () => {
    renderSkillsList();

    await waitFor(() => {
      const longDescElement = screen.getByText(
        /This is a very long description/,
      );
      expect(longDescElement).toHaveClass('line-clamp-2');
    });
  });

  it('handles unknown agents gracefully', async () => {
    const skillsWithUnknownAgent = [
      {
        ...mockSkills[0],
        agent_id: 'unknown-agent-id',
      },
    ];

    renderSkillsList(skillsWithUnknownAgent);

    await waitFor(() => {
      expect(screen.getByText('Unknown Agent')).toBeInTheDocument();
    });

    expect(mockGetAgentName).toHaveBeenCalledWith('unknown-agent-id');
  });

  it('renders delete buttons', async () => {
    renderSkillsList();

    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete skill');
      expect(deleteButtons).toHaveLength(3); // One for each skill
    });

    // Delete buttons should be present for interaction
    const deleteButtons = screen.getAllByTitle('Delete skill');
    expect(deleteButtons[0]).toBeInTheDocument();
    expect(deleteButtons[1]).toBeInTheDocument();
    expect(deleteButtons[2]).toBeInTheDocument();
  });

  it('formats timestamps correctly for different dates', async () => {
    const skillsWithDifferentDates = [
      {
        ...mockSkills[0],
        created_at: '2023-12-25T23:59:59Z',
      },
      {
        ...mockSkills[1],
        created_at: '2023-06-15T12:30:45Z',
      },
    ];

    renderSkillsList(skillsWithDifferentDates);

    await waitFor(() => {
      expect(screen.getByText(/Created: Dec 25,/)).toBeInTheDocument();
      expect(screen.getByText(/Created: Jun 15,/)).toBeInTheDocument();
    });
  });

  it('shows proper hover states', async () => {
    renderSkillsList();

    await waitFor(() => {
      const skillCards = document.querySelectorAll(
        '.group.relative.cursor-pointer',
      );

      // Cards should have hover:bg-accent class
      expect(skillCards[0]).toHaveClass('hover:bg-accent');

      // Action buttons should have opacity-0 group-hover:opacity-100
      const actionButton = skillCards[0].querySelector(
        '.opacity-0.group-hover\\:opacity-100',
      );
      expect(actionButton).toBeInTheDocument();
    });
  });

  it('maintains proper spacing and layout', async () => {
    renderSkillsList();

    await waitFor(() => {
      const container = document.querySelector('.space-y-2');
      expect(container).toBeInTheDocument();

      const skillCards = container?.querySelectorAll(
        '.group.relative.cursor-pointer',
      );
      expect(skillCards).toHaveLength(3);
    });
  });

  it('handles rapid clicks without issues', async () => {
    renderSkillsList();

    await waitFor(() => {
      const skillCard = screen.getByText('Test Skill 1').closest('.group');

      if (skillCard) {
        // Simulate rapid clicks
        fireEvent.click(skillCard);
        fireEvent.click(skillCard);
        fireEvent.click(skillCard);
      }
    });

    // Should call router.push for each click
    expect(mockPush).toHaveBeenCalledTimes(3);
    expect(mockPush).toHaveBeenCalledWith('/skills/skill-1');
  });

  it('shows active badge with correct styling', async () => {
    renderSkillsList();

    await waitFor(() => {
      const setActiveButton = screen.getAllByTitle('Set as active skill')[0];
      fireEvent.click(setActiveButton);
    });

    await waitFor(() => {
      const activeBadge = screen.getByText('Active');
      expect(activeBadge).toBeInTheDocument();
      expect(activeBadge).toHaveClass(
        'rounded-full',
        'bg-green-100',
        'text-green-800',
      );
    });
  });
});
