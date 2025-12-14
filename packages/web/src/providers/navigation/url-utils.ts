import type { Agent, Skill } from '@shared/types/data';
import type { SkillOptimizationArm } from '@shared/types/data/skill-optimization-arm';
import type { SkillOptimizationCluster } from '@shared/types/data/skill-optimization-cluster';

// Remove potentially dangerous HTML tags but preserve spacing/case
export function sanitizeName(name: string): string {
  return name.replace(/<[^>]*>/g, '').trim();
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getAgentByName(
  agents: Agent[],
  name: string,
): Agent | undefined {
  const target = sanitizeName(safeDecodeURIComponent(name));
  return agents.find((agent) => sanitizeName(agent.name) === target);
}

export function getSkillByName(
  skills: Skill[],
  name: string,
): Skill | undefined {
  const target = sanitizeName(safeDecodeURIComponent(name));
  return skills.find((skill) => sanitizeName(skill.name) === target);
}

export function getClusterByName(
  clusters: SkillOptimizationCluster[],
  name: string,
): SkillOptimizationCluster | undefined {
  const target = sanitizeName(safeDecodeURIComponent(name));
  return clusters.find((cluster) => sanitizeName(cluster.name) === target);
}

export function getArmByName(
  arms: SkillOptimizationArm[],
  name: string,
): SkillOptimizationArm | undefined {
  const target = sanitizeName(safeDecodeURIComponent(name));
  return arms.find((arm) => sanitizeName(arm.name) === target);
}
