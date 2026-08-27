// Type-only exports for client-side Hono RPC usage
// This file should NOT import any runtime dependencies

// Re-export the route type from the main index
// This is safe for client bundling because it's only used as a type
export type { SuperAgentsRoute } from './index';
