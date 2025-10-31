import { getSkills } from '@client/api/v1/reactive-agents/skills';
import type { Agent } from '@shared/types/data';
import { isAgentReady } from '@shared/utils/agent-validation';
import { useQuery } from '@tanstack/react-query';

export interface UseAgentValidationResult {
  isReady: boolean;
  skillsCount: number;
  isLoading: boolean;
  missingRequirements: string[];
}

/**
 * Hook to check if an agent is ready (has at least one skill).
 * Fetches the skills count for the agent and returns validation status.
 *
 * @param agent - The agent to validate
 * @returns Validation result with readiness status, skills count, and loading state
 */
export function useAgentValidation(
  agent: Agent | null | undefined,
): UseAgentValidationResult {
  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['agent-validation', agent?.id],
    queryFn: async () => {
      if (!agent) return [];
      return await getSkills({ agent_id: agent.id });
    },
    enabled: !!agent,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const skillsCount = skills.length;
  const ready = isAgentReady(skillsCount);
  const missingRequirements: string[] = [];

  if (!ready) {
    missingRequirements.push('At least one skill must be configured');
  }

  return {
    isReady: ready,
    skillsCount,
    isLoading,
    missingRequirements,
  };
}
