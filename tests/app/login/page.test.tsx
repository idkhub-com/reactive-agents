import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted() to ensure mocks are available in factory functions
const { mockRedirect, mockGetSignInUrl } = vi.hoisted(() => {
  return {
    mockRedirect: vi.fn(),
    mockGetSignInUrl: vi.fn(),
  };
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

// Mock WorkOS AuthKit
vi.mock('@workos-inc/authkit-nextjs', () => ({
  getSignInUrl: mockGetSignInUrl,
}));

import { GET as LoginPageHandler } from '../../../app/login/page';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should get sign in URL and redirect to it', async () => {
    const mockSignInUrl = 'https://workos.com/sign-in';
    mockGetSignInUrl.mockResolvedValue(mockSignInUrl);

    await LoginPageHandler();

    expect(mockGetSignInUrl).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(mockSignInUrl);
  });
});
