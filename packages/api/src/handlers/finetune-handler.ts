import { tryTargets } from '@api/handlers/handler-utils';
import type { AppContext } from '@api/types/hono';

async function finetuneHandler(c: AppContext): Promise<Response> {
  const saConfig = c.get('sa_config');
  const saRequestData = c.get('sa_request_data');

  try {
    const tryTargetsResponse = await tryTargets(c, saConfig, saRequestData);

    return tryTargetsResponse;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error({
        message: `${saRequestData.functionName} error ${err.message}`,
      });
    } else {
      console.error({
        message: `${saRequestData.functionName} error ${err}`,
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

export default finetuneHandler;
