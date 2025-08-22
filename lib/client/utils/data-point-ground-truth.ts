import { getImprovedResponseByLogId } from '@client/api/v1/idk/improved-responses';
import type { DataPoint } from '@shared/types/data';
import type { ImprovedResponse } from '@shared/types/data/improved-response';

/**
 * Determines if a data point has ground truth based on improved responses
 * @param dataPoint - The data point to check
 * @returns Promise<boolean> - True if the data point has an improved response (ground truth)
 */
export async function hasGroundTruth(dataPoint: DataPoint): Promise<boolean> {
  const logId = dataPoint.metadata?.log_id as string | undefined;
  if (!logId) return false;

  const improvedResponse = await getImprovedResponseByLogId(logId);
  return improvedResponse !== null;
}

/**
 * Gets the ground truth (improved response) for a data point
 * @param dataPoint - The data point to get ground truth for
 * @returns Promise<ImprovedResponse | null> - The improved response if it exists, null otherwise
 */
export function getGroundTruth(
  dataPoint: DataPoint,
): Promise<ImprovedResponse | null> {
  const logId = dataPoint.metadata?.log_id as string | undefined;
  if (!logId) return Promise.resolve(null);

  return getImprovedResponseByLogId(logId);
}

/**
 * Gets the ground truth response body for display purposes
 * @param dataPoint - The data point to get ground truth for
 * @returns Promise<Record<string, unknown> | null> - The improved response body if it exists
 */
export async function getGroundTruthResponseBody(
  dataPoint: DataPoint,
): Promise<Record<string, unknown> | null> {
  const improvedResponse = await getGroundTruth(dataPoint);
  return improvedResponse?.improved_response_body || null;
}
