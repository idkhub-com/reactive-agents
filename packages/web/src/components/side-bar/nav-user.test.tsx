import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavUser } from '@web/components/side-bar/nav-user';
import { SidebarProvider } from '@web/providers/side-bar';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock navigate using vi.hoisted
const { mockNavigate, mockLogout, mockGetAuthStatus } = vi.hoisted(() => {
  return {
    mockNavigate: vi.fn(),
    mockLogout: vi.fn(),
    mockGetAuthStatus: vi.fn(),
  };
});

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
  useRouter: () => ({
    state: { location: { pathname: '/' } },
    navigate: mockNavigate,
  }),
  useParams: () => ({}),
  useSearch: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock auth API
vi.mock('@web/api/v1/super-agents/auth', () => ({
  logout: mockLogout,
  getAuthStatus: mockGetAuthStatus,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('NavUser', () => {
  let queryClient: QueryClient;

  function renderNavUser(): void {
    render(
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <NavUser />
        </SidebarProvider>
      </QueryClientProvider>,
    );
  }

  /** The button only exists once the auth status has arrived. */
  function findLogoutButton(): Promise<HTMLElement> {
    return screen.findByRole('button', { name: /log out/i });
  }

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    mockGetAuthStatus.mockResolvedValue({
      authRequired: true,
      authenticated: true,
    });
  });

  it('should render logout button', async () => {
    renderNavUser();

    expect(await findLogoutButton()).toBeInTheDocument();
  });

  it('should call logout when button is clicked', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValueOnce(true);

    renderNavUser();

    await user.click(await findLogoutButton());

    expect(mockLogout).toHaveBeenCalled();
  });

  it('should redirect to login page on successful logout', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValueOnce(true);

    renderNavUser();

    await user.click(await findLogoutButton());

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });
  });

  it('should not redirect if logout fails', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValueOnce(false);

    renderNavUser();

    await user.click(await findLogoutButton());

    // Wait a bit to ensure no redirect happens
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Without ACCESS_PASSWORD there is no session: `/login` would redirect
  // straight back here, so the button would look like it did nothing.
  it('renders nothing when the server does not require authentication', async () => {
    mockGetAuthStatus.mockResolvedValue({
      authRequired: false,
      authenticated: true,
    });

    renderNavUser();

    await waitFor(() => {
      expect(mockGetAuthStatus).toHaveBeenCalled();
    });
    expect(
      screen.queryByRole('button', { name: /log out/i }),
    ).not.toBeInTheDocument();
  });

  it('renders nothing while the auth status is unknown', () => {
    mockGetAuthStatus.mockReturnValue(
      new Promise(() => {
        // Never resolves - the status is still in flight
      }),
    );

    renderNavUser();

    expect(
      screen.queryByRole('button', { name: /log out/i }),
    ).not.toBeInTheDocument();
  });
});
