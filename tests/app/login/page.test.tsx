import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock AnimatedLogo component
vi.mock('@client/components/side-bar/animated-logo', () => ({
  AnimatedLogo: ({ isCollapsed }: { isCollapsed: boolean }) => (
    <div data-testid="animated-logo" data-collapsed={isCollapsed}>
      {isCollapsed ? 'RA' : 'Reactive Agents'}
    </div>
  ),
}));

// Mock fetch
global.fetch = vi.fn();

import { redirect } from 'next/navigation';
import LoginPage from '../../../app/login/page';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the login form', () => {
      render(<LoginPage />);

      expect(
        screen.getByText(/enter password to continue/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /login/i }),
      ).toBeInTheDocument();
    });

    it('should render AnimatedLogo in expanded state', () => {
      render(<LoginPage />);

      const logo = screen.getByTestId('animated-logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('data-collapsed', 'false');
      expect(logo).toHaveTextContent('Reactive Agents');
    });

    it('should render password input with correct placeholder', () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'off');
      expect(passwordInput).toHaveAttribute(
        'placeholder',
        'Default: reactive-agents',
      );
    });
  });

  describe('Form Submission', () => {
    it('should call login API with correct payload on form submission', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(passwordInput, 'test-password');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/v1/reactive-agents/auth/login'),
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            body: JSON.stringify({ password: 'test-password' }),
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );
      });
    });

    it('should redirect to home page on successful login', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(passwordInput, 'correct-password');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(redirect).toHaveBeenCalledWith('/');
      });
    });

    it('should display error message on invalid password', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(passwordInput, 'wrong-password');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
      });
    });

    it('should not redirect on failed login', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(passwordInput, 'wrong-password');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
      });

      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should clear error message when user starts typing', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      render(<LoginPage />);

      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: /login/i });

      // First submission with wrong password
      await userEvent.type(passwordInput, 'wrong-password');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid password')).toBeInTheDocument();
      });

      // Clear and type again
      await userEvent.clear(passwordInput);
      await userEvent.type(passwordInput, 'n');

      await waitFor(() => {
        expect(screen.queryByText('Invalid password')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should require password field to be non-empty', async () => {
      render(<LoginPage />);

      const submitButton = screen.getByRole('button', { name: /login/i });
      await userEvent.click(submitButton);

      // Form should not submit with empty password
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
