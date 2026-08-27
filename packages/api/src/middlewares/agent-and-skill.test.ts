import { agentAndSkillMiddleware } from '@api/middlewares/agent-and-skill';
import type { AppContext } from '@api/types/hono';
import * as agentsUtils from '@api/utils/super-agents/agents';
import * as skillsUtils from '@api/utils/super-agents/skills';
import {
  StrategyModes,
  type SuperAgentsConfig,
} from '@shared/types/api/request/headers';
import type { Agent } from '@shared/types/data/agent';
import type { Skill } from '@shared/types/data/skill';
import type { Next } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the utility functions
vi.mock('@api/utils/super-agents/agents');
vi.mock('@api/utils/super-agents/skills');

describe('agentAndSkillMiddleware', () => {
  let mockNext: Next; // Mock connector
  const mockConnector = {
    getFeedback: vi.fn(),
    createFeedback: vi.fn(),
    deleteFeedback: vi.fn(),
    getImprovedResponse: vi.fn(),
    createImprovedResponse: vi.fn(),
    updateImprovedResponse: vi.fn(),
    deleteImprovedResponse: vi.fn(),

    // Agent methods (required by interface)
    getAgents: vi.fn(),
    createAgent: vi.fn(),
    updateAgent: vi.fn(),
    deleteAgent: vi.fn(),

    // Skill methods (required by interface)
    getSkills: vi.fn(),
    createSkill: vi.fn(),
    updateSkill: vi.fn(),
    deleteSkill: vi.fn(),
    incrementSkillTotalRequests: vi.fn(),
    // Tool methods (required by interface)
    getTools: vi.fn(),
    createTool: vi.fn(),
    deleteTool: vi.fn(),
  };
  let mockSuperAgentsConfig: SuperAgentsConfig;

  const createMockContext = (url: string): AppContext => {
    return {
      req: { url } as unknown,
      get: vi.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'sa_config_pre_processed':
            return mockSuperAgentsConfig;
          case 'user_data_storage_connector':
            return mockConnector;
          default:
            return undefined;
        }
      }),
      set: vi.fn(),
    } as unknown as AppContext;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Super Agents config
    const mockSuperAgentsConfig2: SuperAgentsConfig = {
      agent_name: 'test-agent',
      skill_name: 'test-skill',
      strategy: { mode: StrategyModes.SINGLE },
      targets: [],
      hooks: [],
      trace_id: 'test-trace',
    };

    mockSuperAgentsConfig = mockSuperAgentsConfig2;

    // Mock next function
    mockNext = vi.fn();
  });

  describe('URL filtering', () => {
    it('should process v1 API requests (not Super Agents)', async () => {
      const mockAgent: Agent = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test-agent',
        description: 'Test agent description',
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const mockSkill: Skill = {
        id: '223e4567-e89b-12d3-a456-426614174000',
        agent_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'test-skill',
        description: 'Test skill description',
        metadata: {},
        optimize: false,
        configuration_count: 1,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        clustering_interval: 0,
        reflection_min_requests_per_arm: 0,
        exploration_temperature: 1.0,
        last_clustering_at: null,
        last_clustering_log_start_time: null,
        evaluations_regenerated_at: null,
        evaluation_lock_acquired_at: null,
        total_requests: 0,
        allowed_template_variables: ['datetime'],
      };

      vi.mocked(agentsUtils.getAgent).mockResolvedValue(mockAgent);
      vi.mocked(skillsUtils.getSkill).mockResolvedValue(mockSkill);

      const mockContext = createMockContext(
        'https://api.example.com/v1/chat/completions',
      );
      await agentAndSkillMiddleware(mockContext, mockNext);

      expect(agentsUtils.getAgent).toHaveBeenCalledWith(
        expect.anything(),
        mockConnector,
        'test-agent',
      );
      expect(skillsUtils.getSkill).toHaveBeenCalledWith(
        expect.anything(),
        mockConnector,
        '123e4567-e89b-12d3-a456-426614174000',
        'test-agent',
        'test-skill',
      );
      expect(mockContext.set).toHaveBeenCalledWith('agent', mockAgent);
      expect(mockContext.set).toHaveBeenCalledWith('skill', mockSkill);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should skip processing for Super Agents API requests', async () => {
      const mockContext = createMockContext(
        'https://api.example.com/v1/super-agents/logs',
      );
      await agentAndSkillMiddleware(mockContext, mockNext);

      expect(agentsUtils.getAgent).not.toHaveBeenCalled();
      expect(skillsUtils.getSkill).not.toHaveBeenCalled();
      expect(mockContext.set).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should skip processing for non-v1 requests', async () => {
      const mockContext = createMockContext('https://api.example.com/health');
      await agentAndSkillMiddleware(mockContext, mockNext);

      expect(agentsUtils.getAgent).not.toHaveBeenCalled();
      expect(skillsUtils.getSkill).not.toHaveBeenCalled();
      expect(mockContext.set).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('v1 API endpoint variations', () => {
    const testUrls = [
      'https://api.example.com/v1/chat/completions',
      'https://api.example.com/v1/completions',
      'https://api.example.com/v1/embeddings',
    ];

    testUrls.forEach((url) => {
      it(`should process request for ${url}`, async () => {
        const mockAgent: Agent = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'test-agent',
          description: 'Test agent description',
          metadata: {},
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        };

        const mockSkill: Skill = {
          id: '223e4567-e89b-12d3-a456-426614174000',
          agent_id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'test-skill',
          description: 'Test skill description',
          metadata: {},
          optimize: false,
          configuration_count: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
          clustering_interval: 0,
          reflection_min_requests_per_arm: 0,
          exploration_temperature: 1.0,
          last_clustering_at: null,
          last_clustering_log_start_time: null,
          evaluations_regenerated_at: null,
          evaluation_lock_acquired_at: null,
          total_requests: 0,
          allowed_template_variables: ['datetime'],
        };

        vi.mocked(agentsUtils.getAgent).mockResolvedValue(mockAgent);
        vi.mocked(skillsUtils.getSkill).mockResolvedValue(mockSkill);

        const mockContext = createMockContext(url);
        await agentAndSkillMiddleware(mockContext, mockNext);

        expect(agentsUtils.getAgent).toHaveBeenCalledWith(
          expect.anything(),
          mockConnector,
          'test-agent',
        );
        expect(skillsUtils.getSkill).toHaveBeenCalledWith(
          expect.anything(),
          mockConnector,
          '123e4567-e89b-12d3-a456-426614174000',
          'test-agent',
          'test-skill',
        );
        expect(mockContext.set).toHaveBeenCalledWith('agent', mockAgent);
        expect(mockContext.set).toHaveBeenCalledWith('skill', mockSkill);
      });
    });
  });

  describe('Super Agents API endpoint variations', () => {
    const saUrls = [
      'https://api.example.com/v1/super-agents/logs',
      'https://api.example.com/v1/super-agents/auth/login',
      'https://api.example.com/v1/super-agents/feedbacks',
    ];

    saUrls.forEach((url) => {
      it(`should skip processing for ${url}`, async () => {
        const mockContext = createMockContext(url);
        await agentAndSkillMiddleware(mockContext, mockNext);

        expect(agentsUtils.getAgent).not.toHaveBeenCalled();
        expect(skillsUtils.getSkill).not.toHaveBeenCalled();
        expect(mockContext.set).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from getOrCreateAgent', async () => {
      const error = new Error('Failed to get or create agent');
      vi.mocked(agentsUtils.getAgent).mockRejectedValue(error);
      vi.mocked(skillsUtils.getSkill).mockResolvedValue({} as Skill);

      const mockContext = createMockContext(
        'https://api.example.com/v1/chat/completions',
      );

      await expect(
        agentAndSkillMiddleware(mockContext, mockNext),
      ).rejects.toThrow('Failed to get or create agent');

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should propagate errors from getOrCreateSkill', async () => {
      const error = new Error('Failed to get or create skill');
      vi.mocked(agentsUtils.getAgent).mockResolvedValue({} as Agent);
      vi.mocked(skillsUtils.getSkill).mockRejectedValue(error);

      const mockContext = createMockContext(
        'https://api.example.com/v1/chat/completions',
      );

      await expect(
        agentAndSkillMiddleware(mockContext, mockNext),
      ).rejects.toThrow('Failed to get or create skill');

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('configuration scenarios', () => {
    it('should handle different agent and skill names', async () => {
      const customConfig: SuperAgentsConfig = {
        agent_name: 'custom-agent-123',
        skill_name: 'custom-skill-456',
        strategy: { mode: StrategyModes.SINGLE },
        targets: [],
        hooks: [],
        trace_id: 'test-trace',
      };

      const mockAgent: Agent = {
        id: 'custom-agent-uuid-123',
        name: 'custom-agent-123',
        description: 'Custom agent description',
        metadata: {},
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      };

      const customMockContext = {
        req: { url: 'https://api.example.com/v1/chat/completions' } as unknown,
        get: vi.fn().mockImplementation((key: string) => {
          switch (key) {
            case 'sa_config_pre_processed':
              return customConfig;
            case 'user_data_storage_connector':
              return mockConnector;
            default:
              return undefined;
          }
        }),
        set: vi.fn(),
      } as unknown;

      vi.mocked(agentsUtils.getAgent).mockResolvedValue(mockAgent);
      vi.mocked(skillsUtils.getSkill).mockResolvedValue({} as Skill);

      await agentAndSkillMiddleware(
        customMockContext as unknown as AppContext,
        mockNext,
      );

      expect(agentsUtils.getAgent).toHaveBeenCalledWith(
        expect.anything(),
        mockConnector,
        'custom-agent-123',
      );
      expect(skillsUtils.getSkill).toHaveBeenCalledWith(
        expect.anything(),
        mockConnector,
        'custom-agent-uuid-123',
        'custom-agent-123',
        'custom-skill-456',
      );
    });
  });
});
