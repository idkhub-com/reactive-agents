import { agentAndSkillMiddleware } from '@server/middlewares/agent-and-skill';
import type { AppContext } from '@server/types/hono';
import * as agentsUtils from '@server/utils/idkhub/agents';
import * as skillsUtils from '@server/utils/idkhub/skills';
import {
  type IdkConfig,
  StrategyModes,
} from '@shared/types/api/request/headers';
import type { Agent } from '@shared/types/data/agent';
import type { Skill } from '@shared/types/data/skill';
import type { Next } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the utility functions
vi.mock('@server/utils/idkhub/agents');
vi.mock('@server/utils/idkhub/skills');

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
    // Tool methods (required by interface)
    getTools: vi.fn(),
    createTool: vi.fn(),
    deleteTool: vi.fn(),
  };
  let mockIdkConfig: IdkConfig;

  const createMockContext = (url: string): AppContext => {
    return {
      req: { url } as unknown,
      get: vi.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'idk_config_pre_processed':
            return mockIdkConfig;
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

    // Mock IDK config
    const mockIdkConfig2: IdkConfig = {
      agent_name: 'test-agent',
      skill_name: 'test-skill',
      strategy: { mode: StrategyModes.SINGLE },
      targets: [],
      hooks: [],
      trace_id: 'test-trace',
    };

    mockIdkConfig = mockIdkConfig2;

    // Mock next function
    mockNext = vi.fn();
  });

  describe('URL filtering', () => {
    it('should process v1 API requests (not IDK)', async () => {
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
        system_prompt_count: 0,
        clustering_interval: 0,
        reflection_min_requests_per_arm: 0,
      };

      vi.mocked(agentsUtils.getAgent).mockResolvedValue(mockAgent);
      vi.mocked(skillsUtils.getSkill).mockResolvedValue(mockSkill);

      const mockContext = createMockContext(
        'https://api.example.com/v1/chat/completions',
      );
      await agentAndSkillMiddleware(mockContext, mockNext);

      expect(agentsUtils.getAgent).toHaveBeenCalledWith(
        mockConnector,
        'test-agent',
      );
      expect(skillsUtils.getSkill).toHaveBeenCalledWith(
        mockConnector,
        '123e4567-e89b-12d3-a456-426614174000',
        'test-skill',
      );
      expect(mockContext.set).toHaveBeenCalledWith('agent', mockAgent);
      expect(mockContext.set).toHaveBeenCalledWith('skill', mockSkill);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should skip processing for IDK API requests', async () => {
      const mockContext = createMockContext(
        'https://api.example.com/v1/idk/logs',
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
          system_prompt_count: 0,
          clustering_interval: 0,
          reflection_min_requests_per_arm: 0,
        };

        vi.mocked(agentsUtils.getAgent).mockResolvedValue(mockAgent);
        vi.mocked(skillsUtils.getSkill).mockResolvedValue(mockSkill);

        const mockContext = createMockContext(url);
        await agentAndSkillMiddleware(mockContext, mockNext);

        expect(agentsUtils.getAgent).toHaveBeenCalledWith(
          mockConnector,
          'test-agent',
        );
        expect(skillsUtils.getSkill).toHaveBeenCalledWith(
          mockConnector,
          '123e4567-e89b-12d3-a456-426614174000',
          'test-skill',
        );
        expect(mockContext.set).toHaveBeenCalledWith('agent', mockAgent);
        expect(mockContext.set).toHaveBeenCalledWith('skill', mockSkill);
      });
    });
  });

  describe('IDK API endpoint variations', () => {
    const idkUrls = [
      'https://api.example.com/v1/idk/logs',
      'https://api.example.com/v1/idk/auth/login',
      'https://api.example.com/v1/idk/feedbacks',
    ];

    idkUrls.forEach((url) => {
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
      const customConfig: IdkConfig = {
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
            case 'idk_config_pre_processed':
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
        mockConnector,
        'custom-agent-123',
      );
      expect(skillsUtils.getSkill).toHaveBeenCalledWith(
        mockConnector,
        'custom-agent-uuid-123',
        'custom-skill-456',
      );
    });
  });
});
