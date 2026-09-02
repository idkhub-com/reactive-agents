import { lockWindowMs } from '@api/middlewares/optimizer/locks';
import { describe, expect, it } from 'vitest';

/**
 * The optimizer locks were fixed windows chosen when the calls underneath
 * them had no timeout at all. Now that each call is bounded by a setting, a
 * window that stayed fixed would stop covering its work the moment someone
 * raised a timeout for a slow model -- and a lock that expires mid-flight
 * lets a second request start the same regeneration.
 */
describe('lockWindowMs', () => {
  it('keeps the floor while a call fits well inside it', () => {
    // The defaults: two minutes a call, against a ten-minute floor. Nothing
    // about the old behaviour changes here.
    expect(lockWindowMs(10 * 60_000, 120_000)).toBe(10 * 60_000);
    expect(lockWindowMs(5 * 60_000, 120_000)).toBe(5 * 60_000);
  });

  it('grows past the floor once one call could outlast it', () => {
    // The case the floor was never chosen for: at the ceiling, a single
    // attempt and its retry run twenty minutes, so a ten-minute lock would
    // expire with its holder still working.
    expect(lockWindowMs(10 * 60_000, 600_000)).toBe(20 * 60_000);
  });

  it('covers an attempt and the client’s one retry, not just an attempt', () => {
    expect(lockWindowMs(0, 90_000)).toBe(180_000);
  });
});
