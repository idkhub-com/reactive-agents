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
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error({ message: `${c.req.path} error ${err.message}` });
      } else {
        console.error({ message: `${c.req.path} error ${err}` });
      }
      return new Response(
        JSON.stringify({
          status: 'failure',
          message: 'Something went wrong',
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
