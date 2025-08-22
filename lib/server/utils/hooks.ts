import type { AppContext } from '@server/types/hono';
import type {
  IdkRequestBody,
  IdkRequestData,
} from '@shared/types/api/request/body';
import type { IdkResponseBody } from '@shared/types/api/response/body';

import type { HookLog } from '@shared/types/idkhub/observability';
import { HookType } from '@shared/types/middleware/hooks';

function createHookResponse(
  baseResponse: Response,
  baseResponseBody:
    | IdkResponseBody
    | ReadableStream
    | FormData
    | ArrayBuffer
    | null,
  hookLogs: HookLog[],
  failedHook?: HookLog,
  override: {
    status?: number;
    headers?: Record<string, string>;
  } = {},
): Response {
  const responseBody = {
    hook_results: {
      input_hooks: hookLogs.filter((h) => h.hook.type === HookType.INPUT_HOOK),
      output_hooks: hookLogs.filter(
        (h) => h.hook.type === HookType.OUTPUT_HOOK,
      ),
    },
    ...(failedHook ? { error: failedHook } : baseResponseBody),
  };

  const response = new Response(JSON.stringify(responseBody), {
    status: override.status || baseResponse.status,
    statusText: baseResponse.statusText,
    headers: override.headers || baseResponse.headers,
  });

  return response;
}

function handleFailedOutputHook(
  response: Response,
  idkResponseBody: IdkResponseBody | ReadableStream | FormData | ArrayBuffer,
  hookLogs: HookLog[],
  failedHook?: HookLog,
): Response {
  if (!idkResponseBody) {
    return new Response(idkResponseBody, {
      ...response,
      status: 246,
      statusText: 'Hooks failed',
      headers: response.headers,
    });
  }

  return createHookResponse(response, null, hookLogs, failedHook, {
    status: 446,
    headers: { 'content-type': 'application/json' },
  });
}

export async function outputHookHandler(
  c: AppContext,
  idkRequestData: IdkRequestData,
  response: Response,
  idkResponseBody: IdkResponseBody,
  retryAttemptsMade: number,
): Promise<Response> {
  try {
    if (retryAttemptsMade > 0) {
      // Reset the output hook results
      const hookLogs = c.get('hook_logs');

      // Remove the output hook results
      const filteredHookLogs = hookLogs?.filter(
        (h) => h.hook.type !== HookType.OUTPUT_HOOK,
      );

      c.set('hook_logs', filteredHookLogs);
    }

    const executeHooks = c.get('executeHooks');

    const hookLogs = await executeHooks(
      c,
      HookType.OUTPUT_HOOK,
      response.status,
      false,
      idkRequestData,
      idkResponseBody,
    );

    for (const hookLog of hookLogs) {
      if (hookLog.result.deny_request) {
        return handleFailedOutputHook(
          response,
          idkResponseBody,
          hookLogs,
          hookLog,
        );
      }
    }

    return createHookResponse(response, idkResponseBody, hookLogs);
  } catch (err) {
    console.error(err);
    return response;
  }
}

function handleFailedInputHook(
  hookLogs: HookLog[],
  failedHook?: HookLog,
): Response {
  return createHookResponse(new Response(), null, hookLogs, failedHook, {
    status: 446,
    headers: { 'content-type': 'application/json' },
  });
}

export async function inputHookHandler(
  c: AppContext,
  idkRequestData: IdkRequestData,
): Promise<{
  errorResponse?: Response;
  transformedIdkBody?: IdkRequestBody;
}> {
  try {
    const executeHooks = c.get('executeHooks');

    const hookLogs = await executeHooks(
      c,
      HookType.INPUT_HOOK,
      null,
      false,
      idkRequestData,
    );

    let latestTransformedIdkBody:
      | IdkRequestBody
      | ReadableStream
      | ArrayBuffer
      | FormData
      | null = null;

    for (const hookLog of hookLogs) {
      if (hookLog.result.deny_request) {
        return {
          errorResponse: handleFailedInputHook(hookLogs, hookLog),
          transformedIdkBody: idkRequestData.requestBody,
        };
      }
      if (hookLog.result.request_body_override) {
        latestTransformedIdkBody = hookLog.result.request_body_override;
      }
    }
    if (latestTransformedIdkBody) {
      return {
        transformedIdkBody: latestTransformedIdkBody,
      };
    }
  } catch (err) {
    console.error(err);
    return {};
  }

  return {};
}
