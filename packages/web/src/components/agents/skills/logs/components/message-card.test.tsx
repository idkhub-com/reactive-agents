import { fireEvent, render, screen } from '@testing-library/react';
import {
  MessageCard,
  previewOf,
} from '@web/components/agents/skills/logs/components/message-card';
import { describe, expect, it, vi } from 'vitest';

const body = <div>the body</div>;

describe('previewOf', () => {
  it('collapses a multi-line body onto one line', () => {
    expect(previewOf('You are a\n\n  helpful   assistant.\n')).toBe(
      'You are a helpful assistant.',
    );
  });

  it('cuts a prompt far too long to stand in a header', () => {
    expect(previewOf('x'.repeat(5000))).toHaveLength(200);
  });
});

describe('MessageCard', () => {
  it('shows the label, the kind and the body', () => {
    render(
      <MessageCard label={<span>System</span>} kind="Text">
        {body}
      </MessageCard>,
    );

    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('the body')).toBeInTheDocument();
  });

  it('collapses the body away, leaving a preview of it', () => {
    render(
      <MessageCard label={<span>System</span>} preview="You are a concierge.">
        {body}
      </MessageCard>,
    );

    // Expanded, the preview would only repeat what is already on screen.
    expect(screen.queryByText('You are a concierge.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { expanded: true }));

    expect(screen.queryByText('the body')).not.toBeInTheDocument();
    expect(screen.getByText('You are a concierge.')).toBeInTheDocument();
  });

  it('opens a card that started collapsed', () => {
    render(
      <MessageCard label={<span>Original system prompt</span>} defaultCollapsed>
        {body}
      </MessageCard>,
    );

    expect(screen.queryByText('the body')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { expanded: false }));

    expect(screen.getByText('the body')).toBeInTheDocument();
  });

  it('copies the body without collapsing the card', () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <MessageCard label={<span>System</span>} copyValue="the whole prompt">
        {body}
      </MessageCard>,
    );

    // The copy button is the one that is not the collapse toggle.
    const [, copy] = screen.getAllByRole('button');
    fireEvent.click(copy);

    expect(writeText).toHaveBeenCalledWith('the whole prompt');
    expect(screen.getByText('the body')).toBeInTheDocument();
  });

  it('offers no copy button when there is nothing to copy', () => {
    render(<MessageCard label={<span>System</span>}>{body}</MessageCard>);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it("tints the agent's own answer apart from the messages sent to it", () => {
    const { container, rerender } = render(
      <MessageCard label={<span>Assistant</span>}>{body}</MessageCard>,
    );
    const plain = container.firstElementChild;
    expect(plain).toHaveClass('bg-card');
    expect(plain?.className).not.toContain('emerald');

    rerender(
      <MessageCard label={<span>Assistant</span>} variant="response">
        {body}
      </MessageCard>,
    );

    expect(container.firstElementChild?.className).toContain('bg-emerald');
  });

  it('keeps the header extra with the header, and hides it when collapsed', () => {
    render(
      <MessageCard
        label={<span>Assistant</span>}
        headerExtra={<span>schema is not valid</span>}
      >
        {body}
      </MessageCard>,
    );
    expect(screen.getByText('schema is not valid')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { expanded: true }));

    expect(screen.queryByText('schema is not valid')).not.toBeInTheDocument();
  });
});
