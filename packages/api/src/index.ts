import app from './v1';

export default {
  fetch: app.fetch,
};

// Re-export types for the client
export type { SuperAgentsRoute } from './v1';
