import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The thumbs on a log: one verdict per log, the other thumb replaces it,
 * and the thumb already holding the verdict re-opens its note to edit or
 * withdraw. A thumb opens a composer instead of writing, so the optional
 * reason rides along on the same write -- the server re-runs every judge on
 * each one. What matters here is the score and reason each save sends.
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

  it('sends a thumbs down as score 0 with no reason typed', async () => {
    getFeedback.mockResolvedValue([]);
    createFeedback.mockResolvedValue({ id: 'feedback-1', score: 0 });

    renderFeedback();
    fireEvent.click(screen.getByLabelText('Bad output'));
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

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

  it('sends the typed reason alongside the verdict', async () => {
    getFeedback.mockResolvedValue([]);
    createFeedback.mockResolvedValue({
      id: 'feedback-1',
      score: 0,
      feedback: 'It invented the citation.',
    });

    renderFeedback();
    fireEvent.click(screen.getByLabelText('Bad output'));
    fireEvent.change(await screen.findByLabelText('Reason for this verdict'), {
      target: { value: '  It invented the citation.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(createFeedback).toHaveBeenCalledWith({
        log_id: 'log-1',
        score: 0,
        feedback: 'It invented the citation.',
      });
    });
  });

  it('opens the current verdict prefilled with its saved reason', async () => {
    getFeedback.mockResolvedValue([
      {
        id: 'feedback-1',
        log_id: 'log-1',
        score: 1,
        feedback: 'Nailed the tone.',
      },
    ]);
    createFeedback.mockResolvedValue({ id: 'feedback-2', score: 1 });

    renderFeedback();
    await waitFor(() => {
      expect(screen.getByLabelText('Good output')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
    fireEvent.click(screen.getByLabelText('Good output'));

    const textarea = await screen.findByLabelText('Reason for this verdict');
    expect(textarea).toHaveValue('Nailed the tone.');
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
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(createFeedback).toHaveBeenCalledWith({
        log_id: 'log-1',
        score: 1,
      });
    });
    expect(deleteFeedback).toHaveBeenCalledWith('feedback-1');
  });

  it('withdraws the verdict from the composer', async () => {
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
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(deleteFeedback).toHaveBeenCalledWith('feedback-1');
    });
    expect(createFeedback).not.toHaveBeenCalled();
  });
});
