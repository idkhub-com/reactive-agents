import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * The agent-wide logs page: one table over every skill's logs. What matters:
 * it asks the provider for the agent-wide scope (no skill id), names each
 * log's skill in the table, and a row opens the skill-scoped log detail.
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

import { AgentLogsView } from '@web/components/agents/agent-logs-view';

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

  it('opens the skill-scoped log detail from a row', () => {
    render(<AgentLogsView />);

    fireEvent.click(screen.getByText('generate-thread-titles'));

    expect(navigateToLogDetail).toHaveBeenCalledWith(
      'menjivar-website',
      'generate-thread-titles',
      'log-1',
    );
  });
});
