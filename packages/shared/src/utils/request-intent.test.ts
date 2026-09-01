import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import { describe, expect, it } from 'vitest';
import {
  describeRequestIntent,
  identityText,
  intentText,
  SYSTEM_PROMPT_BUDGET,
} from './request-intent';

const request = (
  functionName: FunctionName,
  requestBody: Record<string, unknown>,
): SuperAgentsRequestData =>
  ({ functionName, requestBody }) as unknown as SuperAgentsRequestData;

describe('describeRequestIntent', () => {
  it('splits identity from conversation', () => {
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
    expect(describeRequestIntent(data)).toEqual({
      systemPrompt: 'You translate.',
      tools: 'Tools: lookup, save',
      conversation: 'User: hola',
    });
  });

  it('keeps the last messages of a long conversation, not the first', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [
        { role: 'user', content: 'turn 1' },
        { role: 'assistant', content: 'answer 1' },
        { role: 'user', content: 'turn 2' },
        { role: 'assistant', content: 'answer 2' },
        { role: 'user', content: 'turn 3' },
        { role: 'assistant', content: 'answer 3' },
        { role: 'user', content: 'turn 4' },
      ],
    });
    const intent = describeRequestIntent(data);
    expect(intent?.conversation).not.toContain('turn 1');
    expect(intent?.conversation).toContain('User: turn 2');
    expect(intent?.conversation).toContain('User: turn 4');
  });

  it('renders tool calls and tool outputs', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [
        { role: 'user', content: 'list the files' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              type: 'function',
              function: { name: 'ls', arguments: '{"path":"."}' },
            },
          ],
        },
        { role: 'tool', content: 'a.txt\nb.txt' },
      ],
    });
    const intent = describeRequestIntent(data);
    expect(intent?.conversation).toContain(
      'Assistant tool calls: ls({"path":"."})',
    );
    expect(intent?.conversation).toContain('Tool output: a.txt\nb.txt');
  });

  it('names Responses API tools by name or, for built-ins, by type', () => {
    const data = request(FunctionName.CREATE_MODEL_RESPONSE, {
      instructions: 'Research the topic.',
      input: 'quantum computing',
      tools: [{ type: 'function', name: 'cite' }, { type: 'web_search' }],
    });
    expect(describeRequestIntent(data)).toEqual({
      systemPrompt: 'Research the topic.',
      tools: 'Tools: cite, web_search',
      conversation: 'User: quantum computing',
    });
  });

  it('keeps the system prompt whole, for compaction to budget later', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [{ role: 'system', content: 'x'.repeat(10000) }],
    });
    const intent = describeRequestIntent(data);
    expect(intent?.systemPrompt).toHaveLength(10000);
    expect(intent?.conversation).toBeNull();
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

describe('identityText', () => {
  it('cuts the prompt to its budget when no compacted form is given', () => {
    const identity = identityText({
      systemPrompt: 'x'.repeat(10000),
      tools: 'Tools: a',
      conversation: null,
    });
    expect(identity).toBe(`${'x'.repeat(SYSTEM_PROMPT_BUDGET)}\n\nTools: a`);
  });

  it('prefers the compacted prompt', () => {
    const identity = identityText(
      { systemPrompt: 'x'.repeat(10000), tools: null, conversation: null },
      'a translator',
    );
    expect(identity).toBe('a translator');
  });

  it('is null for a request with neither prompt nor tools', () => {
    expect(
      identityText({
        systemPrompt: null,
        tools: null,
        conversation: 'User: hi',
      }),
    ).toBeNull();
  });
});

describe('intentText', () => {
  it('joins the parts into one description', () => {
    expect(
      intentText({
        systemPrompt: 'You translate.',
        tools: 'Tools: lookup',
        conversation: 'User: hola',
      }),
    ).toBe('You translate.\n\nTools: lookup\n\nUser: hola');
  });
});
