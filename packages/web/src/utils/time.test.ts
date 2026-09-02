import { formatClockTime, formatLogTimestamp } from '@web/utils/time';
import { describe, expect, it } from 'vitest';

// Built in local time, so the expectation holds in any timezone
const evening = new Date(2026, 8, 1, 20, 50, 14).getTime();
const morning = new Date(2026, 8, 1, 0, 5, 9).getTime();

describe('formatLogTimestamp', () => {
  it('writes a twelve-hour clock with the date', () => {
    expect(formatLogTimestamp(evening)).toBe('Sep 1, 8:50:14 PM');
    expect(formatLogTimestamp(morning)).toBe('Sep 1, 12:05:09 AM');
  });
});

describe('formatClockTime', () => {
  it('writes the time of day alone', () => {
    expect(formatClockTime(evening)).toBe('8:50:14 PM');
    expect(formatClockTime(morning)).toBe('12:05:09 AM');
  });
});
