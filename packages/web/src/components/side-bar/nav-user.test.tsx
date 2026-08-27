import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavUser } from '@web/components/side-bar/nav-user';
import { SidebarProvider } from '@web/providers/side-bar';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock navigate using vi.hoisted
const { mockNavigate, mockLogout } = vi.hoisted(() => {
  return {
    mockNavigate: vi.fn(),
    mockLogout: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render logout button', () => {
    render(
      <SidebarProvider>
        <NavUser />
      </SidebarProvider>,
    );

    const button = screen.getByRole('button', { name: /log out/i });
    expect(button).toBeInTheDocument();
  });

  it('should call logout when button is clicked', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValueOnce(true);

    render(
      <SidebarProvider>
        <NavUser />
      </SidebarProvider>,
    );

    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    expect(mockLogout).toHaveBeenCalled();
  });

  it('should redirect to login page on successful logout', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValueOnce(true);

    render(
      <SidebarProvider>
        <NavUser />
      </SidebarProvider>,
    );

    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });
  });

  it('should not redirect if logout fails', async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValueOnce(false);

    render(
      <SidebarProvider>
        <NavUser />
      </SidebarProvider>,
    );

    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    // Wait a bit to ensure no redirect happens
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
