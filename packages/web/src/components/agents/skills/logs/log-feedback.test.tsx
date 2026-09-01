import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The thumbs on a log: one verdict per log, the other thumb replaces it,
 * the same thumb withdraws it. The server does the special part (re-running
 * the evaluations); what matters here is the score each press sends.
 */

const getFeedback = vi.fn();
const createFeedback = vi.fn();
const deleteFeedback = vi.fn();

vi.mock('@web/api/v1/super-agents/feedbacks', () => ({
  getFeedback: (...args: unknown[]) => getFeedback(...args),
  createFeedback: (...args: unknown[]) => createFeedback(...args),
  deleteFeedback: (...args: unknown[]) => deleteFeedback(...args),
}));

const toast = vi.fn();
vi.mock('@web/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

import { LogFeedback } from '@web/components/agents/skills/logs/log-feedback';

const renderFeedback = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LogFeedback logId="log-1" />
    </QueryClientProvider>,
  );
};

describe('LogFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a thumbs down as score 0', async () => {
    getFeedback.mockResolvedValue([]);
    createFeedback.mockResolvedValue({ id: 'feedback-1', score: 0 });

    renderFeedback();
    fireEvent.click(screen.getByLabelText('Bad output'));

    await waitFor(() => {
      expect(createFeedback).toHaveBeenCalledWith({
        log_id: 'log-1',
        score: 0,
      });
    });
    expect(deleteFeedback).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Marked as a bad output' }),
    );
  });

  it('replaces the opposite verdict', async () => {
    getFeedback.mockResolvedValue([
      { id: 'feedback-1', log_id: 'log-1', score: 0 },
    ]);
    createFeedback.mockResolvedValue({ id: 'feedback-2', score: 1 });

    renderFeedback();
    // Wait for the existing verdict to render before pressing
    await waitFor(() => {
      expect(screen.getByLabelText('Bad output')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
    fireEvent.click(screen.getByLabelText('Good output'));

    await waitFor(() => {
      expect(createFeedback).toHaveBeenCalledWith({
        log_id: 'log-1',
        score: 1,
      });
    });
    expect(deleteFeedback).toHaveBeenCalledWith('feedback-1');
  });

  it('withdraws the verdict when the same thumb is pressed again', async () => {
    getFeedback.mockResolvedValue([
      { id: 'feedback-1', log_id: 'log-1', score: 1 },
    ]);

    renderFeedback();
    await waitFor(() => {
      expect(screen.getByLabelText('Good output')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
    fireEvent.click(screen.getByLabelText('Good output'));

    await waitFor(() => {
      expect(deleteFeedback).toHaveBeenCalledWith('feedback-1');
    });
    expect(createFeedback).not.toHaveBeenCalled();
  });
});
