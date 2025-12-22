export interface ErrorResponse {
  status: number;
  statusText: string;
  body: string;
}

export class HttpError extends Error {
  response: ErrorResponse;

  constructor(message: string, response: ErrorResponse) {
    super(message);
    this.name = 'HttpError';
    this.response = response;
  }
}
