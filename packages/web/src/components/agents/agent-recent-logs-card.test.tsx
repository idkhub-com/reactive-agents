import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * The agent dashboard's recent-logs preview: agent-wide scope, a labeled
 * header row (an unlabeled table left readers guessing what the columns
 * mean), the skill that served each log, and a click-through to the
 * agent-wide logs page.
 */

const navigate = vi.fn();
const setAgentId = vi.fn();
const setSkillId = vi.fn();
const setAgentWide = vi.fn();

vi.mock('@web/hooks/use-permissive-navigate', () => ({
  usePermissiveNavigate: () => navigate,
}));

vi.mock('@web/providers/agents', () => ({
  useAgents: () => ({
    selectedAgent: { id: 'agent-1', name: 'menjivar-website' },
  }),
}));

vi.mock('@web/providers/skills', () => ({
  useSkills: () => ({
    skills: [{ id: 'skill-2', name: 'generate-thread-titles' }],
  }),
}));

vi.mock('@web/providers/logs', () => ({
  useLogs: () => ({
    logs: [
      {
        id: 'log-1',
        skill_id: 'skill-2',
        function_name: 'chat_complete',
        model: 'glm-5.3',
        duration: 1200,
      },
    ],
    isLoading: false,
    setAgentId,
    setSkillId,
    setAgentWide,
  }),
}));

import { AgentRecentLogsCard } from '@web/components/agents/agent-recent-logs-card';

describe('AgentRecentLogsCard', () => {
  it('labels the columns and names the skill that served each log', () => {
    render(<AgentRecentLogsCard />);

    expect(setAgentWide).toHaveBeenCalledWith(true);
    for (const header of ['Function', 'Model', 'Skill', 'Duration']) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
    expect(screen.getByText('generate-thread-titles')).toBeInTheDocument();
    expect(screen.getByText('1200ms')).toBeInTheDocument();
  });

  it('opens the agent-wide logs page', () => {
    render(<AgentRecentLogsCard />);

    fireEvent.click(screen.getByText('Recent requests across all skills'));

    expect(navigate).toHaveBeenCalledWith({
      to: '/agents/menjivar-website/logs',
    });
  });
});
