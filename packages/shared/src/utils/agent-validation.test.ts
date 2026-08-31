import type { Agent } from '@shared/types/data';
import { isAgentReady, validateAgent } from '@shared/utils/agent-validation';
import { describe, expect, it } from 'vitest';

const agent = (auto_create_skills: boolean): Agent =>
  ({ id: 'agent-1', name: 'helper', auto_create_skills }) as Agent;

describe('validateAgent', () => {
  describe('an agent that creates skills automatically', () => {
    it('is ready with default models, skills or not', () => {
      expect(validateAgent(agent(true), 0, 1)).toEqual({
        isReady: true,
        missingRequirements: [],
      });
      expect(validateAgent(agent(true), 3, 2).isReady).toBe(true);
    });

    it('asks for default models, even when it has skills', () => {
      for (const skillsCount of [0, 3]) {
        const result = validateAgent(agent(true), skillsCount, 0);
        expect(result.isReady).toBe(false);
        expect(result.missingRequirements).toHaveLength(1);
        expect(result.missingRequirements[0]).toMatch(/^Add default models/);
      }
    });
  });

  describe('an agent that keeps its skills', () => {
    it('is ready with a skill, default models or not', () => {
      expect(validateAgent(agent(false), 1)).toEqual({
        isReady: true,
        missingRequirements: [],
      });
    });

    it('needs a skill, and default models are no substitute', () => {
      expect(validateAgent(agent(false), 0, 2)).toEqual({
        isReady: false,
        missingRequirements: ['At least one skill must be configured'],
      });
    });
  });
});

describe('isAgentReady', () => {
  it('follows validateAgent', () => {
    expect(isAgentReady(agent(true), 0, 1)).toBe(true);
    expect(isAgentReady(agent(true), 2)).toBe(false);
    expect(isAgentReady(agent(false), 0)).toBe(false);
    expect(isAgentReady(agent(false), 1)).toBe(true);
  });
});
