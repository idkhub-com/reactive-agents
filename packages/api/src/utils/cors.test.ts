import { getAllowedOrigins } from '@api/constants';
import { createMockContext } from '@api/test-utils/mock-context';
import { describe, expect, it } from 'vitest';

describe('getAllowedOrigins', () => {
  it('falls back to the localhost dev origins when WEB_APP_URL is unset', () => {
    const origins = getAllowedOrigins(createMockContext());

    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('http://localhost:8787');
  });

  it('returns no origins in production when WEB_APP_URL is unset', () => {
    // nginx serves the dashboard and proxies /v1/* from the same origin, so a
    // production deployment does not need a cross-origin allowance by default.
    const origins = getAllowedOrigins(
      createMockContext({ NODE_ENV: 'production' }),
    );

    expect(origins).toEqual([]);
  });

  it('uses WEB_APP_URL when set', () => {
    const origins = getAllowedOrigins(
      createMockContext({
        NODE_ENV: 'production',
        WEB_APP_URL: 'https://dashboard.example.com',
      }),
    );

    expect(origins).toEqual(['https://dashboard.example.com']);
  });

  it('accepts a comma-separated list and trims each entry', () => {
    const origins = getAllowedOrigins(
      createMockContext({
        WEB_APP_URL: 'https://a.example.com, https://b.example.com ,',
      }),
    );

    expect(origins).toEqual(['https://a.example.com', 'https://b.example.com']);
  });
});
