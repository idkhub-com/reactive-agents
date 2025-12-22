import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavUser } from '@web/components/side-bar/nav-user';
import { API_URL } from '@web/constants';
import { SidebarProvider } from '@web/providers/side-bar';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock navigate using vi.hoisted
const { mockNavigate } = vi.hoisted(() => {
  return {
    mockNavigate: vi.fn(),
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

// Mock fetch
global.fetch = vi.fn();

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
    mockNavigate.mockClear();
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

  it('should call logout endpoint when button is clicked', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Logged out' }),
    } as Response);

    render(
      <SidebarProvider>
        <NavUser />
      </SidebarProvider>,
    );

    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    const expectedUrl = `${API_URL}/v1/reactive-agents/auth/logout`;
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
      }),
    );
  });

  it('should redirect to login page on successful logout', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Logged out' }),
    } as Response);

    render(
      <SidebarProvider>
        <NavUser />
      </SidebarProvider>,
    );

    const button = screen.getByRole('button', { name: /log out/i });
    await user.click(button);

    // Wait for async operations to complete
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });
  });

  it('should not redirect if logout fails', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Logout failed' }),
    } as Response);

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
