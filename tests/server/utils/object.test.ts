import { convertKeysToCamelCase } from '@server/utils/object';
import { describe, expect, it } from 'vitest';

describe('convertKeysToCamelCase', () => {
  it('handles multiple underscores correctly', () => {
    const input = {
      __leading_key: 'front',
      user__name: 'Alice',
      deep__object: { inner__value: 42 },
      array_values: [{ inner__key: 'x' }, 'y'],
      trailing__: 'remove',
    };

    const result = convertKeysToCamelCase(input);

    expect(result).toEqual({
      leadingKey: 'front',
      userName: 'Alice',
      deepObject: { innerValue: 42 },
      arrayValues: [{ innerKey: 'x' }, 'y'],
      trailing: 'remove',
    });
  });
});
