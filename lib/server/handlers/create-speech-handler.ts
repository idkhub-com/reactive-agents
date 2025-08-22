import type { AppContext } from '@server/types/hono';
import { tryTargets } from './handler-utils';

/**
 * Handles the '/audio/speech' API request by selecting the appropriate provider(s) and making the request to them.
 * @throws Will throw an error if no provider options can be determined or if the request to the provider(s) fails.
 * @throws Will throw an 500 error if the handler fails due to some reasons
 */
export async function createSpeechHandler(c: AppContext): Promise<Response> {
  try {
    const idkRequestData = c.get('idk_request_data');
    const idkConfig = c.get('idk_config');

    const tryTargetsResponse = await tryTargets(c, idkConfig, idkRequestData);

    return tryTargetsResponse;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('createSpeech error', err.message);
    } else {
      console.error('createSpeech error', err);
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
