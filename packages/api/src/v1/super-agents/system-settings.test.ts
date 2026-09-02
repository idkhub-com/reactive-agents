import type { AppEnv } from '@api/types/hono';
import { systemSettingsRouter } from '@api/v1/super-agents/system-settings';
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
    skill_arbiter_model_id: null,
    intent_compaction_model_id: null,
    options: {
      system_prompt_reflection: { timeout_ms: 120_000 },
      evaluation_generation: { timeout_ms: 120_000 },
      embedding: { timeout_ms: 30_000 },
      judge: { timeout_ms: 60_000, max_tokens: 4_000 },
      skill_arbiter: { timeout_ms: 15_000 },
      intent_compaction: { timeout_ms: 15_000 },
      developer_mode: false,
    },
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
      ).toHaveBeenCalledWith(expect.anything(), {
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
        options: { ...mockSettings.options, developer_mode: true },
      };
      mockUserDataStorageConnector.updateSystemSettings.mockResolvedValue(
        updatedSettings,
      );

      const res = await client.index.$patch({
        json: {
          judge_model_id: newJudgeId,
          embedding_model_id: newEmbedId,
          options: { developer_mode: true },
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

    it('should accept a skill arbiter timeout within bounds', async () => {
      mockUserDataStorageConnector.updateSystemSettings.mockResolvedValue({
        ...mockSettings,
        options: {
          ...mockSettings.options,
          skill_arbiter: { timeout_ms: 120_000 },
        },
      });

      const res = await client.index.$patch({
        json: { options: { skill_arbiter: { timeout_ms: 120_000 } } },
      });

      expect(res.status).toBe(200);
      // Passed through as the patch it is; the connector merges it.
      expect(
        mockUserDataStorageConnector.updateSystemSettings,
      ).toHaveBeenCalledWith(expect.anything(), {
        options: { skill_arbiter: { timeout_ms: 120_000 } },
      });
    });

    it('should bound every internal timeout the same way', async () => {
      // They share bounds because they bound the same thing: one call to a
      // model. A new role added without bounds would be caught here.
      for (const role of [
        'system_prompt_reflection',
        'evaluation_generation',
        'embedding',
        'judge',
        'skill_arbiter',
        'intent_compaction',
      ] as const) {
        // Below a second, above ten minutes, and not a whole millisecond.
        for (const timeout_ms of [0, 500, 600_001, 15_000.5]) {
          const res = await client.index.$patch({
            json: { options: { [role]: { timeout_ms } } },
          });
          expect(res.status).toBe(400);
        }

        mockUserDataStorageConnector.updateSystemSettings.mockResolvedValue({
          ...mockSettings,
          options: {
            ...mockSettings.options,
            [role]: { ...mockSettings.options[role], timeout_ms: 90_000 },
          },
        });
        const ok = await client.index.$patch({
          json: { options: { [role]: { timeout_ms: 90_000 } } },
        });
        expect(ok.status).toBe(200);
      }
      expect(
        mockUserDataStorageConnector.updateSystemSettings,
      ).toHaveBeenCalledTimes(6);
    });

    it('should bound the judge token budget', async () => {
      // Too small for an answer, above the ceiling, and not a whole token.
      for (const max_tokens of [0, 100, 1_000_001, 4_000.5]) {
        const res = await client.index.$patch({
          json: { options: { judge: { max_tokens } } },
        });
        expect(res.status).toBe(400);
      }
      expect(
        mockUserDataStorageConnector.updateSystemSettings,
      ).not.toHaveBeenCalled();

      mockUserDataStorageConnector.updateSystemSettings.mockResolvedValue({
        ...mockSettings,
        options: {
          ...mockSettings.options,
          judge: { timeout_ms: 60_000, max_tokens: 16_000 },
        },
      });
      const ok = await client.index.$patch({
        json: { options: { judge: { max_tokens: 16_000 } } },
      });
      expect(ok.status).toBe(200);
    });

    it('should return 400 for an unknown option (strict validation)', async () => {
      for (const json of [
        { options: { judge: { reasoning: 'low' } } },
        { options: { unknown_role: { timeout_ms: 1_000 } } },
        // The old column names, which are options now.
        { judge_timeout_ms: 60_000 },
        { developer_mode: true },
      ]) {
        const res = await client.index.$patch({
          json: json as unknown as Record<string, unknown>,
        });
        expect(res.status).toBe(400);
      }
      expect(
        mockUserDataStorageConnector.updateSystemSettings,
      ).not.toHaveBeenCalled();
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
        json: { options: { developer_mode: 'true' } } as unknown as {
          options: { developer_mode: boolean };
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
        json: { options: { developer_mode: true } },
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
