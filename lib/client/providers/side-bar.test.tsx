'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SidebarProvider, useSidebar } from './side-bar';

// Mock the useIsMobile hook
vi.mock('../hooks/use-mobile', () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

// Create a test component that uses the useSidebar hook
function TestComponent(): React.ReactElement {
  const {
    state,
    open,
    setOpen,
    toggleSidebar,
    openedSections,
    setOpenedSections,
  } = useSidebar();

  return (
    <div>
      <div data-testid="sidebar-state">{state}</div>
      <div data-testid="sidebar-open">{open.toString()}</div>
      <button
        type="button"
        data-testid="toggle-button"
        onClick={(): void => toggleSidebar()}
      >
        Toggle
      </button>
      <button
        type="button"
        data-testid="set-open-button"
        onClick={(): void => setOpen(!open)}
      >
        Set Open
      </button>
      <div data-testid="opened-sections">{openedSections.join(',')}</div>
      <button
        type="button"
        data-testid="add-section-button"
        onClick={(): void =>
          setOpenedSections([...openedSections, 'new-section'])
        }
      >
        Add Section
      </button>
    </div>
  );
}

describe('SidebarProvider', (): void => {
  // Mock document.cookie
  let documentCookieSpy: ReturnType<typeof vi.spyOn>;

  beforeEach((): void => {
    // Mock document.cookie getter and setter
    const cookieStore: Record<string, string> = {};
    documentCookieSpy = vi
      .spyOn(document, 'cookie', 'set')
      .mockImplementation((value: string): string => {
        const [cookieRaw] = value.split(';');
        const [key, val] = cookieRaw.split('=');
        cookieStore[key] = val;
        return value;
      });
  });

  afterEach((): void => {
    vi.clearAllMocks();
    documentCookieSpy.mockRestore();
  });

  it('initializes with default values', (): void => {
    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('sidebar-state').textContent).toBe('expanded');
    expect(screen.getByTestId('sidebar-open').textContent).toBe('true');
    expect(screen.getByTestId('opened-sections').textContent).toBe('');
  });

  it('initializes with custom defaultOpen value', (): void => {
    render(
      <SidebarProvider defaultOpen={false}>
        <TestComponent />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('sidebar-state').textContent).toBe('collapsed');
    expect(screen.getByTestId('sidebar-open').textContent).toBe('false');
  });

  it('toggles sidebar state when toggle button is clicked', (): void => {
    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('sidebar-open').textContent).toBe('true');

    fireEvent.click(screen.getByTestId('toggle-button'));

    expect(screen.getByTestId('sidebar-open').textContent).toBe('false');
    expect(screen.getByTestId('sidebar-state').textContent).toBe('collapsed');
    expect(documentCookieSpy).toHaveBeenCalled();
  });

  it('sets open state directly', (): void => {
    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('sidebar-open').textContent).toBe('true');

    fireEvent.click(screen.getByTestId('set-open-button'));

    expect(screen.getByTestId('sidebar-open').textContent).toBe('false');
    expect(documentCookieSpy).toHaveBeenCalled();
  });

  it('updates openedSections state', (): void => {
    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('opened-sections').textContent).toBe('');

    fireEvent.click(screen.getByTestId('add-section-button'));

    expect(screen.getByTestId('opened-sections').textContent).toBe(
      'new-section',
    );
  });

  it('responds to keyboard shortcut', (): void => {
    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('sidebar-open').textContent).toBe('true');

    // Simulate pressing Ctrl+B
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });

    expect(screen.getByTestId('sidebar-open').textContent).toBe('false');
  });

  it('uses controlled open state when provided', (): void => {
    const onOpenChange = vi.fn();

    render(
      <SidebarProvider open={false} onOpenChange={onOpenChange}>
        <TestComponent />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('sidebar-open').textContent).toBe('false');

    fireEvent.click(screen.getByTestId('toggle-button'));

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it('throws error when useSidebar is used outside provider', (): void => {
    // Suppress console errors for this test
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation((): void => {
        // Intentionally empty to suppress console errors
      });

    expect(() => render(<TestComponent />)).toThrow(
      'useSidebar must be used within a SidebarProvider',
    );

    consoleErrorSpy.mockRestore();
  });
});
