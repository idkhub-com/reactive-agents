import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PipelineErrorBoundary,
  withPipelineErrorBoundary,
} from './pipeline-error-boundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Component rendered successfully</div>;
};

// Component for testing HOC
const TestComponent: React.FC = () => {
  return <div>Test Component</div>;
};

describe('PipelineErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty to suppress console errors in tests
    });
  });

  it('renders children when there is no error', () => {
    render(
      <PipelineErrorBoundary>
        <ThrowError shouldThrow={false} />
      </PipelineErrorBoundary>,
    );

    expect(
      screen.getByText('Component rendered successfully'),
    ).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <PipelineErrorBoundary sectionName="Test Section">
        <ThrowError shouldThrow={true} />
      </PipelineErrorBoundary>,
    );

    expect(screen.getByText(/Error in Test Section/)).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('resets error state when Try Again is clicked', () => {
    let shouldThrow = true;

    const DynamicComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Component rendered successfully</div>;
    };

    render(
      <PipelineErrorBoundary sectionName="Test Section">
        <DynamicComponent />
      </PipelineErrorBoundary>,
    );

    expect(screen.getByText(/Error in Test Section/)).toBeInTheDocument();

    // Click Try Again - this should reset the error boundary
    shouldThrow = false; // Component won't throw on next render
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    // After clicking Try Again, the component should render successfully
    expect(
      screen.getByText('Component rendered successfully'),
    ).toBeInTheDocument();
  });

  it('uses custom fallback when provided', () => {
    const customFallback = (error: Error, resetError: () => void) => (
      <div>
        <p>Custom error: {error.message}</p>
        <button type="button" onClick={resetError}>
          Custom Reset
        </button>
      </div>
    );

    render(
      <PipelineErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </PipelineErrorBoundary>,
    );

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom Reset')).toBeInTheDocument();
  });

  it('logs error to console', () => {
    render(
      <PipelineErrorBoundary sectionName="Test Section">
        <ThrowError shouldThrow={true} />
      </PipelineErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      'Pipeline section error:',
      expect.objectContaining({
        section: 'Test Section',
        error: 'Error: Test error',
        timestamp: expect.any(String),
      }),
    );
  });

  it('marks performance when error occurs', () => {
    const performanceMark = vi.spyOn(performance, 'mark');

    render(
      <PipelineErrorBoundary sectionName="Test Section">
        <ThrowError shouldThrow={true} />
      </PipelineErrorBoundary>,
    );

    expect(performanceMark).toHaveBeenCalledWith('pipeline-error-Test Section');
  });

  it('shows error details in development mode', () => {
    // Mock NODE_ENV for test
    vi.stubEnv('NODE_ENV', 'development');

    render(
      <PipelineErrorBoundary sectionName="Test Section">
        <ThrowError shouldThrow={true} />
      </PipelineErrorBoundary>,
    );

    expect(
      screen.getByText('Error Details (Development Only)'),
    ).toBeInTheDocument();

    vi.unstubAllEnvs();
  });

  it('hides error details in production mode', () => {
    // Mock NODE_ENV for test
    vi.stubEnv('NODE_ENV', 'production');

    render(
      <PipelineErrorBoundary sectionName="Test Section">
        <ThrowError shouldThrow={true} />
      </PipelineErrorBoundary>,
    );

    expect(
      screen.queryByText('Error Details (Development Only)'),
    ).not.toBeInTheDocument();

    vi.unstubAllEnvs();
  });
});

describe('withPipelineErrorBoundary HOC', () => {
  it('wraps component with error boundary', () => {
    const WrappedComponent = withPipelineErrorBoundary(
      TestComponent,
      'Test HOC',
    );

    render(<WrappedComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('catches errors in wrapped component', () => {
    const ErrorComponent: React.FC = () => {
      throw new Error('HOC test error');
    };

    const WrappedComponent = withPipelineErrorBoundary(
      ErrorComponent,
      'Test HOC',
    );

    // Mock console.error to avoid test output noise
    vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty to suppress console errors in tests
    });

    render(<WrappedComponent />);

    expect(screen.getByText(/Error in Test HOC/)).toBeInTheDocument();
  });
});
