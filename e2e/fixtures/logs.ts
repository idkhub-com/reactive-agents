import type { APIRequestContext } from '@playwright/test';

const LOGS_PATH = '/v1/super-agents/observability/logs';

/** The parts of a log these specs read. */
export interface LoggedRequest {
  id: string;
  skill_id: string;
  metadata: Record<string, unknown>;
  original_system_prompt: string | null;
  ai_provider_request_log: {
    request_body: { messages?: { role: string; content: string }[] };
  };
}

/**
 * The logs recorded for a skill, newest first. A log is written after its
 * response has been sent, so callers poll rather than read once.
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
