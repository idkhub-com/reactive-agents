import { fireEvent, render, screen } from '@testing-library/react';
import { FunctionCallCard } from '@web/components/agents/skills/logs/components/function-call-card';
import { describe, expect, it } from 'vitest';

describe('FunctionCallCard', () => {
  it('names the call, its id and the arguments as sent', () => {
    render(
      <FunctionCallCard
        name="get_weather"
        callId="call_123"
        args='{"location": "San Francisco"}'
      />,
    );

    expect(screen.getByText('Assistant')).toBeInTheDocument();
    expect(screen.getByText('Function Call')).toBeInTheDocument();
    expect(screen.getByText('get_weather')).toBeInTheDocument();
    expect(screen.getByText('call_123')).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes('San Francisco')),
    ).toBeInTheDocument();
  });

  it('formats arguments that arrived as an object', () => {
    render(
      <FunctionCallCard
        name="get_weather"
        callId="call_123"
        args={{ location: 'San Francisco' }}
      />,
    );

    expect(
      screen.getByText((content) =>
        content.includes('"location": "San Francisco"'),
      ),
    ).toBeInTheDocument();
  });

  it('collapses to the call it made', () => {
    render(<FunctionCallCard name="get_weather" callId="call_123" args="{}" />);

    fireEvent.click(screen.getByRole('button', { expanded: true }));

    expect(screen.queryByText('call_123')).not.toBeInTheDocument();
    expect(
      screen.getByText((content) => content.startsWith('get_weather')),
    ).toBeInTheDocument();
  });

  it('tints a call the agent has just made', () => {
    const { container, rerender } = render(
      <FunctionCallCard name="get_weather" callId="call_1" args="{}" />,
    );
    // Replayed from an earlier turn: part of the request, not this answer.
    expect(container.firstElementChild?.className).not.toContain('emerald');

    rerender(
      <FunctionCallCard
        name="get_weather"
        callId="call_1"
        args="{}"
        variant="response"
      />,
    );

    expect(container.firstElementChild?.className).toContain('bg-emerald');
  });
});
