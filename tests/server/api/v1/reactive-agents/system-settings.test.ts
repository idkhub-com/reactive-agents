import { systemSettingsRouter } from '@server/api/v1/reactive-agents/system-settings';
import type { AppEnv } from '@server/types/hono';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create a mock UserDataStorageConnector with all required methods
const mockUserDataStorageConnector = {
  getSystemSettings: vi.fn(),
  updateSystemSettings: vi.fn(),
};

// Create a test app with the middleware that injects the mock connector
const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.set(
      'user_data_storage_connector',
      mockUserDataStorageConnector as unknown as AppEnv['Variables']['user_data_storage_connector'],
    );
    await next();
  })
  .route('/', systemSettingsRouter);

describe('System Settings API', () => {
  const client = testClient(app);

  const mockSettings = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    system_prompt_reflection_model_id: 'model-1111-2222-3333-444455556666',
    evaluation_generation_model_id: 'model-2222-3333-4444-555566667777',
    embedding_model_id: 'model-3333-4444-5555-666677778888',
    judge_model_id: 'model-4444-5555-6666-777788889999',
    developer_mode: false,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /', () => {
    it('should return 200 and system settings on successful fetch', async () => {
      mockUserDataStorageConnector.getSystemSettings.mockResolvedValue(
        mockSettings,
      );

      const res = await client.index.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockSettings);
      expect(mockUserDataStorageConnector.getSystemSettings).toHaveBeenCalled();
    });

    it('should return settings with null model IDs when not configured', async () => {
      const unconfiguredSettings = {
        ...mockSettings,
        system_prompt_reflection_model_id: null,
        evaluation_generation_model_id: null,
        embedding_model_id: null,
        judge_model_id: null,
      };
      mockUserDataStorageConnector.getSystemSettings.mockResolvedValue(
        unconfiguredSettings,
      );

      const res = await client.index.$get();

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(unconfiguredSettings);
    });

    it('should return 500 on database error', async () => {
      mockUserDataStorageConnector.getSystemSettings.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const res = await client.index.$get();

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({
        error: 'An unexpected database error occurred. Please try again.',
      });
    });
  });

  describe('PATCH /', () => {
    it('should return 200 on successful update with single field', async () => {
      const newJudgeId = 'b1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const updatedSettings = {
        ...mockSettings,
        judge_model_id: newJudgeId,
      };
      mockUserDataStorageConnector.updateSystemSettings.mockResolvedValue(
        updatedSettings,
      );

      const res = await client.index.$patch({
        json: { judge_model_id: newJudgeId },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(updatedSettings);
      expect(
        mockUserDataStorageConnector.updateSystemSettings,
      ).toHaveBeenCalledWith({
        judge_model_id: newJudgeId,
      });
    });

    it('should return 200 on successful update with multiple fields', async () => {
      const newJudgeId = 'c1c2c3d4-e5f6-7890-abcd-ef1234567890';
      const newEmbedId = 'd1d2c3d4-e5f6-7890-abcd-ef1234567890';
      const updatedSettings = {
        ...mockSettings,
        judge_model_id: newJudgeId,
        embedding_model_id: newEmbedId,
        developer_mode: true,
      };
      mockUserDataStorageConnector.updateSystemSettings.mockResolvedValue(
        updatedSettings,
      );

      const res = await client.index.$patch({
        json: {
          judge_model_id: newJudgeId,
          embedding_model_id: newEmbedId,
          developer_mode: true,
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(updatedSettings);
    });

    it('should allow setting model IDs to null', async () => {
      const updatedSettings = {
        ...mockSettings,
        judge_model_id: null,
      };
      mockUserDataStorageConnector.updateSystemSettings.mockResolvedValue(
        updatedSettings,
      );

      const res = await client.index.$patch({
        json: { judge_model_id: null },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(updatedSettings);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await client.index.$patch({
        json: { judge_model_id: 'not-a-valid-uuid' },
      });

      expect(res.status).toBe(400);
      expect(
        mockUserDataStorageConnector.updateSystemSettings,
      ).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid developer_mode type', async () => {
      const res = await client.index.$patch({
        json: { developer_mode: 'true' } as unknown as {
          developer_mode: boolean;
        },
      });

      expect(res.status).toBe(400);
      expect(
        mockUserDataStorageConnector.updateSystemSettings,
      ).not.toHaveBeenCalled();
    });

    it('should return 400 for unexpected fields (strict validation)', async () => {
      const res = await client.index.$patch({
        json: { unexpected_field: 'value' } as unknown as Record<
          string,
          unknown
        >,
      });

      expect(res.status).toBe(400);
      expect(
        mockUserDataStorageConnector.updateSystemSettings,
      ).not.toHaveBeenCalled();
    });

    it('should return 500 on database update error', async () => {
      mockUserDataStorageConnector.updateSystemSettings.mockRejectedValue(
        new Error('Update failed'),
      );

      const res = await client.index.$patch({
        json: { developer_mode: true },
      });

      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data).toEqual({
        error: 'An unexpected database error occurred. Please try again.',
      });
    });

    it('should handle database constraint error gracefully', async () => {
      mockUserDataStorageConnector.updateSystemSettings.mockRejectedValue(
        new Error('violates foreign key constraint'),
      );

      const res = await client.index.$patch({
        json: { judge_model_id: 'e1e2c3d4-e5f6-7890-abcd-ef1234567890' },
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data).toEqual({
        error: 'The referenced record does not exist or cannot be modified.',
      });
    });
  });
});
