export interface ErrorResponse {
  status: number;
  statusText: string;
  body: string;
  /**
   * The provider's `content-type`, so the body reaches the caller as what it
   * is. A `Response` built from a string without one is `text/plain`, which
   * sends a provider's JSON error through the text path and buries it inside
   * `{"html-message": ...}` -- where the OpenAI client reports it as
   * "400 status code (no body)".
   */
  contentType?: string;
}

export class HttpError extends Error {
  response: ErrorResponse;

  constructor(message: string, response: ErrorResponse) {
    super(message);
    this.name = 'HttpError';
    this.response = response;
  }

  /** The error as the response it came from, status and content type intact. */
  toResponse(): Response {
    const { body, status, statusText, contentType } = this.response;
    return new Response(body, {
      status,
      statusText,
      ...(contentType ? { headers: { 'content-type': contentType } } : {}),
    });
  }
}
