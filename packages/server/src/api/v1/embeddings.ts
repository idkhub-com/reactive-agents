import { RouterError } from '@server/errors/router';
import { tryTargets } from '@server/handlers/handler-utils';
import type { AppEnv } from '@server/types/hono';
import { error } from '@shared/console-logging';
import { Hono } from 'hono';

export const embeddingsRouter = new Hono<AppEnv>()

  /**
   * Handles the '/embeddings' API request by selecting the appropriate provider(s) and making the request to them.
   *
   * @throws Will throw an error if no provider options can be determined or if the request to the provider(s) fails.
   * @throws Will throw an 500 error if the handler fails due to some reasons
   */
  .post(async (c): Promise<Response> => {
    const raConfig = c.get('ra_config');
    const raRequestData = c.get('ra_request_data');

    try {
      const tryTargetsResponse = await tryTargets(c, raConfig, raRequestData);

      return tryTargetsResponse;
    } catch (err: unknown) {
      // Log detailed error information
      error('[EMBEDDINGS] Request failed:', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });

      let statusCode = 500;
      let errorMessage = 'Something went wrong';

      if (err instanceof RouterError) {
        statusCode = 400;
        errorMessage = err.message;
      }

      return new Response(
        JSON.stringify({
          status: 'failure',
          message: errorMessage,
        }),
        {
          status: statusCode,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
  });
