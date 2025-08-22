import { RouterError } from '@server/errors/router';
import type { AppContext } from '@server/types/hono';
import { tryTargets } from './handler-utils';

/**
 * Handles the '/images/generations' API request by selecting the appropriate provider(s) and making the request to them.
 *
 * @throws Will throw an error if no provider options can be determined or if the request to the provider(s) fails.
 * @throws Will throw an 500 error if the handler fails due to some reasons
 */
export async function imageGenerationsHandler(
  c: AppContext,
): Promise<Response> {
  try {
    const idkConfig = c.get('idk_config');
    const idkRequestData = c.get('idk_request_data');

    const tryTargetsResponse = await tryTargets(c, idkConfig, idkRequestData);

    return tryTargetsResponse;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('imageGenerate error', err.message);
    } else {
      console.error('imageGenerate error', err);
    }
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
}
