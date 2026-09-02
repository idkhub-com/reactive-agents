import { withClientTracing } from '@api/utils/super-agents/client-tracing';
import { describe, expect, it } from 'vitest';

// What OpenCode 1.18.18 sends, captured at the gateway
const opencode = () =>
  new Headers({
    'user-agent':
      'opencode/1.18.18 ai-sdk/provider-utils/4.0.23 runtime/bun/1.3.14',
    'x-session-id': 'ses_fa0504e30ffe',
  });

describe('withClientTracing', () => {
  it('traces a client that names its session by session and product', () => {
    expect(withClientTracing({ agent_name: 'a' }, opencode())).toEqual({
      agent_name: 'a',
      trace_id: 'ses_fa0504e30ffe',
      app_id: 'opencode/1.18.18',
    });
  });

  it('leaves what sa-config says in place', () => {
    expect(
      withClientTracing({ trace_id: 'trace-1', app_id: 'my-app' }, opencode()),
    ).toEqual({ trace_id: 'trace-1', app_id: 'my-app' });
  });

  it('leaves a request without a session id alone', () => {
    const config = { agent_name: 'a' };
    expect(
      withClientTracing(
        config,
        new Headers({ 'user-agent': 'OpenAI/JS 6.15.0' }),
      ),
    ).toBe(config);
  });

  it('takes the session alone when there is no user-agent', () => {
    expect(
      withClientTracing({}, new Headers({ 'x-session-id': 'ses_1' })),
    ).toEqual({ trace_id: 'ses_1' });
  });
});
