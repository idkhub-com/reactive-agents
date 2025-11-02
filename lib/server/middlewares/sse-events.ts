import type { AppEnv } from '@server/types/hono';
import { emitSSEEvent } from '@server/utils/sse-event-manager';
import type { SSEEventType } from '@shared/types/sse';
import type { MiddlewareHandler } from 'hono';

/**
 * SSE Events Middleware
 * Automatically emits SSE events when mutations occur
 * Maps HTTP methods and routes to SSE event types
 */
export const sseEventsMiddleware: MiddlewareHandler<AppEnv> = async (
  c,
  next,
) => {
  // Execute the route handler
  await next();

  // Only emit events for successful mutations (POST, PATCH, DELETE)
  const method = c.req.method;
  const path = c.req.path;
  const status = c.res.status;

  // Only process successful mutations
  if (
    (method === 'POST' || method === 'PATCH' || method === 'DELETE') &&
    status >= 200 &&
    status < 300
  ) {
    const eventType = mapRouteToEventType(method, path);
    if (eventType) {
      // Extract resource ID from response or URL if available
      let resourceId: string | undefined;

      try {
        const responseClone = c.res.clone();
        const responseBody = (await responseClone.json()) as Record<
          string,
          unknown
        >;
        resourceId =
          typeof responseBody?.id === 'string' ? responseBody.id : undefined;
      } catch {
        // Response might not be JSON or might be empty (DELETE)
        // Try to extract from URL
        const pathParts = path.split('/');
        // Look for UUID pattern in path
        resourceId = pathParts.find((part) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            part,
          ),
        );
      }

      // Get user ID from JWT payload or use 'default'
      const jwtPayload = c.get('jwtPayload');
      const userId = jwtPayload?.sub || 'default';

      // Emit the event
      emitSSEEvent(eventType, {
        resourceId,
        userId: String(userId),
        timestamp: Date.now(),
      });

      console.log(`[SSE Middleware] Emitted event: ${eventType}`);
    }
  }
};

/**
 * Map HTTP method and route to SSE event type
 */
function mapRouteToEventType(
  method: string,
  path: string,
): SSEEventType | null {
  // Normalize path to handle base paths
  const normalizedPath = path.replace(/^\/v1\/reactive-agents/, '');

  // Agent events
  if (normalizedPath.startsWith('/agents')) {
    if (method === 'POST') return 'agent:created';
    if (method === 'PATCH') return 'agent:updated';
    if (method === 'DELETE') return 'agent:deleted';
  }

  // Skill events
  if (normalizedPath.startsWith('/skills')) {
    if (method === 'POST') return 'skill:created';
    if (method === 'PATCH') return 'skill:updated';
    if (method === 'DELETE') return 'skill:deleted';
  }

  // Model events
  if (
    normalizedPath.match(/\/skills\/[^/]+\/models/) ||
    normalizedPath.startsWith('/models')
  ) {
    if (method === 'POST') return 'model:created';
    if (method === 'PATCH') return 'model:updated';
    if (method === 'DELETE') return 'model:deleted';
  }

  // Evaluation events
  if (normalizedPath.match(/\/skills\/[^/]+\/evaluations/)) {
    if (method === 'POST') return 'evaluation:created';
    if (method === 'PATCH') return 'evaluation:updated';
    if (method === 'DELETE') return 'evaluation:deleted';
  }

  // AI Provider events
  if (
    normalizedPath.startsWith('/ai-providers') ||
    normalizedPath.startsWith('/ai-provider-api-keys')
  ) {
    if (method === 'POST') return 'ai-provider:created';
    if (method === 'PATCH') return 'ai-provider:updated';
    if (method === 'DELETE') return 'ai-provider:deleted';
  }

  // Log events (only creation)
  if (normalizedPath.startsWith('/observability/logs') && method === 'POST') {
    return 'log:created';
  }

  // Feedback events
  if (normalizedPath.startsWith('/feedbacks') && method === 'POST') {
    return 'feedback:created';
  }

  // Improved response events
  if (normalizedPath.startsWith('/improved-responses') && method === 'POST') {
    return 'improved-response:created';
  }

  // Skill optimization events
  if (normalizedPath.match(/\/skills\/[^/]+\/arms/)) {
    if (method === 'POST' || method === 'PATCH')
      return 'skill-optimization:arm-updated';
  }

  if (normalizedPath.match(/\/skills\/[^/]+\/clusters/)) {
    if (method === 'POST' || method === 'PATCH')
      return 'skill-optimization:cluster-updated';
  }

  if (normalizedPath.match(/\/skills\/[^/]+\/evaluation-runs/)) {
    if (method === 'POST') return 'skill-optimization:evaluation-run-created';
    if (method === 'PATCH') return 'skill-optimization:evaluation-run-updated';
  }

  return null;
}
