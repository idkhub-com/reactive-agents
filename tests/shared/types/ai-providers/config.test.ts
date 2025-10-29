import { GatewayProvider } from '@shared/types/ai-providers/config';
import { describe, expect, it } from 'vitest';

describe('AI Provider Config Types', () => {
  describe('GatewayProvider Schema Validation', () => {
    it('should validate complete gateway provider object', () => {
      const validProvider = {
        id: 'openai',
        name: 'OpenAI',
        object: 'provider',
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      const result = GatewayProvider.parse(validProvider);
      expect(result).toEqual(validProvider);
    });

    it('should validate all required fields are present', () => {
      const completeProvider = {
        id: 'anthropic',
        name: 'Anthropic',
        object: 'provider',
        description: 'Anthropic Claude API provider',
        base_url: 'https://api.anthropic.com',
      };

      const result = GatewayProvider.parse(completeProvider);
      expect(result.id).toBe('anthropic');
      expect(result.name).toBe('Anthropic');
      expect(result.object).toBe('provider');
      expect(result.description).toBe('Anthropic Claude API provider');
      expect(result.base_url).toBe('https://api.anthropic.com');
    });

    it('should reject missing id field', () => {
      const invalidProvider = {
        name: 'OpenAI',
        object: 'provider',
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject missing name field', () => {
      const invalidProvider = {
        id: 'openai',
        object: 'provider',
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject missing object field', () => {
      const invalidProvider = {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject missing description field', () => {
      const invalidProvider = {
        id: 'openai',
        name: 'OpenAI',
        object: 'provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject missing base_url field', () => {
      const invalidProvider = {
        id: 'openai',
        name: 'OpenAI',
        object: 'provider',
        description: 'OpenAI API provider',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should accept empty strings for all fields', () => {
      const providerWithEmptyStrings = {
        id: '',
        name: '',
        object: '',
        description: '',
        base_url: '',
      };

      const result = GatewayProvider.parse(providerWithEmptyStrings);
      expect(result.id).toBe('');
      expect(result.name).toBe('');
      expect(result.object).toBe('');
      expect(result.description).toBe('');
      expect(result.base_url).toBe('');
    });

    it('should validate provider with localhost URL', () => {
      const localProvider = {
        id: 'ollama',
        name: 'Ollama',
        object: 'provider',
        description: 'Local Ollama instance',
        base_url: 'http://localhost:11434',
      };

      const result = GatewayProvider.parse(localProvider);
      expect(result.base_url).toBe('http://localhost:11434');
    });

    it('should validate provider with HTTPS URL', () => {
      const httpsProvider = {
        id: 'secure-provider',
        name: 'Secure Provider',
        object: 'provider',
        description: 'Secure provider with HTTPS',
        base_url: 'https://secure.example.com/api',
      };

      const result = GatewayProvider.parse(httpsProvider);
      expect(result.base_url).toBe('https://secure.example.com/api');
    });

    it('should validate provider with IP address URL', () => {
      const ipProvider = {
        id: 'ip-provider',
        name: 'IP Provider',
        object: 'provider',
        description: 'Provider with IP address',
        base_url: 'http://192.168.1.100:8080',
      };

      const result = GatewayProvider.parse(ipProvider);
      expect(result.base_url).toBe('http://192.168.1.100:8080');
    });

    it('should validate provider with path in base URL', () => {
      const pathProvider = {
        id: 'path-provider',
        name: 'Path Provider',
        object: 'provider',
        description: 'Provider with path in URL',
        base_url: 'https://api.example.com/v1/completions',
      };

      const result = GatewayProvider.parse(pathProvider);
      expect(result.base_url).toBe('https://api.example.com/v1/completions');
    });

    it('should validate provider with port number', () => {
      const portProvider = {
        id: 'port-provider',
        name: 'Port Provider',
        object: 'provider',
        description: 'Provider with custom port',
        base_url: 'http://api.example.com:3000',
      };

      const result = GatewayProvider.parse(portProvider);
      expect(result.base_url).toBe('http://api.example.com:3000');
    });

    it('should validate provider with special characters in description', () => {
      const specialProvider = {
        id: 'special-provider',
        name: 'Special Provider',
        object: 'provider',
        description:
          'Provider with special chars: @#$%^&*()[]{}|\\:;"<>,.?/~`+=',
        base_url: 'https://api.example.com',
      };

      const result = GatewayProvider.parse(specialProvider);
      expect(result.description).toBe(
        'Provider with special chars: @#$%^&*()[]{}|\\:;"<>,.?/~`+=',
      );
    });

    it('should validate provider with unicode characters in name', () => {
      const unicodeProvider = {
        id: 'unicode-provider',
        name: 'Provider 中文 한국어 日本語',
        object: 'provider',
        description: 'Provider with unicode characters',
        base_url: 'https://api.example.com',
      };

      const result = GatewayProvider.parse(unicodeProvider);
      expect(result.name).toBe('Provider 中文 한국어 日本語');
    });

    it('should validate provider with long description', () => {
      const longDescription = 'A'.repeat(1000);
      const longProvider = {
        id: 'long-desc-provider',
        name: 'Long Description Provider',
        object: 'provider',
        description: longDescription,
        base_url: 'https://api.example.com',
      };

      const result = GatewayProvider.parse(longProvider);
      expect(result.description).toBe(longDescription);
    });

    it('should validate provider with kebab-case id', () => {
      const kebabProvider = {
        id: 'azure-openai-gpt-4',
        name: 'Azure OpenAI GPT-4',
        object: 'provider',
        description: 'Azure OpenAI service',
        base_url: 'https://azure.openai.com',
      };

      const result = GatewayProvider.parse(kebabProvider);
      expect(result.id).toBe('azure-openai-gpt-4');
    });

    it('should validate provider with snake_case id', () => {
      const snakeProvider = {
        id: 'google_ai_studio',
        name: 'Google AI Studio',
        object: 'provider',
        description: 'Google AI Studio API',
        base_url: 'https://generativelanguage.googleapis.com',
      };

      const result = GatewayProvider.parse(snakeProvider);
      expect(result.id).toBe('google_ai_studio');
    });

    it('should reject non-string id', () => {
      const invalidProvider = {
        id: 123,
        name: 'OpenAI',
        object: 'provider',
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject non-string name', () => {
      const invalidProvider = {
        id: 'openai',
        name: 123,
        object: 'provider',
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject non-string object', () => {
      const invalidProvider = {
        id: 'openai',
        name: 'OpenAI',
        object: 123,
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject non-string description', () => {
      const invalidProvider = {
        id: 'openai',
        name: 'OpenAI',
        object: 'provider',
        description: 123,
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject non-string base_url', () => {
      const invalidProvider = {
        id: 'openai',
        name: 'OpenAI',
        object: 'provider',
        description: 'OpenAI API provider',
        base_url: 123,
      };

      expect(() => GatewayProvider.parse(invalidProvider)).toThrow();
    });

    it('should reject null values', () => {
      const nullProvider = {
        id: null,
        name: 'OpenAI',
        object: 'provider',
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(nullProvider)).toThrow();
    });

    it('should reject undefined values', () => {
      const undefinedProvider = {
        id: 'openai',
        name: undefined,
        object: 'provider',
        description: 'OpenAI API provider',
        base_url: 'https://api.openai.com/v1',
      };

      expect(() => GatewayProvider.parse(undefinedProvider)).toThrow();
    });

    it('should reject empty object', () => {
      const emptyProvider = {};

      expect(() => GatewayProvider.parse(emptyProvider)).toThrow();
    });

    it('should handle array of gateway providers', () => {
      const providers = [
        {
          id: 'openai',
          name: 'OpenAI',
          object: 'provider',
          description: 'OpenAI API provider',
          base_url: 'https://api.openai.com/v1',
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          object: 'provider',
          description: 'Anthropic Claude API provider',
          base_url: 'https://api.anthropic.com',
        },
      ];

      const result = GatewayProvider.array().parse(providers);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('openai');
      expect(result[1].id).toBe('anthropic');
    });

    it('should reject array with invalid provider', () => {
      const invalidProviders = [
        {
          id: 'openai',
          name: 'OpenAI',
          object: 'provider',
          description: 'OpenAI API provider',
          base_url: 'https://api.openai.com/v1',
        },
        {
          id: 'invalid',
          // Missing required fields
        },
      ];

      expect(() => GatewayProvider.array().parse(invalidProviders)).toThrow();
    });

    it('should validate provider with trailing slash in base_url', () => {
      const trailingSlashProvider = {
        id: 'trailing-slash',
        name: 'Trailing Slash Provider',
        object: 'provider',
        description: 'Provider with trailing slash',
        base_url: 'https://api.example.com/v1/',
      };

      const result = GatewayProvider.parse(trailingSlashProvider);
      expect(result.base_url).toBe('https://api.example.com/v1/');
    });

    it('should validate provider with query parameters in base_url', () => {
      const queryProvider = {
        id: 'query-provider',
        name: 'Query Provider',
        object: 'provider',
        description: 'Provider with query params',
        base_url: 'https://api.example.com?key=value',
      };

      const result = GatewayProvider.parse(queryProvider);
      expect(result.base_url).toBe('https://api.example.com?key=value');
    });

    it('should validate typical AI provider examples', () => {
      const aiProviders = [
        {
          id: 'openai',
          name: 'OpenAI',
          object: 'provider',
          description: 'OpenAI GPT models',
          base_url: 'https://api.openai.com/v1',
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          object: 'provider',
          description: 'Anthropic Claude models',
          base_url: 'https://api.anthropic.com',
        },
        {
          id: 'ollama',
          name: 'Ollama',
          object: 'provider',
          description: 'Local Ollama instance',
          base_url: 'http://localhost:11434',
        },
        {
          id: 'azure-openai',
          name: 'Azure OpenAI',
          object: 'provider',
          description: 'Azure OpenAI Service',
          base_url: 'https://example.openai.azure.com',
        },
      ];

      for (const provider of aiProviders) {
        const result = GatewayProvider.parse(provider);
        expect(result).toEqual(provider);
      }
    });
  });
});
