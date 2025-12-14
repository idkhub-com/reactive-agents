import app from './api/v1';

export default {
  fetch: app.fetch,
};

// Re-export types for the client
export type { ReactiveAgentsRoute } from './api/v1';
