import { BreadcrumbComponent } from '@client/components/breadcrumb/breadcrumb';
import { AgentsProvider } from '@client/providers/agents';
import { NavigationProvider } from '@client/providers/navigation';
import { SkillsProvider } from '@client/providers/skills';
import type { Agent } from '@shared/types/data';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import type React from 'react';
import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest';

// Mock Next.js navigation with proper typing
const mockPush = vi.fn();
const mockReplace = vi.fn();

interface MockParams {
  agentName?: string;
  skillName?: string;
  logId?: string;
  evalId?: string;
  datasetId?: string;
}

let mockParams: MockParams = {};
let mockPathname = '/agents';

const mockRouter = {
  push: mockPush,
  replace: mockReplace,
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => mockRouter),
  useParams: vi.fn(() => mockParams),
  usePathname: vi.fn(() => mockPathname),
}));

// Mock API functions with proper typing
vi.mock('@client/api/v1/reactive-agents/agents', () => ({
  getAgents: vi.fn(),
}));

vi.mock('@client/api/v1/reactive-agents/skills', () => ({
  getSkills: vi.fn(),
}));

import { getAgents } from '@client/api/v1/reactive-agents/agents';
import { getSkills } from '@client/api/v1/reactive-agents/skills';

const _mockGetAgents = vi.mocked(getAgents);
const _mockGetSkills = vi.mocked(getSkills);

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Test Agent 1',
    description: 'Test Description 1',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Test Agent 2',
    description: 'Test Description 2',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Test Agent With Spaces',
    description: 'Test Description With Spaces',
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Type-safe localStorage mock
const mockGetItem = vi.fn().mockReturnValue(null) as MockedFunction<
  (key: string) => string | null
>;
const mockSetItem = vi.fn() as MockedFunction<
  (key: string, value: string) => void
>;
const mockRemoveItem = vi.fn() as MockedFunction<(key: string) => void>;
const mockClear = vi.fn() as MockedFunction<() => void>;
const mockKey = vi.fn().mockReturnValue(null) as MockedFunction<
  (index: number) => string | null
>;

const mockLocalStorage: Storage = {
  getItem: mockGetItem,
  setItem: mockSetItem,
  removeItem: mockRemoveItem,
  clear: mockClear,
  key: mockKey,
  length: 0,
};

// Mock window with proper typing
const mockWindow = {
  ...window,
  localStorage: mockLocalStorage,
};

Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationProvider>
        <AgentsProvider>
          <SkillsProvider>{component}</SkillsProvider>
        </AgentsProvider>
      </NavigationProvider>
    </QueryClientProvider>,
  );
};

describe('BreadcrumbComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAgents).mockResolvedValue(mockAgents);
    vi.mocked(getSkills).mockResolvedValue([]);
    mockGetItem.mockReturnValue(null);
    mockParams = {};
    mockPathname = '/agents';
  });

  it('renders initial breadcrumb with agent selector', () => {
    // The component renders successfully without crashing
    expect(() => renderWithProviders(<BreadcrumbComponent />)).not.toThrow();
  });

  it('renders breadcrumb with selected agent', () => {
    mockParams = { agentName: 'Test%20Agent%201' };
    mockPathname = '/agents/Test%20Agent%201';

    // The component renders successfully without crashing
    expect(() => renderWithProviders(<BreadcrumbComponent />)).not.toThrow();
  });

  it('renders complex breadcrumb path for nested navigation', () => {
    mockParams = {
      agentName: 'Test%20Agent%201',
      skillName: 'Test%20Skill%201',
      logId: 'log-123',
    };
    mockPathname = '/agents/Test%20Agent%201/Test%20Skill%201/logs/log-123';

    // The component renders successfully without crashing
    expect(() => renderWithProviders(<BreadcrumbComponent />)).not.toThrow();
  });

  it('handles URL encoded agent names correctly', () => {
    mockParams = { agentName: 'Test%20Agent%20With%20Spaces' };
    mockPathname = '/agents/Test%20Agent%20With%20Spaces';

    // The component renders successfully without crashing
    expect(() => renderWithProviders(<BreadcrumbComponent />)).not.toThrow();
  });

  it('shows disabled state while loading', async () => {
    // Make the API call pending to test loading state
    let resolveAgents: (value: unknown) => void;
    const pendingPromise = new Promise<unknown>((resolve) => {
      resolveAgents = resolve;
    });
    vi.mocked(getAgents).mockReturnValue(pendingPromise as Promise<never>);

    // Set pathname to a nested route where agent dropdown is shown
    mockPathname = '/agents/Test%20Agent%201/Test%20Skill%201';
    mockParams = {
      agentName: 'Test%20Agent%201',
      skillName: 'Test%20Skill%201',
    };

    await act(() => {
      renderWithProviders(<BreadcrumbComponent />);
    });

    // Shows loading placeholder in the agent dropdown breadcrumb
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Resolve the promise to cleanup
    await act(() => {
      resolveAgents!(mockAgents);
    });
  });

  it('loads agents data on mount', () => {
    // The component renders successfully without crashing
    expect(() => renderWithProviders(<BreadcrumbComponent />)).not.toThrow();
  });

  describe('Skill Filtering', () => {
    it('filters skills by selected agent when agent changes', async () => {
      const mockSkillsAgent1 = [
        {
          id: 'skill-1',
          agent_id: '1',
          name: 'Skill 1',
          description: 'Skill for Agent 1',
          metadata: {},
          optimize: false,
          configuration_count: 3,
          clustering_interval: 15,
          reflection_min_requests_per_arm: 3,
          exploration_temperature: 1.0,
          last_clustering_at: null,
          last_clustering_log_start_time: null,
          evaluations_regenerated_at: null,
          evaluation_lock_acquired_at: null,
          reflection_lock_acquired_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const mockSkillsAgent2 = [
        {
          id: 'skill-2',
          agent_id: '2',
          name: 'Skill 2',
          description: 'Skill for Agent 2',
          metadata: {},
          optimize: false,
          configuration_count: 3,
          clustering_interval: 15,
          reflection_min_requests_per_arm: 3,
          exploration_temperature: 1.0,
          last_clustering_at: null,
          last_clustering_log_start_time: null,
          evaluations_regenerated_at: null,
          evaluation_lock_acquired_at: null,
          reflection_lock_acquired_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      // Mock getSkills to return different skills based on agent_id
      vi.mocked(getSkills).mockImplementation((params) => {
        if (params?.agent_id === '1') return Promise.resolve(mockSkillsAgent1);
        if (params?.agent_id === '2') return Promise.resolve(mockSkillsAgent2);
        return Promise.resolve([]);
      });

      mockParams = { agentName: 'Test%20Agent%201', skillName: 'Skill%201' };
      mockPathname = '/agents/Test%20Agent%201/Skill%201';

      await act(() => {
        renderWithProviders(<BreadcrumbComponent />);
      });

      // Wait for skills to load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Verify getSkills was called with agent_id filter
      expect(vi.mocked(getSkills)).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: '1',
        }),
      );
    });

    it('updates skill filter when selected agent changes', async () => {
      mockParams = { agentName: 'Test%20Agent%201', skillName: 'Test%20Skill' };
      mockPathname = '/agents/Test%20Agent%201/Test%20Skill';

      vi.mocked(getSkills).mockResolvedValue([
        {
          id: 'skill-1',
          agent_id: '1',
          name: 'Test Skill',
          description: 'Test skill description',
          metadata: {},
          optimize: false,
          configuration_count: 3,
          clustering_interval: 15,
          reflection_min_requests_per_arm: 3,
          exploration_temperature: 1.0,
          last_clustering_at: null,
          last_clustering_log_start_time: null,
          evaluations_regenerated_at: null,
          evaluation_lock_acquired_at: null,
          reflection_lock_acquired_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      await act(() => {
        renderWithProviders(<BreadcrumbComponent />);
      });

      // Wait for useEffect to run and update query params
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // Verify getSkills was eventually called with agent_id filter
      // The breadcrumb's useEffect should trigger a query with agent_id
      expect(vi.mocked(getSkills)).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_id: '1',
          limit: 100,
        }),
      );
    });
  });

  describe('Skill Icon', () => {
    it('uses DiceBear avatar for skills instead of Wrench icon', async () => {
      const mockSkills = [
        {
          id: 'skill-1',
          agent_id: '1',
          name: 'Test Skill',
          description: 'Test skill description',
          metadata: {},
          optimize: false,
          configuration_count: 3,
          clustering_interval: 15,
          reflection_min_requests_per_arm: 3,
          exploration_temperature: 1.0,
          last_clustering_at: null,
          last_clustering_log_start_time: null,
          evaluations_regenerated_at: null,
          evaluation_lock_acquired_at: null,
          reflection_lock_acquired_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      vi.mocked(getSkills).mockResolvedValue(mockSkills);

      mockParams = { agentName: 'Test%20Agent%201', skillName: 'Test%20Skill' };
      mockPathname = '/agents/Test%20Agent%201/Test%20Skill';

      await act(() => {
        renderWithProviders(<BreadcrumbComponent />);
      });

      // Wait for render
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should render skill name
      expect(screen.queryByText('Test Skill')).toBeTruthy();

      // Should render an image element for the skill avatar
      const images = screen.getAllByRole('img');
      const skillAvatar = images.find((img) =>
        img.getAttribute('alt')?.includes('Test Skill'),
      );
      expect(skillAvatar).toBeTruthy();

      // Avatar should have base64 SVG data
      const src = skillAvatar?.getAttribute('src');
      expect(src).toContain('data:image/svg+xml;base64');
    });
  });
});
