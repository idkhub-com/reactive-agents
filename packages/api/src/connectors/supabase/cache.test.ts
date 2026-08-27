import { supabaseCacheStorageConnector } from '@api/connectors/supabase';
import { CACHE_TTL_SECONDS } from '@api/constants';
import { createMockContext } from '@api/test-utils/mock-context';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockContext = createMockContext();

// Only the connection details are stubbed. `CACHE_TTL_SECONDS` is kept real,
// because the point of these tests is the value the connector actually writes.
vi.mock('@api/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@api/constants')>()),
  getPostgrestServiceRoleKey: () => 'test-service-role-key',
  getPostgrestUrl: () => 'https://test.supabase.co/rest/v1',
  getSupabaseSecretKey: () => 'test-secret-key',
}));

global.fetch = vi.fn();

/** The body of the single fetch call the connector made, parsed. */
const writtenBody = (): { key: string; value: string; expires_at: string } => {
  const mockFetch = vi.mocked(fetch);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  const [, init] = mockFetch.mock.calls[0];
  return JSON.parse(String(init?.body));
};

/** An arbitrary fixed instant; the assertions are all relative to it. */
const T0 = new Date('2026-03-01T12:00:00.000Z').getTime();

describe('supabaseCacheStorageConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    /**
     * The clock is frozen because both halves of this contract are times, and
     * a real clock makes the interesting assertions meaningless: write and read
     * land in the same millisecond, so an entry that expires *now* looks
     * indistinguishable from one that expires in an hour.
     */
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('setCache', () => {
    it('writes an expiry one full TTL in the future', async () => {
      /**
       * The regression this file exists for. `expires_at` used to be
       * `new Date()`, the same instant `getCache` compares against with
       * `expires_at >= now`, so every entry was already expired when written
       * and the cache never returned a hit. Nothing failed loudly -- every
       * request simply missed.
       */
      await supabaseCacheStorageConnector.setCache(mockContext, 'k', 'v');

      expect(new Date(writtenBody().expires_at).getTime()).toBe(
        T0 + CACHE_TTL_SECONDS * 1000,
      );
    });

    it('writes the key and value it was given', async () => {
      await supabaseCacheStorageConnector.setCache(
        mockContext,
        'cache-key',
        'cached-body',
      );

      const body = writtenBody();
      expect(body.key).toBe('cache-key');
      expect(body.value).toBe('cached-body');
    });

    it('upserts so a repeated key replaces rather than conflicts', async () => {
      await supabaseCacheStorageConnector.setCache(mockContext, 'k', 'second');

      // PostgREST needs to be told to merge duplicates; without this header the
      // second write of a key fails on the primary key instead of replacing.
      const [, init] = vi.mocked(fetch).mock.calls[0];
      const headers = new Headers(init?.headers);
      expect(headers.get('Prefer')).toContain('resolution=merge-duplicates');
    });
  });

  describe('getCache', () => {
    it('filters out entries that have already expired', async () => {
      await supabaseCacheStorageConnector.getCache(mockContext, 'k');

      const [url] = vi.mocked(fetch).mock.calls[0];
      const query = new URL(String(url)).searchParams;

      expect(query.get('key')).toBe('eq.k');

      // The other half of the contract: the filter is what makes a stale row
      // invisible, and it has to be a lower bound on `expires_at`.
      const filter = query.get('expires_at');
      expect(filter).toMatch(/^gte\./);
      expect(
        new Date(String(filter).slice('gte.'.length)).getTime(),
      ).not.toBeNaN();
    });

    it('returns the cached value on a hit', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => [
          {
            key: 'k',
            value: 'cached-body',
            expires_at: new Date(Date.now() + 60_000).toISOString(),
          },
        ],
      } as Response);

      expect(
        await supabaseCacheStorageConnector.getCache(mockContext, 'k'),
      ).toBe('cached-body');
    });

    it('returns null when nothing matches', async () => {
      expect(
        await supabaseCacheStorageConnector.getCache(mockContext, 'absent'),
      ).toBeNull();
    });
  });

  describe('round trip', () => {
    it('writes an entry a later read would still accept', async () => {
      /**
       * Ties the two halves together. Time is advanced between the write and
       * the read, which is what makes this meaningful: with the old
       * `expires_at = now` the entry is already behind the read's lower bound
       * a second later, while a real TTL is still comfortably ahead of it.
       */
      await supabaseCacheStorageConnector.setCache(mockContext, 'k', 'v');
      const expiresAt = new Date(writtenBody().expires_at).getTime();

      vi.clearAllMocks();
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);
      vi.setSystemTime(T0 + 1_000);

      await supabaseCacheStorageConnector.getCache(mockContext, 'k');
      const filter = new URL(
        String(vi.mocked(fetch).mock.calls[0][0]),
      ).searchParams.get('expires_at');
      const lowerBound = new Date(
        String(filter).slice('gte.'.length),
      ).getTime();

      expect(lowerBound).toBe(T0 + 1_000);
      expect(expiresAt).toBeGreaterThanOrEqual(lowerBound);
    });
  });
});
