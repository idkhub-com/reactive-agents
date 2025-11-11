import { RouterError } from '@server/errors/router';
import { tryTargets } from '@server/handlers/handler-utils';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';

export const completionsRouter = new Hono<AppEnv>()
  /**
   * Handles the '/chat/completions' API request by selecting the appropriate provider(s) and making the request to them.
   */
  .post(async (c): Promise<Response> => {
    try {
      const raConfig = c.get('ra_config');
      const raRequestData = c.get('ra_request_data');

      const tryTargetsResponse = await tryTargets(c, raConfig, raRequestData);

      return tryTargetsResponse;
    } catch (err) {
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
