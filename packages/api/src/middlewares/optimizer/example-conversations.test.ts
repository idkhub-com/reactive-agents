import { generateExampleConversations } from '@api/middlewares/optimizer/system-prompt';
import { HttpMethod } from '@api/types/http';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { Log } from '@shared/types/data/log';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The step that turns request logs into the contrastive examples reflection
 * learns from.
 *
 * Its failure mode is the quiet one: a log it cannot parse is swallowed and
 * dropped from the result. If that happened to every log, reflection would run
 * against an empty example set and regenerate prompts from nothing at all --
 * with no error anywhere, because from the caller's side an empty array is a
 * perfectly ordinary answer.
 */

const conversationLog = (
  overrides: {
    userMessage?: string;
    assistantMessage?: string;
    requestBody?: Record<string, unknown>;
    responseBody?: unknown;
  } = {},
): Log => {
  const {
    userMessage = 'Book a flight to Paris',
    assistantMessage = 'Booked your flight to Paris.',
    requestBody,
  } = overrides;

  // Checked by presence rather than with `??`, so a test can pass an explicit
  // `null` body and actually get one instead of silently falling back.
  const responseBody =
    'responseBody' in overrides
      ? overrides.responseBody
      : {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: assistantMessage },
              finish_reason: 'stop',
            },
          ],
        };

  return {
    id: 'log-1',
    start_time: 1677652288000,
    first_token_time: null,
    end_time: 1677652289000,
    duration: 1000,
    base_sa_config: {},
    ai_provider: AIProvider.OPENAI,
    model: 'gpt-4',
    hook_logs: [],
    cache_status: CacheStatus.MISS,
    embedding: null,
    trace_id: null,
    parent_span_id: null,
    span_id: null,
    span_name: null,
    app_id: null,
    external_user_id: null,
    external_user_human_name: null,
    user_metadata: null,
    metadata: {},
    ai_provider_request_log: {
      provider: AIProvider.OPENAI,
      function_name: FunctionName.CHAT_COMPLETE,
      method: HttpMethod.POST,
      request_url: 'https://api.openai.com/v1/chat/completions',
      request_body: requestBody ?? {
        model: 'gpt-4',
        messages: [{ role: 'user', content: userMessage }],
      },
      response_body: responseBody,
      raw_request_body: '{}',
      raw_response_body: '{}',
      status: 200,
      cache_mode: CacheMode.DISABLED,
      cache_status: CacheStatus.MISS,
    },
  } as unknown as Log;
};

beforeEach(() => {
  // The drop path logs the failure; silence it so a passing run stays readable.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateExampleConversations', () => {
  it('renders a log as its input followed by the assistant reply', () => {
    const [conversation] = generateExampleConversations([
      conversationLog({
        userMessage: 'Book a flight to Paris',
        assistantMessage: 'Booked your flight to Paris.',
      }),
    ]);

    expect(conversation).toContain('Book a flight to Paris');
    expect(conversation).toContain('Assistant: Booked your flight to Paris.');
  });

  it('returns one entry per log, in order', () => {
    const conversations = generateExampleConversations([
      conversationLog({ userMessage: 'first' }),
      conversationLog({ userMessage: 'second' }),
      conversationLog({ userMessage: 'third' }),
    ]);

    expect(conversations).toHaveLength(3);
    expect(conversations[0]).toContain('first');
    expect(conversations[1]).toContain('second');
    expect(conversations[2]).toContain('third');
  });

  it('returns nothing for no logs', () => {
    expect(generateExampleConversations([])).toEqual([]);
  });

  it('carries the response format through as a constraint', () => {
    /**
     * Structured-output constraints have to reach the prompt writer. A skill
     * that must return a particular JSON schema will keep failing its
     * evaluations if the regenerated prompt never learns the schema exists.
     */
    const [conversation] = generateExampleConversations([
      conversationLog({
        requestBody: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Extract the event' }],
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'CalendarEvent' },
          },
        },
      }),
    ]);

    expect(conversation).toContain('Request Constraints');
    expect(conversation).toContain('Response Format');
    expect(conversation).toContain('CalendarEvent');
  });

  it('carries available tools through as a constraint', () => {
    const [conversation] = generateExampleConversations([
      conversationLog({
        requestBody: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Check the weather' }],
          tools: [{ type: 'function', function: { name: 'get_weather' } }],
        },
      }),
    ]);

    expect(conversation).toContain('Available Tools');
    expect(conversation).toContain('get_weather');
  });

  it('omits the constraints block when there is nothing to constrain', () => {
    // Sampling parameters are deliberately excluded: they do not change the
    // task, so mentioning them would be noise in the prompt.
    const [conversation] = generateExampleConversations([
      conversationLog({
        requestBody: {
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'Just chat' }],
          temperature: 0.9,
          max_tokens: 100,
        },
      }),
    ]);

    expect(conversation).not.toContain('Request Constraints');
    expect(conversation).not.toContain('temperature');
  });

  it('drops a log it cannot parse instead of failing the batch', () => {
    // One malformed row must not cost the reflection its other examples.
    const conversations = generateExampleConversations([
      conversationLog({ userMessage: 'good one' }),
      conversationLog({ responseBody: { nonsense: true } }),
      conversationLog({ userMessage: 'another good one' }),
    ]);

    expect(conversations).toHaveLength(2);
    expect(conversations[0]).toContain('good one');
    expect(conversations[1]).toContain('another good one');
  });

  it('returns an empty set rather than throwing when every log is unusable', () => {
    /**
     * The dangerous case, pinned deliberately. Reflection receives `[]` and
     * carries on, so a systematic parsing break degrades every regenerated
     * prompt without surfacing an error anywhere. The behaviour is correct --
     * the point is that it is a decision, not an accident.
     */
    const conversations = generateExampleConversations([
      conversationLog({ responseBody: { nonsense: true } }),
      conversationLog({ responseBody: null }),
    ]);

    expect(conversations).toEqual([]);
  });
});
