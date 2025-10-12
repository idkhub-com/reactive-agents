import { API_URL } from '@client/constants';
import type { IdkRoute } from '@server/api/v1';
import {
  Model,
  Skill,
  type SkillCreateParams,
  SkillOptimizationArm,
  SkillOptimizationEvaluationRun,
  type SkillQueryParams,
  type SkillUpdateParams,
} from '@shared/types/data';
import { SkillOptimizationCluster } from '@shared/types/data/skill-optimization-cluster';
import { SkillOptimizationEvaluation } from '@shared/types/data/skill-optimization-evaluation';
import type { EvaluationMethodName } from '@shared/types/evaluations';
import { hc } from 'hono/client';

const client = hc<IdkRoute>(API_URL);

export async function createSkill(params: SkillCreateParams): Promise<Skill> {
  const response = await client.v1.idk.skills.$post({
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to create skill');
  }

  return Skill.parse(await response.json());
}

export async function getSkills(params: SkillQueryParams): Promise<Skill[]> {
  const response = await client.v1.idk.skills.$get({
    query: {
      id: params.id,
      agent_id: params.agent_id,
      name: params.name,
      limit: params.limit?.toString(),
      offset: params.offset?.toString(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch skills');
  }

  return Skill.array().parse(await response.json());
}

export async function updateSkill(
  id: string,
  params: SkillUpdateParams,
): Promise<Skill> {
  const response = await client.v1.idk.skills[':skillId'].$patch({
    param: {
      skillId: id,
    },
    json: params,
  });

  if (!response.ok) {
    throw new Error('Failed to update skill');
  }

  return Skill.parse(await response.json());
}

export async function deleteSkill(id: string): Promise<void> {
  const response = await client.v1.idk.skills[':skillId'].$delete({
    param: {
      skillId: id,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete skill');
  }
}

export async function getSkillModels(skillId: string): Promise<Model[]> {
  const response = await client.v1.idk.skills[':skillId'].models.$get({
    param: {
      skillId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch models for skill');
  }

  return Model.array().parse(await response.json());
}

export async function addModelsToSkill(
  skillId: string,
  modelIds: string[],
): Promise<void> {
  const response = await client.v1.idk.skills[':skillId'].models.$post({
    param: {
      skillId,
    },
    json: { modelIds },
  });

  if (!response.ok) {
    throw new Error('Failed to add models to skill');
  }
}

export async function removeModelsFromSkill(
  skillId: string,
  modelIds: string[],
): Promise<void> {
  const response = await client.v1.idk.skills[':skillId'].models.$delete({
    param: {
      skillId,
    },
    query: { ids: modelIds },
  });

  if (!response.ok) {
    throw new Error('Failed to remove models from skill');
  }
}

export async function getSkillClusterStates(
  skillId: string,
): Promise<SkillOptimizationCluster[]> {
  const response = await client.v1.idk.skills[':skillId'].clusters.$get({
    param: {
      skillId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch cluster states for skill');
  }

  return SkillOptimizationCluster.array().parse(await response.json());
}

export async function getSkillArms(
  skillId: string,
): Promise<SkillOptimizationArm[]> {
  const response = await client.v1.idk.skills[':skillId'].arms.$get({
    param: {
      skillId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch skill arms');
  }

  return SkillOptimizationArm.array().parse(await response.json());
}

export async function generateSkillArms(
  skillId: string,
): Promise<SkillOptimizationArm[]> {
  const response = await client.v1.idk.skills[':skillId'][
    'generate-arms'
  ].$post({
    param: {
      skillId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to generate skill arms');
  }

  return SkillOptimizationArm.array().parse(await response.json());
}

export async function getSkillEvaluationRuns(
  skillId: string,
): Promise<SkillOptimizationEvaluationRun[]> {
  const response = await client.v1.idk.skills[':skillId'][
    'evaluation-runs'
  ].$get({
    param: {
      skillId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch evaluation runs');
  }

  return SkillOptimizationEvaluationRun.array().parse(await response.json());
}

export async function getSkillEvaluations(
  skillId: string,
): Promise<SkillOptimizationEvaluation[]> {
  const response = await client.v1.idk.skills[':skillId'].evaluations.$get({
    param: {
      skillId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch skill evaluations');
  }

  return SkillOptimizationEvaluation.array().parse(await response.json());
}

export async function createSkillEvaluation(
  skillId: string,
  methods: EvaluationMethodName[],
): Promise<SkillOptimizationEvaluation[]> {
  const response = await client.v1.idk.skills[':skillId'].evaluations.$post({
    param: {
      skillId,
    },
    json: {
      methods,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to create skill evaluation');
  }

  return SkillOptimizationEvaluation.array().parse(await response.json());
}

export async function deleteSkillEvaluation(
  skillId: string,
  evaluationId: string,
): Promise<void> {
  const response = await client.v1.idk.skills[':skillId'].evaluations[
    ':evaluationId'
  ].$delete({
    param: {
      skillId,
      evaluationId,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete skill evaluation');
  }
}
