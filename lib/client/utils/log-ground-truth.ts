import { getImprovedResponseByLogId } from '@client/api/v1/idk/improved-responses';
import type { ImprovedResponse } from '@shared/types/data/improved-response';
import type { Log } from '@shared/types/data/log';

/**
 * Determines if a log has ground truth based on improved responses
 * @param log - The log to check
 * @returns Promise<boolean> - True if the log has an improved response (ground truth)
 */
export async function hasGroundTruth(log: Log): Promise<boolean> {
  const logId = log.id;
  if (!logId) return false;

  const improvedResponse = await getImprovedResponseByLogId(logId);
  return improvedResponse !== null;
}

/**
 * Gets the ground truth (improved response) for a log
 * @param log - The log to get ground truth for
 * @returns Promise<ImprovedResponse | null> - The improved response if it exists, null otherwise
 */
export function getGroundTruth(log: Log): Promise<ImprovedResponse | null> {
  const logId = log.id;
  if (!logId) return Promise.resolve(null);

  return getImprovedResponseByLogId(logId);
}

/**
 * Gets the ground truth response body for display purposes
 * @param log - The log to get ground truth for
 * @returns Promise<Record<string, unknown> | null> - The improved response body if it exists
 */
export async function getGroundTruthResponseBody(
  log: Log,
): Promise<Record<string, unknown> | null> {
  const improvedResponse = await getGroundTruth(log);
  return improvedResponse?.improved_response_body || null;
}
