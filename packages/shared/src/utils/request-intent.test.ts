import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import { describe, expect, it } from 'vitest';
import { describeRequestIntent } from './request-intent';

const request = (
  functionName: FunctionName,
  requestBody: Record<string, unknown>,
): SuperAgentsRequestData =>
  ({ functionName, requestBody }) as unknown as SuperAgentsRequestData;

describe('describeRequestIntent', () => {
  it('leads with the system prompt and the tool names', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [
        { role: 'system', content: 'You translate.' },
        { role: 'user', content: 'hola' },
      ],
      tools: [
        { type: 'function', function: { name: 'lookup' } },
        { type: 'function', function: { name: 'save' } },
      ],
    });
    expect(describeRequestIntent(data)).toBe(
      'You translate.\n\nTools: lookup, save',
    );
  });

  it('leaves the user message out when there is a system prompt', () => {
    const data = request(FunctionName.STREAM_CHAT_COMPLETE, {
      messages: [
        { role: 'system', content: 'You translate.' },
        { role: 'user', content: 'hola' },
      ],
    });
    expect(describeRequestIntent(data)).toBe('You translate.');
  });

  it('names Responses API tools by name or, for built-ins, by type', () => {
    const data = request(FunctionName.CREATE_MODEL_RESPONSE, {
      instructions: 'Research the topic.',
      input: 'quantum computing',
      tools: [{ type: 'function', name: 'cite' }, { type: 'web_search' }],
    });
    expect(describeRequestIntent(data)).toBe(
      'Research the topic.\n\nTools: cite, web_search',
    );
  });

  it('falls back to the first user message, truncated', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: [{ type: 'text', text: 'a'.repeat(1500) }] },
      ],
    });
    expect(describeRequestIntent(data)).toBe('a'.repeat(1000));
  });

  it('uses a string Responses input as the user message', () => {
    const data = request(FunctionName.CREATE_MODEL_RESPONSE, {
      input: 'summarise this',
    });
    expect(describeRequestIntent(data)).toBe('summarise this');
  });

  it('caps the whole description', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [{ role: 'system', content: 'x'.repeat(10000) }],
    });
    expect(describeRequestIntent(data)).toHaveLength(6000);
  });

  it('returns null when there is nothing to go on', () => {
    expect(
      describeRequestIntent(
        request(FunctionName.CHAT_COMPLETE, {
          messages: [{ role: 'user', content: '' }],
        }),
      ),
    ).toBeNull();
    expect(
      describeRequestIntent(request(FunctionName.EMBED, { input: 'x' })),
    ).toBeNull();
  });
});
