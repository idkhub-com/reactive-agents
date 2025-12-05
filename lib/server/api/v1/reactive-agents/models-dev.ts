import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';

const MODELS_DEV_API_URL = 'https://models.dev/api.json';
const MODELS_DEV_TIMEOUT_MS = 10_000; // 10 seconds

/**
 * Router for models.dev API proxy
 * Proxies requests to models.dev to avoid CORS issues
 */
export const modelsDevRouter = new Hono<AppEnv>().get('/', async (c) => {
  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MODELS_DEV_TIMEOUT_MS);

  try {
    const response = await fetch(MODELS_DEV_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ReactiveAgents/1.0',
      },
      signal: controller.signal,
    });

    // Clear timeout on successful fetch
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(
        `[models-dev] Failed to fetch: ${response.status} ${response.statusText}`,
      );
      const statusCode =
        response.status >= 400 && response.status < 600
          ? (response.status as 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504)
          : 500;
      return c.json(
        { error: `Failed to fetch models: ${response.statusText}` },
        statusCode,
      );
    }

    const data = await response.json();

    // Return the raw JSON data - let the client handle parsing/validation
    return c.json(data);
  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(timeoutId);

    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[models-dev] Request timeout after 10 seconds');
      return c.json(
        { error: 'Request timeout - models.dev API did not respond in time' },
        504,
      );
    }

    console.error('[models-dev] Error proxying request:', error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error while fetching models',
      },
      500,
    );
  }
});
