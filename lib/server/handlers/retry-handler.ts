import { HttpError } from '@server/errors/http';
import { createInternalErrorResponse } from '@server/utils/error-classification-central';
import {
  MAX_RETRY_LIMIT_MS,
  POSSIBLE_RETRY_STATUS_HEADERS,
} from '@shared/types/constants';
import retry from 'async-retry';

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number,
  requestHandler?: () => Promise<Response>,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const timeoutRequestOptions = {
    ...options,
    signal: controller.signal,
  };

  let response: Response;

  try {
    if (requestHandler) {
      response = await requestHandler();
    } else {
      response = await fetch(url, timeoutRequestOptions);
    }
    clearTimeout(timeoutId);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      response = new Response(
        JSON.stringify({
          error: {
            message: `Request exceeded the timeout sent in the request: ${timeout}ms`,
            type: 'timeout_error',
            param: null,
            code: null,
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 408,
        },
      );
    } else {
      throw err;
    }
  }

  return response;
}

/**
 * Tries making a fetch request a specified number of times until it succeeds.
 * If the response's status code is included in the statusCodesToRetry array,
 * the request is retried.
 */
export const retryRequest = async (
  url: string,
  options: RequestInit,
  retryCount: number,
  statusCodesToRetry: number[],
  timeout: number | null,
  requestHandler?: () => Promise<Response>,
  followProviderRetry?: boolean,
): Promise<{
  response: Response;
  attempt: number | undefined;
  createdAt: Date;
  skip: boolean;
}> => {
  let lastAttempt: number | undefined;
  const start = new Date();
  let retrySkipped = false;

  let remainingRetryTimeout = MAX_RETRY_LIMIT_MS;

  try {
    const result = await retry(
      async (bail: (error: Error) => void, attempt: number) => {
        try {
          let response: Response;
          if (timeout) {
            response = await fetchWithTimeout(
              url,
              options,
              timeout,
              requestHandler,
            );
          } else if (requestHandler) {
            response = await requestHandler();
          } else {
            response = await fetch(url, options);
          }

          if (statusCodesToRetry.includes(response.status)) {
            const errorObj = new HttpError(await response.text(), {
              status: response.status,
              statusText: response.statusText,
              body: await response.text(),
            });

            if (response.status === 429 && followProviderRetry) {
              // get retry header.
              const retryHeader = POSSIBLE_RETRY_STATUS_HEADERS.find(
                (header) => {
                  return response.headers.get(header);
                },
              );
              const retryAfterValue = response.headers.get(retryHeader ?? '');
              // continue, if no retry header is found.
              if (!retryAfterValue) {
                throw errorObj;
              }
              let retryAfter: number | undefined;
              // if the header is `retry-after` convert it to milliseconds.
              if (retryHeader === 'retry-after') {
                retryAfter = Number.parseInt(retryAfterValue.trim(), 10) * 1000;
              } else {
                retryAfter = Number.parseInt(retryAfterValue.trim(), 10);
              }

              if (retryAfter && !Number.isNaN(retryAfter)) {
                // break the loop if the retryAfter is greater than the max retry limit
                if (
                  retryAfter >= MAX_RETRY_LIMIT_MS ||
                  retryAfter > remainingRetryTimeout
                ) {
                  retrySkipped = true;
                  throw errorObj;
                }
                remainingRetryTimeout -= retryAfter;
                // will reset the current backoff timeout(s) to `0`.

                throw await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve(errorObj);
                  }, retryAfter);
                });
              } else {
                throw errorObj;
              }
            }

            throw errorObj;
          } else if (response.status >= 200 && response.status <= 204) {
            // do nothing
          } else if (response.status >= 500) {
            // Only throw errors for 5xx status codes
            const errorObj = new HttpError(await response.clone().text(), {
              status: response.status,
              statusText: response.statusText,
              body: await response.text(),
            });
            bail(errorObj);
            return;
          }
          // For 4xx status codes, let them pass through to be handled by the response handler

          return {
            response,
            attempt: lastAttempt,
            createdAt: start,
            skip: retrySkipped,
          };
        } catch (error) {
          if (attempt >= retryCount + 1) {
            bail(error as Error);
            return;
          }
          throw error;
        }
      },
      {
        retries: retryCount,
        onRetry: (error: Error, attempt: number): void => {
          lastAttempt = attempt;
          console.warn(`Failed in Retry attempt ${attempt}. Error: ${error}`);
        },
        randomize: false,
      },
    );

    if (!result) {
      throw new Error('No result');
    }

    return result;
  } catch (error) {
    console.error(error);
    let errorResponse: Response;

    if (error instanceof HttpError) {
      errorResponse = new Response(error.response.body, {
        status: error.response.status,
        statusText: error.response.statusText,
      });
    } else if (error instanceof Error) {
      // Create standardized internal error response for all other errors
      const internalErrorResponse = createInternalErrorResponse(error, {
        provider: 'system',
        stage: 'request',
      });
      errorResponse = new Response(JSON.stringify(internalErrorResponse), {
        status: internalErrorResponse.status || 500,
        headers: { 'content-type': 'application/json' },
      });
    } else {
      const unknownError = new Error('Unknown error occurred during request');
      const internalErrorResponse = createInternalErrorResponse(unknownError, {
        provider: 'system',
        stage: 'request',
      });
      errorResponse = new Response(JSON.stringify(internalErrorResponse), {
        status: internalErrorResponse.status || 500,
        headers: { 'content-type': 'application/json' },
      });
    }

    return {
      response: errorResponse,
      attempt: lastAttempt,
      createdAt: start,
      skip: retrySkipped,
    };
  }
};
