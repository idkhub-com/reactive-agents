import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import { describe, expect, it } from 'vitest';
import { extractSystemPrompt } from './system-prompt';

const request = (
  functionName: FunctionName,
  requestBody: Record<string, unknown>,
): SuperAgentsRequestData =>
  ({ functionName, requestBody }) as unknown as SuperAgentsRequestData;

describe('extractSystemPrompt', () => {
  it('reads the system message of a chat completion', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [
        { role: 'system', content: 'You are terse.' },
        { role: 'user', content: 'Hi' },
      ],
    });
    expect(extractSystemPrompt(data)).toBe('You are terse.');
  });

  it('accepts developer messages and content parts', () => {
    const data = request(FunctionName.STREAM_CHAT_COMPLETE, {
      messages: [
        {
          role: 'developer',
          content: [
            { type: 'text', text: 'Answer in French.' },
            { type: 'image_url', image_url: { url: 'data:...' } },
            { type: 'text', text: 'Be brief.' },
          ],
        },
        { role: 'user', content: 'Bonjour' },
      ],
    });
    expect(extractSystemPrompt(data)).toBe('Answer in French.\nBe brief.');
  });

  it('joins several instruction messages in order', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [
        { role: 'system', content: 'First.' },
        { role: 'user', content: 'Hi' },
        { role: 'system', content: 'Second.' },
      ],
    });
    expect(extractSystemPrompt(data)).toBe('First.\n\nSecond.');
  });

  it('returns null when a chat completion has no system message', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [{ role: 'user', content: 'Hi' }],
    });
    expect(extractSystemPrompt(data)).toBeNull();
  });

  it('ignores empty system messages', () => {
    const data = request(FunctionName.CHAT_COMPLETE, {
      messages: [
        { role: 'system', content: '' },
        { role: 'system', content: null },
        { role: 'user', content: 'Hi' },
      ],
    });
    expect(extractSystemPrompt(data)).toBeNull();
  });

  it('reads the instructions of a Responses request', () => {
    const data = request(FunctionName.CREATE_MODEL_RESPONSE, {
      instructions: 'You are terse.',
      input: 'Hi',
    });
    expect(extractSystemPrompt(data)).toBe('You are terse.');
  });

  it('reads system items from a Responses input list', () => {
    const data = request(FunctionName.CREATE_MODEL_RESPONSE, {
      input: [
        { role: 'system', content: 'You are terse.' },
        { role: 'user', content: 'Hi' },
        { type: 'function_call_output', call_id: 'c1', output: '{}' },
      ],
    });
    expect(extractSystemPrompt(data)).toBe('You are terse.');
  });

  it('puts Responses instructions before input system items', () => {
    const data = request(FunctionName.CREATE_MODEL_RESPONSE, {
      instructions: 'Instructions.',
      input: [{ role: 'system', content: 'System item.' }],
    });
    expect(extractSystemPrompt(data)).toBe('Instructions.\n\nSystem item.');
  });

  it('returns null for a Responses request with neither', () => {
    const data = request(FunctionName.CREATE_MODEL_RESPONSE, {
      input: [{ role: 'user', content: 'Hi' }],
    });
    expect(extractSystemPrompt(data)).toBeNull();
  });

  it('returns null for endpoints without a system prompt', () => {
    const data = request(FunctionName.EMBED, { input: 'Hi' });
    expect(extractSystemPrompt(data)).toBeNull();
  });

  it('returns null without request data', () => {
    expect(extractSystemPrompt(undefined)).toBeNull();
    expect(extractSystemPrompt(null)).toBeNull();
  });
});
