import type { Skill } from '@shared/types/data';

export interface SkillValidationResult {
  isReady: boolean;
  missingRequirements: string[];
}

/**
 * Validates whether a skill is ready for use.
 * A skill is considered ready if:
 * - It has at least one model configured
 * - If optimization is enabled, it must have at least one evaluation
 *
 * @param _skill - The skill to validate (reserved for future validation rules)
 * @param modelsCount - The number of models configured for this skill
 * @param evaluationsCount - The number of evaluations configured for this skill
 * @param optimize - Whether optimization is enabled for this skill
 * @returns Validation result with readiness status and missing requirements
 */
export function validateSkill(
  _skill: Skill,
  modelsCount: number,
  evaluationsCount: number,
  optimize: boolean,
): SkillValidationResult {
  const missingRequirements: string[] = [];

  if (modelsCount === 0) {
    missingRequirements.push('At least one model must be configured');
  }

  if (optimize && evaluationsCount === 0) {
    missingRequirements.push('At least one evaluation must be configured');
  }

  return {
    isReady: missingRequirements.length === 0,
    missingRequirements,
  };
}

/**
 * Checks if a skill is ready based on models and evaluations count.
 *
 * @param modelsCount - The number of models configured for the skill
 * @param evaluationsCount - The number of evaluations configured for the skill
 * @param optimize - Whether optimization is enabled for the skill
 * @returns True if the skill meets all requirements
 */
export function isSkillReady(
  modelsCount: number,
  evaluationsCount: number,
  optimize: boolean,
): boolean {
  if (modelsCount === 0) return false;
  if (optimize && evaluationsCount === 0) return false;
  return true;
}
