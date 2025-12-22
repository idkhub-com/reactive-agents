import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock navigate function using vi.hoisted
const mockNavigate = vi.hoisted(() => vi.fn());

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

// Import the hook AFTER mocking
import {
  type PermissiveNavigateOptions,
  usePermissiveNavigate,
} from '@web/hooks/use-permissive-navigate';

describe('usePermissiveNavigate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a navigate function', () => {
    const { result } = renderHook(() => usePermissiveNavigate());

    expect(typeof result.current).toBe('function');
  });

  it('calls navigate with basic path', () => {
    const { result } = renderHook(() => usePermissiveNavigate());

    result.current({ to: '/agents' });

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/agents' });
  });

  it('calls navigate with path and replace option', () => {
    const { result } = renderHook(() => usePermissiveNavigate());

    result.current({ to: '/settings', replace: true });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/settings',
      replace: true,
    });
  });

  it('calls navigate with path and search params', () => {
    const { result } = renderHook(() => usePermissiveNavigate());

    const options: PermissiveNavigateOptions = {
      to: '/agents',
      search: { filter: 'active', page: 1 },
    };

    result.current(options);

    expect(mockNavigate).toHaveBeenCalledWith(options);
  });

  it('calls navigate with path and route params', () => {
    const { result } = renderHook(() => usePermissiveNavigate());

    const options: PermissiveNavigateOptions = {
      to: '/agents/$agentName',
      params: { agentName: 'Test%20Agent' },
    };

    result.current(options);

    expect(mockNavigate).toHaveBeenCalledWith(options);
  });

  it('calls navigate with all options combined', () => {
    const { result } = renderHook(() => usePermissiveNavigate());

    const options: PermissiveNavigateOptions = {
      to: '/agents/$agentName/skills/$skillName',
      params: { agentName: 'Agent1', skillName: 'Skill1' },
      search: { tab: 'logs' },
      replace: true,
    };

    result.current(options);

    expect(mockNavigate).toHaveBeenCalledWith(options);
  });

  it('allows any string path (permissive typing)', () => {
    const { result } = renderHook(() => usePermissiveNavigate());

    // This should work without TypeScript errors due to permissive typing
    result.current({ to: '/any/arbitrary/path/that/might/not/exist' });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/any/arbitrary/path/that/might/not/exist',
    });
  });

  it('maintains function reference stability across renders', () => {
    const { result, rerender } = renderHook(() => usePermissiveNavigate());

    const firstRender = result.current;
    rerender();
    const secondRender = result.current;

    // The navigate function from useNavigate should be stable
    expect(firstRender).toBe(secondRender);
  });
});
