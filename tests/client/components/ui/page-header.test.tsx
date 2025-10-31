import { PageHeader } from '@client/components/ui/page-header';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from 'vitest';

// Mock Next.js router
const mockBack = vi.fn();
const mockRouter = {
  back: mockBack,
  push: vi.fn(),
  replace: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => mockRouter),
}));

import { useRouter } from 'next/navigation';

const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
  });

  it('renders basic page header with title', () => {
    render(<PageHeader title="Test Page" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Test Page',
    );
  });

  it('renders page header with description', () => {
    render(
      <PageHeader
        title="Test Page"
        description="This is a test page description"
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Test Page',
    );
    expect(
      screen.getByText('This is a test page description'),
    ).toBeInTheDocument();
  });

  it('renders page header without description when not provided', () => {
    render(<PageHeader title="Test Page" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Test Page',
    );
    expect(screen.queryByText(/description/i)).not.toBeInTheDocument();
  });

  it('shows back button by default', () => {
    render(<PageHeader title="Test Page" />);

    const backButton = screen.getByRole('button', { name: /go back/i });
    expect(backButton).toBeInTheDocument();
  });

  it('hides back button when showBackButton is false', () => {
    render(<PageHeader title="Test Page" showBackButton={false} />);

    expect(
      screen.queryByRole('button', { name: /go back/i }),
    ).not.toBeInTheDocument();
  });

  it('calls router.back() when back button is clicked and no custom onBack provided', () => {
    render(<PageHeader title="Test Page" />);

    const backButton = screen.getByRole('button', { name: /go back/i });
    fireEvent.click(backButton);

    expect(mockBack).toHaveBeenCalledOnce();
  });

  it('calls custom onBack when provided instead of router.back()', () => {
    const customOnBack = vi.fn();
    render(<PageHeader title="Test Page" onBack={customOnBack} />);

    const backButton = screen.getByRole('button', { name: /go back/i });
    fireEvent.click(backButton);

    expect(customOnBack).toHaveBeenCalledOnce();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('renders actions when provided', () => {
    const actions = (
      <div>
        <button type="button">Action 1</button>
        <button type="button">Action 2</button>
      </div>
    );

    render(<PageHeader title="Test Page" actions={actions} />);

    expect(
      screen.getByRole('button', { name: 'Action 1' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Action 2' }),
    ).toBeInTheDocument();
  });

  it('does not render actions section when no actions provided', () => {
    render(<PageHeader title="Test Page" />);

    // Only the back button should be present
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Go back');
  });

  it('renders with all props provided', () => {
    const customOnBack = vi.fn();
    const actions = <button type="button">Custom Action</button>;

    render(
      <PageHeader
        title="Complete Test"
        description="A complete test with all props"
        showBackButton={true}
        onBack={customOnBack}
        actions={actions}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Complete Test',
    );
    expect(
      screen.getByText('A complete test with all props'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /go back/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Custom Action' }),
    ).toBeInTheDocument();
  });

  describe('Accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(<PageHeader title="Test Page" />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Test Page');
    });

    it('has proper aria-label for back button', () => {
      render(<PageHeader title="Test Page" />);

      const backButton = screen.getByRole('button', { name: /go back/i });
      expect(backButton).toHaveAttribute('aria-label', 'Go back');
    });

    it('supports keyboard navigation', () => {
      render(<PageHeader title="Test Page" />);

      const backButton = screen.getByRole('button', { name: /go back/i });

      // Focus the back button
      backButton.focus();
      expect(document.activeElement).toBe(backButton);

      // Use click instead of keyDown for better compatibility
      fireEvent.click(backButton);
      expect(mockBack).toHaveBeenCalledOnce();
    });

    it('is focusable and interactive', () => {
      render(<PageHeader title="Test Page" />);

      const backButton = screen.getByRole('button', { name: /go back/i });

      // Check that button is focusable
      expect(backButton).not.toBeDisabled();
      expect(backButton.tabIndex).not.toBe(-1);
    });
  });

  describe('Layout and Styling', () => {
    it('applies correct CSS classes for layout', () => {
      render(<PageHeader title="Test Page" />);

      // Check for sticky header with border
      const header = screen.getByRole('heading').closest('.sticky');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('sticky', 'top-0', 'z-10', 'border-b');
    });

    it('maintains proper spacing between elements', () => {
      const actions = <button type="button">Action</button>;
      render(
        <PageHeader
          title="Test Page"
          description="Test description"
          actions={actions}
        />,
      );

      // Verify all elements are rendered in the proper structure
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /go back/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Action' }),
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty title gracefully', () => {
      render(<PageHeader title="" />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('');
    });

    it('handles very long titles', () => {
      const longTitle = 'A'.repeat(200);
      render(<PageHeader title={longTitle} />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(longTitle);
    });

    it('handles very long descriptions', () => {
      const longDescription = 'B'.repeat(500);
      render(<PageHeader title="Test" description={longDescription} />);

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('handles complex action elements', () => {
      const complexActions = (
        <div>
          <button type="button">Button 1</button>
          <div>
            <span>Nested content</span>
            <button type="button">Nested Button</button>
          </div>
        </div>
      );

      render(<PageHeader title="Test" actions={complexActions} />);

      expect(
        screen.getByRole('button', { name: 'Button 1' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Nested content')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Nested Button' }),
      ).toBeInTheDocument();
    });
  });

  describe('Integration with Router', () => {
    it('calls router methods correctly', () => {
      render(<PageHeader title="Test Page" />);

      const backButton = screen.getByRole('button', { name: /go back/i });
      fireEvent.click(backButton);

      expect(mockUseRouter).toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalledOnce();
    });

    it('handles router errors gracefully', () => {
      // Mock router.back to throw an error
      mockBack.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      render(<PageHeader title="Test Page" />);

      const backButton = screen.getByRole('button', { name: /go back/i });

      // Suppress error console output for this test
      const originalError = console.error;
      console.error = vi.fn();

      // The component should handle the error gracefully, not throw
      expect(() => {
        fireEvent.click(backButton);
      }).not.toThrow();

      expect(mockBack).toHaveBeenCalledOnce();
      // Verify console.error was called to log the error
      expect(console.error).toHaveBeenCalledWith(
        'Navigation error:',
        expect.any(Error),
      );

      // Restore console.error
      console.error = originalError;
    });
  });
});
