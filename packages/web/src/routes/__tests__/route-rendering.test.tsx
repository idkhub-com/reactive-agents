import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderRoute, setupAuthMocks } from './route-test-utils';

// --- Layout mocks (pass-through or null) ---
vi.mock('@web/providers/app-providers', () => ({
  AppProviders: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@web/components/side-bar/app-sidebar', () => ({
  AppSidebar: () => null,
}));

vi.mock('@web/components/ui/sidebar', () => ({
  SidebarInset: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SidebarTrigger: () => null,
}));

vi.mock('@web/components/breadcrumb', () => ({
  BreadcrumbComponent: () => null,
}));

vi.mock('@web/components/ui/theme-select', () => ({
  ThemeSelect: () => null,
}));

// --- Page component mocks (render test markers) ---
vi.mock('@web/components/agents/agents-list-view', () => ({
  AgentsListView: () => <div data-testid="page-agents-list" />,
}));

vi.mock('@web/components/agents/create-agent-view', () => ({
  CreateAgentView: () => <div data-testid="page-agents-create" />,
}));

vi.mock('@web/components/agents/agent-view', () => ({
  AgentView: () => <div data-testid="page-agent-detail" />,
}));

vi.mock('@web/components/agents/edit-agent-view', () => ({
  EditAgentView: () => <div data-testid="page-agent-edit" />,
}));

vi.mock('@web/components/ai-providers/providers-and-models-view', () => ({
  ProvidersAndModelsView: () => <div data-testid="page-ai-providers-list" />,
}));

vi.mock('@web/components/ai-providers', () => ({
  APIKeyForm: ({ mode }: { mode: string }) => (
    <div data-testid={`page-ai-providers-${mode}`} />
  ),
}));

vi.mock('@web/components/models/add-models-view', () => ({
  AddModelsView: () => <div data-testid="page-models-add" />,
}));

vi.mock('@web/components/settings/system-settings-view', () => ({
  SystemSettingsView: () => <div data-testid="page-settings" />,
}));

vi.mock('@web/components/agents/skills/create-skill-view', () => ({
  CreateSkillView: () => <div data-testid="page-skill-create" />,
}));

vi.mock('@web/components/agents/skills/skill-dashboard-view', () => ({
  SkillDashboardView: () => <div data-testid="page-skill-dashboard" />,
}));

vi.mock('@web/components/agents/skills/edit-skill-view', () => ({
  EditSkillView: () => <div data-testid="page-skill-edit" />,
}));

vi.mock('@web/components/agents/skills/create-skill-complete-view', () => ({
  CreateSkillCompleteView: () => <div data-testid="page-skill-setup" />,
}));

vi.mock('@web/components/agents/agent-logs-view', () => ({
  AgentLogsView: () => <div data-testid="page-agent-logs" />,
}));

vi.mock('@web/components/agents/skills/logs/log-details-view', () => ({
  LogDetailsView: () => <div data-testid="page-log-detail" />,
}));

vi.mock('@web/components/agents/skills/events/skill-events-view', () => ({
  SkillEventsView: () => <div data-testid="page-skill-events" />,
}));

vi.mock(
  '@web/components/agents/skills/evaluations/evaluations-list-view',
  () => ({
    EvaluationsListView: () => <div data-testid="page-skill-evaluations" />,
  }),
);

vi.mock(
  '@web/components/agents/skills/evaluations/evaluation-edit-view',
  () => ({
    EvaluationEditView: () => <div data-testid="page-evaluation-edit" />,
  }),
);

vi.mock('@web/components/agents/skills/clusters/cluster-arms-view', () => ({
  ClusterArmsView: () => <div data-testid="page-cluster-configurations" />,
}));

vi.mock('@web/components/agents/skills/arms/arm-detail-view', () => ({
  ArmDetailView: () => <div data-testid="page-arm-detail" />,
}));

// --- Inline-logic mocks ---
vi.mock('@web/providers/ai-providers', () => ({
  useAIProviders: () => ({
    isLoading: false,
    getAPIKeyById: () => ({
      id: 'p1',
      name: 'Test Provider',
      provider: 'openai',
      key: 'sk-test',
    }),
  }),
}));

vi.mock('@web/components/ui/skeleton', () => ({
  Skeleton: () => null,
}));

// --- Login page mocks ---
vi.mock('@web/components/side-bar/animated-logo', () => ({
  AnimatedLogo: () => <div data-testid="animated-logo" />,
}));

vi.mock('@web/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@web/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: () => <div data-testid="form-field" />,
  FormItem: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormControl: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FormMessage: () => null,
}));

vi.mock('@web/components/ui/input', () => ({
  Input: () => <input data-testid="input" />,
}));

vi.mock('@web/components/ui/button', () => ({
  Button: ({ children }: { children: React.ReactNode }) => (
    <button type="button" data-testid="button">
      {children}
    </button>
  ),
}));

// --- Route rendering tests ---
const ROUTE_TABLE: [string, string, string][] = [
  ['agents list', '/agents', 'page-agents-list'],
  ['create agent', '/agents/create', 'page-agents-create'],
  ['agent detail', '/agents/test-agent', 'page-agent-detail'],
  ['edit agent', '/agents/test-agent/edit', 'page-agent-edit'],
  ['ai providers list', '/ai-providers', 'page-ai-providers-list'],
  ['create ai provider', '/ai-providers/create', 'page-ai-providers-create'],
  ['edit ai provider', '/ai-providers/p1/edit', 'page-ai-providers-edit'],
  ['add models to provider', '/ai-providers/p1/add-models', 'page-models-add'],
  ['settings', '/settings', 'page-settings'],
  ['agent logs', '/agents/test-agent/logs', 'page-agent-logs'],
  ['agent log detail', '/agents/test-agent/logs/log-1', 'page-log-detail'],
  ['create skill', '/agents/test-agent/skills/create', 'page-skill-create'],
  [
    'skill dashboard',
    '/agents/test-agent/skills/test-skill',
    'page-skill-dashboard',
  ],
  [
    'edit skill',
    '/agents/test-agent/skills/test-skill/edit',
    'page-skill-edit',
  ],
  [
    'skill setup',
    '/agents/test-agent/skills/test-skill/setup',
    'page-skill-setup',
  ],
  // A skill has no logs pages of its own any more: both addresses redirect
  // to the agent's, the list narrowed to the skill by a search param
  [
    'skill logs (redirects to the agent logs)',
    '/agents/test-agent/skills/test-skill/logs',
    'page-agent-logs',
  ],
  [
    'skill log detail (redirects to the agent log)',
    '/agents/test-agent/skills/test-skill/logs/log-1',
    'page-log-detail',
  ],
  [
    'skill events',
    '/agents/test-agent/skills/test-skill/events',
    'page-skill-events',
  ],
  [
    'skill evaluations',
    '/agents/test-agent/skills/test-skill/evaluations',
    'page-skill-evaluations',
  ],
  [
    'evaluation edit',
    '/agents/test-agent/skills/test-skill/evaluations/eval-1/edit',
    'page-evaluation-edit',
  ],
  [
    'clusters index (redirects to the skill dashboard)',
    '/agents/test-agent/skills/test-skill/clusters',
    'page-skill-dashboard',
  ],
  [
    'cluster configurations',
    '/agents/test-agent/skills/test-skill/clusters/c1/configurations',
    'page-cluster-configurations',
  ],
  [
    'arm detail',
    '/agents/test-agent/skills/test-skill/clusters/c1/configurations/arm-1',
    'page-arm-detail',
  ],
];

describe('Route Rendering', () => {
  beforeEach(() => {
    setupAuthMocks({ authRequired: false, authenticated: true });
  });

  it.each(
    ROUTE_TABLE,
  )('renders %s at %s', async (_description, path, expectedTestId) => {
    renderRoute(path);
    await waitFor(() => {
      expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
    });
  });

  it('renders login page at /login', async () => {
    // Login page should render when auth is required but user is not authenticated
    setupAuthMocks({ authRequired: true, authenticated: false });
    renderRoute('/login');
    await waitFor(() => {
      expect(screen.getByTestId('animated-logo')).toBeInTheDocument();
      expect(
        screen.getByText('Enter password to continue'),
      ).toBeInTheDocument();
    });
  });
});
