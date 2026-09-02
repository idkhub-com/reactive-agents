/**
 * Tracing a client sends outside `sa-config`.
 *
 * OpenCode, for one, names its session on every request (`x-session-id`)
 * and itself in the user-agent (`opencode/1.18.18 ai-sdk/...`) but knows
 * nothing of `sa-config`, so its logs would each get a random trace and no
 * app. A session is a trace, and a client that names one is an application,
 * which its user-agent's product token names. Whatever `sa-config` says
 * wins, and a request without a session id is left alone: a bare SDK or
 * curl user-agent names a library, not an app.
 */
export function withClientTracing(
  config: Record<string, unknown>,
  headers: Headers,
): Record<string, unknown> {
  const sessionId = headers.get('x-session-id');
  if (!sessionId) return config;
  const product = headers.get('user-agent')?.split(' ')[0];
  return {
    ...config,
    trace_id: config.trace_id ?? sessionId,
    ...(config.app_id === undefined && product ? { app_id: product } : {}),
  };
}
