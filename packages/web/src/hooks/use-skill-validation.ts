import {
  getSkillEvaluations,
  getSkillModels,
} from '@client/api/v1/reactive-agents/skills';
import type { Skill } from '@shared/types/data';
import { isSkillReady } from '@shared/utils/skill-validation';
import { useQuery } from '@tanstack/react-query';

export interface UseSkillValidationResult {
  isReady: boolean;
  modelsCount: number;
  evaluationsCount: number;
  isLoading: boolean;
  missingRequirements: string[];
}

/**
 * Hook to check if a skill is ready (has required models and evaluations).
 * Fetches the models and evaluations count for the skill and returns validation status.
 *
 * @param skill - The skill to validate
 * @returns Validation result with readiness status, counts, and loading state
 */
export function useSkillValidation(
  skill: Skill | null | undefined,
): UseSkillValidationResult {
  const { data: models = [], isLoading: isLoadingModels } = useQuery({
    queryKey: ['skill-validation-models', skill?.id],
    queryFn: async () => {
      if (!skill) return [];
      return await getSkillModels(skill.id);
    },
    enabled: !!skill,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const { data: evaluations = [], isLoading: isLoadingEvaluations } = useQuery({
    queryKey: ['skill-validation-evaluations', skill?.id],
    queryFn: async () => {
      if (!skill) return [];
      return await getSkillEvaluations(skill.id);
    },
    enabled: !!skill,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const modelsCount = models.length;
  const evaluationsCount = evaluations.length;
  const optimize = skill?.optimize ?? false;
  const isLoading = isLoadingModels || isLoadingEvaluations;
  const ready = isSkillReady(modelsCount, evaluationsCount, optimize);

  const missingRequirements: string[] = [];

  if (modelsCount === 0) {
    missingRequirements.push('At least one model must be configured');
  }

  if (optimize && evaluationsCount === 0) {
    missingRequirements.push('At least one evaluation must be configured');
  }

  return {
    isReady: ready,
    modelsCount,
    evaluationsCount,
    isLoading,
    missingRequirements,
  };
}
