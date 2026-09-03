import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The agent's logs page: one table over every skill's logs, or one skill's
 * when `?skill=` names it. What matters: the scope it asks the provider for
 * (agent-wide, or the named skill), the middle column (skill across the
 * agent, partition within a skill), and that a row opens the log detail.
 */

const navigateToLogDetail = vi.fn();
const setAgentId = vi.fn();
const setSkillId = vi.fn();
const setAgentWide = vi.fn();
const setSkillQueryParams = vi.fn();

vi.mock('@web/providers/agents', () => ({
  useAgents: () => ({
    selectedAgent: { id: 'agent-1', name: 'menjivar-website' },
  }),
}));

vi.mock('@web/providers/skills', () => ({
  useSkills: () => ({
    skills: [
      { id: 'skill-1', name: 'maintain-blog-codebase' },
      { id: 'skill-2', name: 'generate-thread-titles' },
    ],
    setQueryParams: setSkillQueryParams,
  }),
}));

vi.mock('@web/providers/logs', () => ({
  useLogs: () => ({
    logs: [
      {
        id: 'log-1',
        skill_id: 'skill-2',
        status: 200,
        method: 'POST',
        function_name: 'chat_complete',
        endpoint: '/v1/chat/completions',
        model: 'glm-5.3',
        start_time: 1756700000000,
        duration: 1200,
        avg_eval_score: 0.9,
        ai_provider_request_log: { request_body: { temperature: 0.7 } },
      },
    ],
    isLoading: false,
    setAgentId,
    setSkillId,
    setAgentWide,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    setPage: vi.fn(),
    setPageSize: vi.fn(),
  }),
}));

vi.mock('@web/providers/navigation', () => ({
  useNavigation: () => ({ navigateToLogDetail }),
}));

vi.mock('@web/hooks/use-smart-back', () => ({
  useSmartBack: () => vi.fn(),
}));

const setClustersSkillId = vi.fn();
vi.mock('@web/providers/skill-optimization-clusters', () => ({
  useSkillOptimizationClusters: () => ({
    clusters: [{ id: 'cluster-1', name: 'partition-a' }],
    setSkillId: setClustersSkillId,
  }),
}));

// The filter lives in the URL: `?skill=<name>`
const navigate = vi.fn();
let search: { skill?: string } = {};
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
  useSearch: () => search,
  useRouter: () => ({ history: { back: vi.fn() } }),
}));

import { AgentLogsView } from '@web/components/agents/agent-logs-view';

beforeEach(() => {
  vi.clearAllMocks();
  search = {};
});

describe('AgentLogsView', () => {
  it('fetches agent-wide and shows which skill served each log', () => {
    render(<AgentLogsView />);

    // The provider is put in agent-wide mode, with no skill filter
    expect(setAgentId).toHaveBeenCalledWith('agent-1');
    expect(setAgentWide).toHaveBeenCalledWith(true);
    expect(setSkillId).toHaveBeenCalledWith(null);
    // And the agent's skills are loaded, to name the logs' skills
    expect(setSkillQueryParams).toHaveBeenCalledWith({
      agent_id: 'agent-1',
      limit: 100,
    });

    expect(screen.getByText('Skill')).toBeInTheDocument();
    expect(screen.getByText('generate-thread-titles')).toBeInTheDocument();
  });

  it('opens the log detail from a row', () => {
    render(<AgentLogsView />);

    fireEvent.click(screen.getByText('generate-thread-titles'));

    expect(navigateToLogDetail).toHaveBeenCalledWith(
      'menjivar-website',
      'log-1',
    );
  });

  it('narrows the scope to the skill named in the URL', () => {
    search = { skill: 'generate-thread-titles' };
    render(<AgentLogsView />);

    expect(setSkillId).toHaveBeenCalledWith('skill-2');
    expect(setAgentWide).toHaveBeenCalledWith(false);
    expect(setClustersSkillId).toHaveBeenCalledWith('skill-2');
    expect(
      screen.getByText('Request logs for generate-thread-titles'),
    ).toBeInTheDocument();
    // Within one skill the column that means something is the partition
    expect(screen.getByText('Partition')).toBeInTheDocument();
    expect(screen.queryByText('Skill')).not.toBeInTheDocument();
  });

  it('waits for a named skill to resolve rather than showing everything', () => {
    search = { skill: 'not-loaded-yet' };
    render(<AgentLogsView />);

    expect(setAgentWide).toHaveBeenCalledWith(false);
    expect(setSkillId).toHaveBeenCalledWith(null);
  });
});
