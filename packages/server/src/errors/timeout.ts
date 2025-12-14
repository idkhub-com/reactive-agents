export class TimeoutError extends Error {
  url: string;
  timeout: number;
  method: string;

  constructor(message: string, url: string, timeout: number, method: string) {
    super(message);
    this.name = 'TimeoutError';
    this.url = url;
    this.timeout = timeout;
    this.method = method;
  }
}
