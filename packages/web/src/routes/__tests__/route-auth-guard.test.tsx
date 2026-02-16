import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute, setupAuthMocks } from './route-test-utils';

// --- Layout mocks (same as route-rendering.test.tsx) ---
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

// --- Page component mocks ---
vi.mock('@web/components/agents/agents-list-view', () => ({
  AgentsListView: () => <div data-testid="page-agents-list" />,
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

vi.mock('@web/components/ui/skeleton', () => ({
  Skeleton: () => null,
}));

describe('Route auth guards', () => {
  describe('when unauthenticated (auth required)', () => {
    beforeEach(() => {
      setupAuthMocks({ authRequired: true, authenticated: false });
    });

    it('/agents redirects to /login', async () => {
      renderRoute('/agents');
      await waitFor(() => {
        expect(screen.getByTestId('animated-logo')).toBeInTheDocument();
        expect(
          screen.getByText('Enter password to continue'),
        ).toBeInTheDocument();
      });
    });

    it('/login renders the login page', async () => {
      renderRoute('/login');
      await waitFor(() => {
        expect(screen.getByTestId('animated-logo')).toBeInTheDocument();
        expect(
          screen.getByText('Enter password to continue'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('when authenticated', () => {
    beforeEach(() => {
      setupAuthMocks({ authRequired: true, authenticated: true });
    });

    it('/login redirects to /agents', async () => {
      renderRoute('/login');
      await waitFor(() => {
        expect(screen.getByTestId('page-agents-list')).toBeInTheDocument();
      });
    });
  });

  describe('when auth is not required', () => {
    beforeEach(() => {
      setupAuthMocks({ authRequired: false, authenticated: true });
    });

    it('/login redirects to /agents', async () => {
      renderRoute('/login');
      await waitFor(() => {
        expect(screen.getByTestId('page-agents-list')).toBeInTheDocument();
      });
    });
  });
});
