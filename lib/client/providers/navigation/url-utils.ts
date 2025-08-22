import type { Agent, Skill } from '@shared/types/data';

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

export function encodeAgentName(name: string): string {
  return encodeURIComponent(name);
}

export function encodeSkillName(name: string): string {
  return encodeURIComponent(name);
}
