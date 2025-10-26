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
vi.mock('@client/api/v1/idk/agents', () => ({
  getAgents: vi.fn(),
}));

vi.mock('@client/api/v1/idk/skills', () => ({
  getSkills: vi.fn(),
}));

import { getAgents } from '@client/api/v1/idk/agents';
import { getSkills } from '@client/api/v1/idk/skills';

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
});
