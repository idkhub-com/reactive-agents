import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import { FunctionName } from '@shared/types/api/request/function-name';
import type { ErrorResponseBody } from '@shared/types/api/response';
import type { CompletionResponseBody } from '@shared/types/api/routes/completions-api';
import type { LogResponseBodyError } from '@shared/types/data';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-themes', () => ({
  useTheme: vi.fn(() => ({ resolvedTheme: 'light' })),
}));

interface GenericViewerProps {
  children: React.ReactNode;
  defaultValue: string;
  variant?: string;
}

// `variant` is surfaced because it is what gives the agent's own answer its
// background, whatever shape that answer arrived in.
vi.mock('@web/components/agents/skills/logs/components/generic-viewer', () => ({
  GenericViewer: ({ children, defaultValue, variant }: GenericViewerProps) => (
    <div data-testid="generic-viewer" data-variant={variant}>
      {children}
      <div data-testid="viewer-content">{defaultValue}</div>
    </div>
  ),
}));

import { CompletionViewer } from '@web/components/agents/skills/logs/components/completion-viewer/completion-viewer';
import { CompletionsAPIViewer } from '@web/components/agents/skills/logs/components/completion-viewer/completions-api';
import { ErrorResponseViewer } from '@web/components/agents/skills/logs/components/completion-viewer/error-response-viewer';
import { LogResponseBodyErrorViewer } from '@web/components/agents/skills/logs/components/completion-viewer/log-response-body-error';

const asRequestData = (
  functionName: FunctionName,
  responseBody: unknown,
): SuperAgentsRequestData =>
  ({
    functionName,
    requestBody: { model: 'gpt-4' },
    responseBody,
  }) as unknown as SuperAgentsRequestData;

describe('CompletionsAPIViewer', () => {
  it('marks a text completion as the response', () => {
    render(
      <CompletionsAPIViewer
        logId="test-log"
        saResponseBody={
          { choices: [{ text: 'Two.' }] } as CompletionResponseBody
        }
      />,
    );

    expect(screen.getByTestId('viewer-content')).toHaveTextContent('Two.');
    expect(screen.getByTestId('generic-viewer')).toHaveAttribute(
      'data-variant',
      'response',
    );
  });
});

describe('ErrorResponseViewer', () => {
  it('marks what came back instead of an answer as the response', () => {
    render(
      <ErrorResponseViewer
        logId="test-log"
        response={{ error: { message: 'rate limited' } } as ErrorResponseBody}
      />,
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByTestId('viewer-content')).toHaveTextContent(
      'rate limited',
    );
    expect(screen.getByTestId('generic-viewer')).toHaveAttribute(
      'data-variant',
      'response',
    );
  });
});

describe('LogResponseBodyErrorViewer', () => {
  it('shows the recorded failure and the body it came with', () => {
    render(
      <LogResponseBodyErrorViewer
        logId="test-log"
        response={
          {
            message: 'the provider refused',
            response: '{"error":"nope"}',
          } as LogResponseBodyError
        }
      />,
    );

    expect(screen.getByTestId('viewer-content')).toHaveTextContent(
      'the provider refused',
    );
    expect(screen.getByTestId('viewer-content')).toHaveTextContent(
      '{"error":"nope"}',
    );
    expect(screen.getByTestId('generic-viewer')).toHaveAttribute(
      'data-variant',
      'response',
    );
  });
});

describe('CompletionViewer', () => {
  it('says so when the request never got an answer', () => {
    render(
      <CompletionViewer
        logId="test-log"
        saRequestData={asRequestData(FunctionName.CHAT_COMPLETE, null)}
      />,
    );

    expect(screen.getByText('No response body found.')).toBeInTheDocument();
  });

  it('reads a text completion through its own viewer', () => {
    render(
      <CompletionViewer
        logId="test-log"
        saRequestData={asRequestData(FunctionName.COMPLETE, {
          choices: [{ text: 'Two.' }],
        })}
      />,
    );

    expect(screen.getByTestId('viewer-content')).toHaveTextContent('Two.');
  });

  it('shows a generated image rather than a body', () => {
    render(
      <CompletionViewer
        logId="test-log"
        saRequestData={asRequestData(FunctionName.GENERATE_IMAGE, {
          data: [{ url: 'https://example.test/cat.png' }],
        })}
      />,
    );

    expect(screen.getByAltText('Generated content')).toHaveAttribute(
      'src',
      'https://example.test/cat.png',
    );
  });

  it('falls back for a function with no exchange to render', () => {
    render(
      <CompletionViewer
        logId="test-log"
        saRequestData={asRequestData(FunctionName.MODERATE, { results: [] })}
      />,
    );

    expect(screen.getByText('Moderation')).toBeInTheDocument();
  });
});
