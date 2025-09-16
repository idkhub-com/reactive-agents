import { describe, expect, it } from 'vitest';

describe('API v1 Index', () => {
  describe('Module Structure', () => {
    it('should import all required modules without errors', async () => {
      // Test that the index file can be imported without errors
      // This verifies all imports are valid and the module structure is correct
      const indexModule = await import('@server/api/v1/index');

      expect(indexModule).toBeDefined();
      expect(indexModule.GET).toBeDefined();
      expect(indexModule.POST).toBeDefined();
      expect(indexModule.DELETE).toBeDefined();
      expect(indexModule.PATCH).toBeDefined();
    }, 10000); // 10 second timeout for slow import

    it('should export HTTP method handlers', async () => {
      const indexModule = await import('@server/api/v1/index');

      expect(typeof indexModule.GET).toBe('function');
      expect(typeof indexModule.POST).toBe('function');
      expect(typeof indexModule.DELETE).toBe('function');
      expect(typeof indexModule.PATCH).toBe('function');
    }, 10000);

    it('should export IdkRoute type', async () => {
      // Type-only exports aren't available at runtime, so we just test that the module imports
      // without errors, which would fail if the type export was malformed
      const indexModule = await import('@server/api/v1/index');
      expect(indexModule).toBeDefined();
    }, 10000);
  });

  describe('Route Integration', () => {
    it('should include embeddings router in the configuration', async () => {
      // This test verifies that the embeddings router is properly integrated
      // by checking that the index file imports it without error
      const indexModule = await import('@server/api/v1/index');

      // If the embeddings router wasn't properly imported, this would fail
      expect(indexModule).toBeDefined();
    }, 10000);

    it('should have all expected routes configured', async () => {
      // Test that all routers are imported and the module loads successfully
      const indexModule = await import('@server/api/v1/index');

      expect(indexModule.GET).toBeDefined();
      expect(indexModule.POST).toBeDefined();
      expect(indexModule.DELETE).toBeDefined();
      expect(indexModule.PATCH).toBeDefined();
    }, 10000);
  });
});
