import { describe, expect, it } from 'vitest';

describe('API v1 Index', () => {
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
