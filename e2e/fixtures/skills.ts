import type { APIRequestContext } from '@playwright/test';

export const SKILLS_PATH = '/v1/super-agents/skills';

/** The API rejects a description shorter than 25 characters. */
export const SAMPLE_SKILL_DESCRIPTION =
  'A skill created by the end-to-end suite to exercise column type mapping.';

export interface Skill {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  metadata: Record<string, unknown>;
  optimize: boolean;
  configuration_count: number;
  clustering_interval: number;
  reflection_min_requests_per_arm: number;
  exploration_temperature: number;
  allowed_template_variables: string[];
  last_clustering_at: string | null;
  last_clustering_log_start_time: number | null;
  evaluations_regenerated_at: string | null;
  evaluation_lock_acquired_at: string | null;
  created_at: string;
  updated_at: string;
}

export const createSkill = async (
  request: APIRequestContext,
  agentId: string,
  name: string,
  overrides: Record<string, unknown> = {},
): Promise<Skill> => {
  const response = await request.post(SKILLS_PATH, {
    data: {
      agent_id: agentId,
      name,
      description: SAMPLE_SKILL_DESCRIPTION,
      metadata: {},
      optimize: false,
      ...overrides,
    },
  });

  if (response.status() !== 201) {
    throw new Error(
      `Failed to create skill "${name}": ${response.status()} ${await response.text()}`,
    );
  }

  return response.json() as Promise<Skill>;
};

export const getSkills = async (
  request: APIRequestContext,
  params: Record<string, string>,
): Promise<Skill[]> => {
  const response = await request.get(SKILLS_PATH, { params });

  if (response.status() !== 200) {
    throw new Error(
      `Failed to list skills: ${response.status()} ${await response.text()}`,
    );
  }

  return response.json() as Promise<Skill[]>;
};
