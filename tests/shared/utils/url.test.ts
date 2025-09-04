import { removeEndingPath, removeTrailingSlash } from '@shared/utils/url';
import { describe, expect, it } from 'vitest';

describe('URL Utilities', () => {
  describe('removeTrailingSlash', () => {
    it('should remove trailing slash from URLs', () => {
      expect(removeTrailingSlash('https://example.com/')).toBe(
        'https://example.com',
      );
      expect(removeTrailingSlash('https://api.example.com/v1/')).toBe(
        'https://api.example.com/v1',
      );
      expect(removeTrailingSlash('/api/v1/')).toBe('/api/v1');
      expect(removeTrailingSlash('/')).toBe('');
    });

    it('should not modify URLs without trailing slash', () => {
      expect(removeTrailingSlash('https://example.com')).toBe(
        'https://example.com',
      );
      expect(removeTrailingSlash('https://api.example.com/v1')).toBe(
        'https://api.example.com/v1',
      );
      expect(removeTrailingSlash('/api/v1')).toBe('/api/v1');
      expect(removeTrailingSlash('')).toBe('');
    });

    it('should handle complex URLs with query parameters and fragments', () => {
      expect(removeTrailingSlash('https://example.com/path?query=value/')).toBe(
        'https://example.com/path?query=value',
      );
      expect(removeTrailingSlash('https://example.com/path#fragment/')).toBe(
        'https://example.com/path#fragment',
      );
      expect(
        removeTrailingSlash('https://example.com/path?query=value#fragment/'),
      ).toBe('https://example.com/path?query=value#fragment');
    });

    it('should handle URLs with multiple slashes', () => {
      expect(removeTrailingSlash('https://example.com//')).toBe(
        'https://example.com/',
      );
      expect(removeTrailingSlash('https://example.com///')).toBe(
        'https://example.com//',
      );
    });

    it('should handle relative URLs', () => {
      expect(removeTrailingSlash('./path/')).toBe('./path');
      expect(removeTrailingSlash('../path/')).toBe('../path');
      expect(removeTrailingSlash('path/to/resource/')).toBe('path/to/resource');
    });
  });

  describe('removeEndingPath', () => {
    it('should remove the last path segment from Azure URLs', () => {
      // Main Azure URL pattern from comment
      expect(
        removeEndingPath(
          'https://example-eastus2.services.ai.azure.com/models',
        ),
      ).toBe('https://example-eastus2.services.ai.azure.com');
    });

    it('should handle URLs with multiple path segments', () => {
      expect(removeEndingPath('https://api.example.com/v1/models')).toBe(
        'https://api.example.com/v1',
      );
      expect(removeEndingPath('https://api.example.com/v1/models/gpt-4')).toBe(
        'https://api.example.com/v1/models',
      );
      expect(removeEndingPath('https://example.com/path/to/resource')).toBe(
        'https://example.com/path/to',
      );
    });

    it('should handle URLs with single path segment', () => {
      expect(removeEndingPath('https://example.com/api')).toBe(
        'https://example.com',
      );
      expect(removeEndingPath('https://subdomain.example.com/models')).toBe(
        'https://subdomain.example.com',
      );
    });

    it('should not modify URLs without paths', () => {
      expect(removeEndingPath('https://example.com')).toBe(
        'https://example.com',
      );
      expect(removeEndingPath('https://api.example.com')).toBe(
        'https://api.example.com',
      );
      expect(removeEndingPath('http://localhost:3000')).toBe(
        'http://localhost:3000',
      );
    });

    it('should handle URLs with trailing slash', () => {
      // URLs with trailing slash don't match the regex pattern, so they're unchanged
      expect(removeEndingPath('https://example.com/models/')).toBe(
        'https://example.com/models/',
      );
      expect(removeEndingPath('https://api.example.com/v1/models/')).toBe(
        'https://api.example.com/v1/models/',
      );
    });

    it('should handle URLs with root path', () => {
      expect(removeEndingPath('https://example.com/')).toBe(
        'https://example.com/',
      );
      expect(removeEndingPath('http://localhost:8080/')).toBe(
        'http://localhost:8080/',
      );
    });

    it('should handle complex Azure service URLs', () => {
      expect(
        removeEndingPath(
          'https://myservice-westus.openai.azure.com/openai/deployments/gpt-4/chat/completions',
        ),
      ).toBe(
        'https://myservice-westus.openai.azure.com/openai/deployments/gpt-4/chat',
      );
      expect(
        removeEndingPath('https://resource.cognitiveservices.azure.com/models'),
      ).toBe('https://resource.cognitiveservices.azure.com');
    });

    it('should handle HTTP and HTTPS protocols', () => {
      expect(removeEndingPath('http://example.com/api/v1')).toBe(
        'http://example.com/api',
      );
      expect(removeEndingPath('https://secure.example.com/api/v1')).toBe(
        'https://secure.example.com/api',
      );
    });

    it('should handle URLs with ports', () => {
      expect(removeEndingPath('https://localhost:3000/api/models')).toBe(
        'https://localhost:3000/api',
      );
      expect(removeEndingPath('http://api.example.com:8080/v1/models')).toBe(
        'http://api.example.com:8080/v1',
      );
    });

    it('should handle URLs with query parameters (removing them with path)', () => {
      expect(
        removeEndingPath('https://api.example.com/v1/models?version=2023'),
      ).toBe('https://api.example.com/v1');
      expect(
        removeEndingPath('https://example.com/models?limit=10&offset=20'),
      ).toBe('https://example.com');
    });

    it('should handle URLs with fragments (removing them with path)', () => {
      expect(
        removeEndingPath('https://api.example.com/v1/models#section1'),
      ).toBe('https://api.example.com/v1');
      expect(removeEndingPath('https://example.com/models#top')).toBe(
        'https://example.com',
      );
    });

    it('should handle edge cases', () => {
      // Empty string
      expect(removeEndingPath('')).toBe('');

      // Invalid URLs should still work with the regex pattern
      expect(removeEndingPath('not-a-url/with/path')).toBe(
        'not-a-url/with/path',
      );
    });
  });

  describe('Chained Usage (Typical Pattern)', () => {
    it('should work correctly when chaining removeTrailingSlash then removeEndingPath', () => {
      // This is the typical usage pattern
      const url1 = 'https://example-eastus2.services.ai.azure.com/models/';
      const result1 = removeEndingPath(removeTrailingSlash(url1));
      expect(result1).toBe('https://example-eastus2.services.ai.azure.com');

      const url2 = 'https://api.example.com/v1/models/';
      const result2 = removeEndingPath(removeTrailingSlash(url2));
      expect(result2).toBe('https://api.example.com/v1');

      const url3 =
        'https://myservice.openai.azure.com/openai/deployments/gpt-4/';
      const result3 = removeEndingPath(removeTrailingSlash(url3));
      expect(result3).toBe(
        'https://myservice.openai.azure.com/openai/deployments',
      );
    });

    it('should handle URLs without trailing slash in chained usage', () => {
      const url1 = 'https://example.com/models';
      const result1 = removeEndingPath(removeTrailingSlash(url1));
      expect(result1).toBe('https://example.com');

      const url2 = 'https://api.example.com/v1/models';
      const result2 = removeEndingPath(removeTrailingSlash(url2));
      expect(result2).toBe('https://api.example.com/v1');
    });

    it('should handle root paths in chained usage', () => {
      const url1 = 'https://example.com/';
      const result1 = removeEndingPath(removeTrailingSlash(url1));
      expect(result1).toBe('https://example.com');

      const url2 = 'https://api.example.com/';
      const result2 = removeEndingPath(removeTrailingSlash(url2));
      expect(result2).toBe('https://api.example.com');
    });

    it('should handle URLs with no paths in chained usage', () => {
      const url1 = 'https://example.com';
      const result1 = removeEndingPath(removeTrailingSlash(url1));
      expect(result1).toBe('https://example.com');

      const url2 = 'http://localhost:3000';
      const result2 = removeEndingPath(removeTrailingSlash(url2));
      expect(result2).toBe('http://localhost:3000');
    });

    it('should handle complex Azure URLs in chained usage', () => {
      const azureUrl =
        'https://myresource-eastus.openai.azure.com/openai/deployments/gpt-4/chat/completions/';
      const result = removeEndingPath(removeTrailingSlash(azureUrl));
      expect(result).toBe(
        'https://myresource-eastus.openai.azure.com/openai/deployments/gpt-4/chat',
      );

      const cognitiveUrl =
        'https://resource.cognitiveservices.azure.com/models/';
      const result2 = removeEndingPath(removeTrailingSlash(cognitiveUrl));
      expect(result2).toBe('https://resource.cognitiveservices.azure.com');
    });
  });
});
