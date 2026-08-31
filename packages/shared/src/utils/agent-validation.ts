import type { Agent } from '@shared/types/data';

export interface AgentValidationResult {
  isReady: boolean;
  missingRequirements: string[];
}

/**
 * Whether an agent can serve whatever is sent to it.
 *
 * An agent that creates skills automatically needs default models, whether
 * or not it has skills yet: the skills the gateway creates take them, and a
 * skill created without any cannot serve a request. An agent that keeps its
 * skills as they are needs at least one.
 *
 * @param agent - The agent to validate
 * @param skillsCount - How many skills the agent has
 * @param defaultModelsCount - How many default models the agent has
 */
export function validateAgent(
  agent: Agent,
  skillsCount: number,
  defaultModelsCount = 0,
): AgentValidationResult {
  const missingRequirements: string[] = [];

  if (agent.auto_create_skills) {
    if (defaultModelsCount === 0) {
      missingRequirements.push(
        'Add default models: the skills this agent creates from requests take them, and cannot serve requests without them',
      );
    }
  } else if (skillsCount === 0) {
    missingRequirements.push('At least one skill must be configured');
  }

  return {
    isReady: missingRequirements.length === 0,
    missingRequirements,
  };
}

/** `validateAgent`, as a yes or no. */
export function isAgentReady(
  agent: Agent,
  skillsCount: number,
  defaultModelsCount = 0,
): boolean {
  return validateAgent(agent, skillsCount, defaultModelsCount).isReady;
}
