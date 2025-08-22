import { getHttpMethodColor } from '@client/utils/http-method-colors';
import { describe, expect, it } from 'vitest';

describe('getHttpMethodColor', () => {
  it('returns default color for undefined method', () => {
    expect(getHttpMethodColor(undefined)).toBe(
      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    );
  });

  it('normalizes method case and whitespace', () => {
    expect(getHttpMethodColor('  get ')).toBe(
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    );
  });
});
