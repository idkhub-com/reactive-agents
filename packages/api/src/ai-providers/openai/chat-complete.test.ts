import { openAIChatCompleteConfig } from '@api/ai-providers/openai/chat-complete';
import { transformUsingProviderConfig } from '@api/services/transform-to-provider-request';
import type { SuperAgentsRequestBody } from '@shared/types/api/request/body';
import type { SuperAgentsTarget } from '@shared/types/api/request/headers';
import { describe, expect, it } from 'vitest';

describe('OpenAI chat completions configuration', () => {
  const target = {} as SuperAgentsTarget;
  const body = {
    model: 'gpt-5.6',
    messages: [{ role: 'user', content: 'Hello' }],
  } as SuperAgentsRequestBody;

  /**
   * The parameter only helps if it reaches OpenAI: the internal skills send
   * it to stop a billed cache write, and a config that did not list it would
   * drop it on the way out.
   */
  it('forwards prompt_cache_options as sent', () => {
    const sent = transformUsingProviderConfig(
      openAIChatCompleteConfig,
      { ...body, prompt_cache_options: { mode: 'explicit' } },
      target,
    );

    expect(sent.prompt_cache_options).toEqual({ mode: 'explicit' });
  });

  it('leaves prompt_cache_options out when the request has none', () => {
    const sent = transformUsingProviderConfig(
      openAIChatCompleteConfig,
      body,
      target,
    );

    expect(sent).not.toHaveProperty('prompt_cache_options');
  });
});
