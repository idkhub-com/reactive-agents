import type { AIProviderFunctionConfig } from '@shared/types/ai-providers/config';
import type { SuperAgentsRequestBody } from '@shared/types/api/request/body';
import type { SuperAgentsTarget } from '@shared/types/api/request/headers';
import { describe, expect, it } from 'vitest';
import { transformUsingProviderConfig } from './transform-to-provider-request';

describe('transform-to-provider-request', () => {
  describe('transformUsingProviderConfig', () => {
    const mockTarget = {} as SuperAgentsTarget;

    it('transforms simple parameters correctly', () => {
      const providerConfig: AIProviderFunctionConfig = {
        model: { param: 'model' },
        temperature: { param: 'temperature' },
      };

      const requestBody = {
        model: 'gpt-4',
        temperature: 0.7,
      } as SuperAgentsRequestBody;

      const result = transformUsingProviderConfig(
        providerConfig,
        requestBody,
        mockTarget,
      );

      expect(result.model).toBe('gpt-4');
      expect(result.temperature).toBe(0.7);
    });

    it('transforms nested parameters correctly', () => {
      const providerConfig: AIProviderFunctionConfig = {
        model: { param: 'config.model.name' },
      };

      const requestBody = {
        model: 'gpt-4',
      } as SuperAgentsRequestBody;

      const result = transformUsingProviderConfig(
        providerConfig,
        requestBody,
        mockTarget,
      );

      expect((result.config as Record<string, unknown>).model).toEqual({
        name: 'gpt-4',
      });
    });

    it('prevents prototype pollution via __proto__', () => {
      const providerConfig: AIProviderFunctionConfig = {
        model: { param: '__proto__.polluted' },
      };

      const requestBody = {
        model: 'malicious',
      } as SuperAgentsRequestBody;

      const result = transformUsingProviderConfig(
        providerConfig,
        requestBody,
        mockTarget,
      );

      // Object.prototype should not be polluted
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      // The result should not have any own properties from the dangerous path
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('prevents prototype pollution via constructor', () => {
      const providerConfig: AIProviderFunctionConfig = {
        model: { param: 'constructor.prototype.polluted' },
      };

      const requestBody = {
        model: 'malicious',
      } as SuperAgentsRequestBody;

      const result = transformUsingProviderConfig(
        providerConfig,
        requestBody,
        mockTarget,
      );

      // Object.prototype should not be polluted
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      // The result should not have any own properties from the dangerous path
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('prevents prototype pollution via prototype', () => {
      const providerConfig: AIProviderFunctionConfig = {
        model: { param: 'foo.prototype.bar' },
      };

      const requestBody = {
        model: 'malicious',
      } as SuperAgentsRequestBody;

      const result = transformUsingProviderConfig(
        providerConfig,
        requestBody,
        mockTarget,
      );

      // foo may exist as an empty object, but prototype.bar should not be set
      // The important thing is Object.prototype is not polluted
      expect(({} as Record<string, unknown>).bar).toBeUndefined();
      if (result.foo) {
        expect(
          (result.foo as Record<string, unknown>).prototype,
        ).toBeUndefined();
      }
    });

    it('allows safe property names that contain dangerous substrings', () => {
      const providerConfig: AIProviderFunctionConfig = {
        model: { param: 'my__proto__value' },
        temperature: { param: 'constructor_name' },
      };

      const requestBody = {
        model: 'gpt-4',
        temperature: 0.7,
      } as SuperAgentsRequestBody;

      const result = transformUsingProviderConfig(
        providerConfig,
        requestBody,
        mockTarget,
      );

      // These are safe because they're not exact matches
      expect(result.my__proto__value).toBe('gpt-4');
      expect(result.constructor_name).toBe(0.7);
    });
  });
});
