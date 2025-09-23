import { runOptimizer } from '@server/middlewares/optimizer';
import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { Log, Skill } from '@shared/types/data';
import { CacheStatus } from '@shared/types/middleware/cache';
import { describe, expect, it } from 'vitest';

describe('runOptimizer', () => {
  const mockSkill: Skill = {
    id: 'skill-123',
    agent_id: 'agent-456',
    name: 'Test Skill',
    description: 'A test skill',
    metadata: {
      last_trained_at: undefined,
      last_trained_log_start_time: undefined,
    },
    max_configurations: 3,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const createMockLog = (id: string, embedding: number[] | null): Log => ({
    id,
    agent_id: 'agent-456',
    skill_id: 'skill-123',
    method: HttpMethod.POST,
    endpoint: '/v1/chat/completions',
    function_name: FunctionName.CHAT_COMPLETE,
    status: 200,
    start_time: Date.now(),
    end_time: Date.now() + 1000,
    duration: 1000,
    base_idk_config: {},
    ai_provider: AIProvider.OPENAI,
    model: 'gpt-3.5-turbo',
    ai_provider_request_log: {
      provider: AIProvider.OPENAI,
      function_name: FunctionName.CHAT_COMPLETE,
      method: HttpMethod.POST,
      request_url: 'https://api.openai.com/v1/chat/completions',
      status: 200,
      request_body: {},
      response_body: {},
      raw_request_body: '{}',
      raw_response_body: '{}',
      cache_mode: 'none',
      cache_status: CacheStatus.MISS,
    },
    hook_logs: [],
    metadata: {},
    embedding,
    cache_status: CacheStatus.MISS,
    trace_id: null,
    parent_span_id: null,
    span_id: null,
    span_name: null,
    app_id: null,
    external_user_id: null,
    external_user_human_name: null,
    user_metadata: null,
  });

  it('should return null when no logs with embeddings are provided', () => {
    const logs = [createMockLog('log1', null), createMockLog('log2', null)];

    const result = runOptimizer(mockSkill, logs);
    expect(result).toBeNull();
  });

  it('should handle when there are fewer logs than requested clusters', () => {
    const logs = [
      createMockLog('log1', [1, 2, 3]),
      createMockLog('log2', [4, 5, 6]),
    ];

    const result = runOptimizer(mockSkill, logs);
    expect(result).not.toBeNull();
    expect(result!.clusters).toEqual([0, 1]); // Each point is its own cluster
    expect(result!.centroids).toHaveLength(2);
    expect(result!.iterations).toBe(0);
  });

  it('should successfully cluster logs with embeddings', () => {
    const logs = [
      createMockLog('log1', [1, 1, 1]), // Cluster 1
      createMockLog('log2', [1.1, 1.1, 1.1]), // Cluster 1
      createMockLog('log3', [5, 5, 5]), // Cluster 2
      createMockLog('log4', [5.1, 5.1, 5.1]), // Cluster 2
      createMockLog('log5', [10, 10, 10]), // Cluster 3
      createMockLog('log6', [10.1, 10.1, 10.1]), // Cluster 3
    ];

    const result = runOptimizer(mockSkill, logs);

    expect(result).not.toBeNull();
    expect(result!.clusters).toHaveLength(6);
    expect(result!.centroids).toHaveLength(3);
    expect(result!.iterations).toBeGreaterThanOrEqual(1);

    // Check that similar points are in the same cluster
    const cluster1 = result!.clusters[0];
    const cluster2 = result!.clusters[1];
    expect(cluster1).toBe(cluster2); // log1 and log2 should be in the same cluster

    const cluster3 = result!.clusters[2];
    const cluster4 = result!.clusters[3];
    expect(cluster3).toBe(cluster4); // log3 and log4 should be in the same cluster

    const cluster5 = result!.clusters[4];
    const cluster6 = result!.clusters[5];
    expect(cluster5).toBe(cluster6); // log5 and log6 should be in the same cluster
  });

  it('should handle the case where k >= number of data points', () => {
    const skill: Skill = {
      ...mockSkill,
      max_configurations: 10, // More clusters than data points
    };

    const logs = [
      createMockLog('log1', [1, 2, 3]),
      createMockLog('log2', [4, 5, 6]),
      createMockLog('log3', [7, 8, 9]),
    ];

    const result = runOptimizer(skill, logs);

    expect(result).not.toBeNull();
    expect(result!.clusters).toEqual([0, 1, 2]); // Each point is its own cluster
    expect(result!.centroids).toHaveLength(3);
    expect(result!.iterations).toBe(0);
  });

  it('should return null when embeddings have inconsistent dimensions', () => {
    const logs = [
      createMockLog('log1', [1, 2, 3]), // 3D
      createMockLog('log2', [4, 5, 6, 7]), // 4D
      createMockLog('log3', [8, 9, 10]), // 3D
    ];

    const result = runOptimizer(mockSkill, logs);
    expect(result).toBeNull();
  });

  it('should filter out logs without embeddings and cluster the rest', () => {
    const logs = [
      createMockLog('log1', null), // No embedding
      createMockLog('log2', [1, 1, 1]), // Has embedding
      createMockLog('log3', []), // Empty embedding
      createMockLog('log4', [5, 5, 5]), // Has embedding
      createMockLog('log5', [10, 10, 10]), // Has embedding
    ];

    const result = runOptimizer(mockSkill, logs);

    expect(result).not.toBeNull();
    expect(result!.clusters).toHaveLength(3); // Only 3 logs with valid embeddings
    expect(result!.centroids).toHaveLength(3);
  });
});
