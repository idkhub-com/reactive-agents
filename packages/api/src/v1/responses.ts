import { tryTargets } from '@api/handlers/handler-utils';
import type { AppEnv } from '@api/types/hono';
import { Hono } from 'hono';

export const responsesRouter = new Hono<AppEnv>()

  /**
   * POST route for '/v1/responses'.
   * Handles requests by passing them to the responsesHandler.
   */
  .post(async (c): Promise<Response> => {
    try {
      const saConfig = c.get('sa_config');
      const saRequestData = c.get('sa_request_data');

      const tryTargetsResponse = await tryTargets(c, saConfig, saRequestData);

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
