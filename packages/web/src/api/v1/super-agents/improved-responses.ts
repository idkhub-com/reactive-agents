import type {
  ImprovedResponse,
  ImprovedResponseQueryParams,
} from '@shared/types/data/improved-response';

// NOTE: This is a placeholder implementation until the backend API is properly connected
// Consider creating GitHub issue for: Implement improved responses API client

/**
 * Get improved responses based on query parameters
 * NOTE: Placeholder implementation - backend API not yet connected
 */
export function getImprovedResponses(
  _queryParams: ImprovedResponseQueryParams,
): Promise<ImprovedResponse[]> {
  // Placeholder implementation - always returns empty array for now
  return Promise.resolve([]);
}

/**
 * Create a new improved response
 * NOTE: Placeholder implementation - backend API not yet connected
 */
export function createImprovedResponse(
  _params: Record<string, unknown>, // NOTE: Typing will be fixed when implementing
): Promise<ImprovedResponse> {
  // Placeholder implementation
  return Promise.reject(new Error('Not implemented yet'));
}

/**
 * Check if a log has an improved response (ground truth)
 * @param logId - The log ID associated with the log
 * @returns Promise<ImprovedResponse | null> - The improved response if it exists, null otherwise
 */
export async function getImprovedResponseByLogId(
  logId: string,
): Promise<ImprovedResponse | null> {
  try {
    const responses = await getImprovedResponses({ log_id: logId, limit: 1 });
    return responses.length > 0 ? responses[0] : null;
  } catch (_error) {
    // Error fetching improved response by log ID - silently handle for now
    return null;
  }
}
