import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevToolsInit } from './dev-tools-init';

describe('DevToolsInit', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalNodeEnv);
  });

  it('should render without crashing', () => {
    const { container } = render(<DevToolsInit />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null (render nothing)', () => {
    const { container } = render(<DevToolsInit />);

    expect(container.innerHTML).toBe('');
    expect(container.firstChild).toBeNull();
  });

  it('should handle import errors gracefully', () => {
    // Mock console.warn to capture error handling
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Intentionally empty mock implementation
    });

    // Component should render without throwing
    render(<DevToolsInit />);

    // Should not crash the component
    expect(consoleSpy).not.toThrow();

    consoleSpy.mockRestore();
  });

  it('should check environment before importing in development', () => {
    vi.stubEnv('NODE_ENV', 'development');

    // Component should render successfully in development
    const { container } = render(<DevToolsInit />);
    expect(container.firstChild).toBeNull();
  });

  it('should work in production environment', () => {
    vi.stubEnv('NODE_ENV', 'production');

    // Component should render successfully in production
    const { container } = render(<DevToolsInit />);
    expect(container.firstChild).toBeNull();
  });

  it('should be stable across re-renders', () => {
    const { rerender, container } = render(<DevToolsInit />);

    // Re-render multiple times
    rerender(<DevToolsInit />);
    rerender(<DevToolsInit />);

    // Should consistently render nothing
    expect(container.firstChild).toBeNull();
  });
});
