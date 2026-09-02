import type { Log } from '@shared/types/data/log';
import { fireEvent, render, screen } from '@testing-library/react';
import { LogNavigation } from '@web/components/agents/skills/logs/log-navigation';
import { describe, expect, it, vi } from 'vitest';

const log = (id: string): Log => ({ id }) as Log;

describe('LogNavigation', () => {
  it('steps to the newer log as previous and the older log as next', () => {
    const onNavigate = vi.fn();
    render(
      <LogNavigation
        newerLog={log('newer')}
        olderLog={log('older')}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByLabelText('Previous log'));
    expect(onNavigate).toHaveBeenLastCalledWith(log('newer'));

    fireEvent.click(screen.getByLabelText('Next log'));
    expect(onNavigate).toHaveBeenLastCalledWith(log('older'));
  });

  it('disables a side that has no log', () => {
    render(<LogNavigation olderLog={log('older')} onNavigate={vi.fn()} />);

    expect(screen.getByLabelText('Previous log')).toBeDisabled();
    expect(screen.getByLabelText('Next log')).toBeEnabled();
  });
});
