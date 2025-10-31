import {
  getSkillEvaluations,
  getSkillModels,
  getSkills,
} from '@client/api/v1/reactive-agents/skills';
import type { Agent } from '@shared/types/data';
import { isSkillReady } from '@shared/utils/skill-validation';
import { useQuery } from '@tanstack/react-query';

export interface UseAgentUnreadySkillsResult {
  hasUnreadySkills: boolean;
  unreadySkillsCount: number;
  isLoading: boolean;
}

/**
 * Hook to check if an agent has any skills that are not ready.
 * A skill is not ready if it's missing models or evaluations (when optimization is enabled).
 *
 * @param agent - The agent to check
 * @returns Result with unready skills status and count
 */
export function useAgentUnreadySkills(
  agent: Agent | null | undefined,
): UseAgentUnreadySkillsResult {
  // Fetch all skills for the agent
  const { data: skills = [], isLoading: isLoadingSkills } = useQuery({
    queryKey: ['agent-unready-skills', agent?.id],
    queryFn: async () => {
      if (!agent) return [];
      return await getSkills({ agent_id: agent.id });
    },
    enabled: !!agent,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Fetch models and evaluations for each skill
  const { data: skillsData = [], isLoading: isLoadingSkillsData } = useQuery({
    queryKey: ['agent-unready-skills-data', agent?.id, skills.map((s) => s.id)],
    queryFn: async () => {
      if (!agent || skills.length === 0) return [];

      // Fetch models and evaluations for all skills in parallel
      const skillsWithData = await Promise.all(
        skills.map(async (skill) => {
          const [models, evaluations] = await Promise.all([
            getSkillModels(skill.id),
            getSkillEvaluations(skill.id),
          ]);

          return {
            skill,
            modelsCount: models.length,
            evaluationsCount: evaluations.length,
          };
        }),
      );

      return skillsWithData;
    },
    enabled: !!agent && skills.length > 0,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Count unready skills
  const unreadySkillsCount = skillsData.filter(
    ({ skill, modelsCount, evaluationsCount }) => {
      const optimize = skill.optimize ?? false;
      return !isSkillReady(modelsCount, evaluationsCount, optimize);
    },
  ).length;

  return {
    hasUnreadySkills: unreadySkillsCount > 0,
    unreadySkillsCount,
    isLoading: isLoadingSkills || isLoadingSkillsData,
  };
}
