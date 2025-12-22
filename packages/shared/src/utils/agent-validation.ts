import type { Agent } from '@shared/types/data';

export interface AgentValidationResult {
  isReady: boolean;
  missingRequirements: string[];
}

/**
 * Validates whether an agent is ready for use.
 * An agent is considered ready if it has at least one skill configured.
 *
 * @param _agent - The agent to validate (reserved for future validation rules)
 * @param skillsCount - The number of skills configured for this agent
 * @returns Validation result with readiness status and missing requirements
 */
export function validateAgent(
  _agent: Agent,
  skillsCount: number,
): AgentValidationResult {
  const missingRequirements: string[] = [];

  if (skillsCount === 0) {
    missingRequirements.push('At least one skill must be configured');
  }

  return {
    isReady: missingRequirements.length === 0,
    missingRequirements,
  };
}

/**
 * Checks if an agent is ready based on skills count.
 *
 * @param skillsCount - The number of skills configured for the agent
 * @returns True if the agent has at least one skill
 */
export function isAgentReady(skillsCount: number): boolean {
  return skillsCount > 0;
}
