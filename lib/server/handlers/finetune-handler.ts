import { tryTargets } from '@server/handlers/handler-utils';
import type { AppContext } from '@server/types/hono';

async function finetuneHandler(c: AppContext): Promise<Response> {
  const idkConfig = c.get('idk_config');
  const idkRequestData = c.get('idk_request_data');

  try {
    const tryTargetsResponse = await tryTargets(c, idkConfig, idkRequestData);

    return tryTargetsResponse;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error({
        message: `${idkRequestData.functionName} error ${err.message}`,
      });
    } else {
      console.error({
        message: `${idkRequestData.functionName} error ${err}`,
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
