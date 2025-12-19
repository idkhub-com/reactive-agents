import { compareModels, sortModels } from '@web/utils/model-sorting';
import { describe, expect, it } from 'vitest';

describe('model-sorting', () => {
  describe('compareModels', () => {
    it('sorts by model name alphabetically', () => {
      const modelA = { modelName: 'Alpha' };
      const modelB = { modelName: 'Beta' };

      expect(compareModels(modelA, modelB)).toBeLessThan(0);
      expect(compareModels(modelB, modelA)).toBeGreaterThan(0);
    });

    it('returns 0 for identical model names and providers', () => {
      const modelA = { modelName: 'Alpha', providerName: 'OpenAI' };
      const modelB = { modelName: 'Alpha', providerName: 'OpenAI' };

      expect(compareModels(modelA, modelB)).toBe(0);
    });

    it('sorts by provider name when model names are equal', () => {
      const modelA = { modelName: 'GPT-4', providerName: 'Azure' };
      const modelB = { modelName: 'GPT-4', providerName: 'OpenAI' };

      expect(compareModels(modelA, modelB)).toBeLessThan(0);
      expect(compareModels(modelB, modelA)).toBeGreaterThan(0);
    });

    it('is case-insensitive', () => {
      const modelA = { modelName: 'alpha' };
      const modelB = { modelName: 'ALPHA' };

      expect(compareModels(modelA, modelB)).toBe(0);
    });

    it('supports "name" property as fallback for modelName', () => {
      const modelA = { name: 'Alpha' };
      const modelB = { name: 'Beta' };

      expect(compareModels(modelA, modelB)).toBeLessThan(0);
    });

    it('supports "provider" property as fallback for providerName', () => {
      const modelA = { name: 'GPT-4', provider: 'Azure' };
      const modelB = { name: 'GPT-4', provider: 'OpenAI' };

      expect(compareModels(modelA, modelB)).toBeLessThan(0);
    });

    it('prefers modelName over name when both exist', () => {
      const modelA = { modelName: 'Alpha', name: 'Zeta' };
      const modelB = { modelName: 'Beta', name: 'Alpha' };

      // Should compare 'Alpha' vs 'Beta', not 'Zeta' vs 'Alpha'
      expect(compareModels(modelA, modelB)).toBeLessThan(0);
    });

    it('handles empty strings', () => {
      const modelA = { modelName: '' };
      const modelB = { modelName: 'Beta' };

      expect(compareModels(modelA, modelB)).toBeLessThan(0);
    });

    it('handles missing properties', () => {
      const modelA = {};
      const modelB = { modelName: 'Beta' };

      // Empty string vs 'Beta'
      expect(compareModels(modelA, modelB)).toBeLessThan(0);
    });
  });

  describe('sortModels', () => {
    it('sorts an array of models alphabetically', () => {
      const models = [
        { modelName: 'Charlie' },
        { modelName: 'Alpha' },
        { modelName: 'Beta' },
      ];

      const sorted = sortModels(models);

      expect(sorted[0].modelName).toBe('Alpha');
      expect(sorted[1].modelName).toBe('Beta');
      expect(sorted[2].modelName).toBe('Charlie');
    });

    it('does not mutate the original array', () => {
      const models = [
        { modelName: 'Charlie' },
        { modelName: 'Alpha' },
        { modelName: 'Beta' },
      ];
      const original = [...models];

      sortModels(models);

      expect(models).toEqual(original);
    });

    it('returns a new array', () => {
      const models = [{ modelName: 'Alpha' }];
      const sorted = sortModels(models);

      expect(sorted).not.toBe(models);
    });

    it('handles empty array', () => {
      const sorted = sortModels([]);

      expect(sorted).toEqual([]);
    });

    it('handles single element array', () => {
      const models = [{ modelName: 'Alpha' }];
      const sorted = sortModels(models);

      expect(sorted).toEqual([{ modelName: 'Alpha' }]);
    });

    it('sorts by provider when model names are equal', () => {
      const models = [
        { modelName: 'GPT-4', providerName: 'OpenAI' },
        { modelName: 'GPT-4', providerName: 'Azure' },
        { modelName: 'Claude', providerName: 'Anthropic' },
      ];

      const sorted = sortModels(models);

      expect(sorted[0].modelName).toBe('Claude');
      expect(sorted[1].providerName).toBe('Azure');
      expect(sorted[2].providerName).toBe('OpenAI');
    });

    it('maintains stable sort for equal elements', () => {
      const models = [
        { modelName: 'Alpha', id: 1 },
        { modelName: 'Alpha', id: 2 },
        { modelName: 'Alpha', id: 3 },
      ];

      const sorted = sortModels(models);

      // All have same name, order should be stable
      expect(sorted.map((m) => m.id)).toEqual([1, 2, 3]);
    });

    it('handles mixed property naming', () => {
      const models = [
        { modelName: 'Zeta', providerName: 'Provider1' },
        { name: 'Alpha', provider: 'Provider2' },
        { modelName: 'Beta', provider: 'Provider3' },
      ];

      const sorted = sortModels(models);

      expect(sorted[0].name ?? sorted[0].modelName).toBe('Alpha');
      expect(sorted[1].name ?? sorted[1].modelName).toBe('Beta');
      expect(sorted[2].name ?? sorted[2].modelName).toBe('Zeta');
    });
  });
});
