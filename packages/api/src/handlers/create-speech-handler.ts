import type { AppContext } from '@api/types/hono';
import { tryTargets } from './handler-utils';

/**
 * Handles the '/audio/speech' API request by selecting the appropriate provider(s) and making the request to them.
 * @throws Will throw an error if no provider options can be determined or if the request to the provider(s) fails.
 * @throws Will throw an 500 error if the handler fails due to some reasons
 */
export async function createSpeechHandler(c: AppContext): Promise<Response> {
  try {
    const saRequestData = c.get('sa_request_data');
    const saConfig = c.get('sa_config');

    const tryTargetsResponse = await tryTargets(c, saConfig, saRequestData);

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
