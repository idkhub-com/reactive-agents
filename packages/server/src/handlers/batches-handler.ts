import type { AppContext } from '@server/types/hono';
import { tryTargets } from './handler-utils';

function batchesHandler(): (c: AppContext) => Promise<Response> {
  async function handler(c: AppContext): Promise<Response> {
    const raRequestData = c.get('ra_request_data');
    const raConfig = c.get('ra_config');
    try {
      const tryTargetsResponse = await tryTargets(c, raConfig, raRequestData);

      return tryTargetsResponse;
    } catch (err) {
      if (err instanceof Error) {
        console.error({
          message: `${raRequestData.functionName} error ${err.message}`,
        });
      } else {
        console.error({
          message: `${raRequestData.functionName} error ${err}`,
        });
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
  }
  return handler;
}

export default batchesHandler;
