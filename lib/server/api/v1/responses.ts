import { RouterError } from '@server/errors/router';
import { tryTargets } from '@server/handlers/handler-utils';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';

export const responsesRouter = new Hono<AppEnv>()

  /**
   * POST route for '/v1/responses'.
   * Handles requests by passing them to the responsesHandler.
   */
  .post(async (c): Promise<Response> => {
    try {
      const idkConfig = c.get('idk_config');
      const idkRequestData = c.get('idk_request_data');

      const tryTargetsResponse = await tryTargets(c, idkConfig, idkRequestData);

      return tryTargetsResponse;
    } catch (err) {
      console.error('responses error:', err);

      // Only handle genuine exceptions, not HTTP responses
      if (err instanceof RouterError) {
        return new Response(
          JSON.stringify({
            error: {
              message: err.message,
              type: 'invalid_request_error',
              code: null,
              param: null,
            },
          }),
          {
            status: 400,
            headers: {
              'content-type': 'application/json',
            },
          },
        );
      }

      // For any other exceptions, return a generic server error
      return new Response(
        JSON.stringify({
          error: {
            message: 'Internal server error',
            type: 'api_error',
            code: null,
            param: null,
          },
        }),
        {
          status: 500,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }
  });
