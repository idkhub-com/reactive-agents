import { format } from 'date-fns';

/**
 * When a request happened, as every log surface writes it: the log's page
 * header, its card, the logs table. Twelve-hour clock, seconds kept, since
 * requests in one session are seconds apart.
 */
export function formatLogTimestamp(ms: number): string {
  return format(new Date(ms), 'MMM d, h:mm:ss a');
}

/**
 * The time of day alone, for a run of requests that all share their date --
 * a session's rail -- where repeating it would only take up room.
 */
export function formatClockTime(ms: number): string {
  return format(new Date(ms), 'h:mm:ss a');
}
