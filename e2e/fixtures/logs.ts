import type { APIRequestContext } from '@playwright/test';

const LOGS_PATH = '/v1/super-agents/observability/logs';

/** The parts of a log these specs read. */
export interface LoggedRequest {
  id: string;
  skill_id: string;
  end_time: number | null;
  metadata: Record<string, unknown>;
  original_system_prompt: string | null;
  /**
   * Null until the request has answered, and for one that failed before it
   * reached a provider -- the row is written when the request arrives.
   */
  ai_provider_request_log: {
    request_body: { messages?: { role: string; content: string }[] };
  } | null;
}

/**
 * The logs recorded for a skill, newest first.
 *
 * Includes requests that are still running: a row is written when a request
 * arrives, not when it finishes, so a caller wanting the provider exchange
 * has to wait for it -- which is why these are polled rather than read once.
 */
export const getLogs = async (
  request: APIRequestContext,
  skillId: string,
): Promise<LoggedRequest[]> => {
  const response = await request.get(LOGS_PATH, {
    params: { skill_id: skillId },
  });
  return response.json() as Promise<LoggedRequest[]>;
};
