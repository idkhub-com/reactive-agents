import type { ToolCall } from '@server/connectors/evaluations/tool-correctness/types';
import type { ToolCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/tool-correctness';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateBasicMatch,
  calculateExactMatch,
  calculateStrictMode,
  calculateToolCorrectness,
  calculateWithOrdering,
  countMatchedTools,
  createTestDataPoint,
  createToolCall,
  extractExpectedTools,
  extractToolsCalled,
  generateReason,
  isPerfectMatch,
  outputMatch,
  parametersMatch,
  toolsMatch,
} from './test-utils';

describe('Tool Correctness Algorithm Validation', () => {
  let defaultParams: ToolCorrectnessEvaluationParameters;

  beforeEach(() => {
    defaultParams = {
      threshold: 0.5,
      evaluation_params: [],
      include_reason: true,
      strict_mode: false,
      verbose_mode: false,
      should_consider_ordering: false,
      should_exact_match: false,
    };
  });

  describe('Core Extraction Functions', () => {
    it('should extract tools called from request_body', () => {
      const dataPoint = createTestDataPoint('dp-1', [], []);
      dataPoint.request_body = {
        tools_called: [
          { name: 'tool1', input_parameters: { param: 'value' } },
          { name: 'tool2', input_parameters: { param2: 'value2' } },
        ],
      };

      const toolsCalled = extractToolsCalled(dataPoint);
      expect(toolsCalled).toHaveLength(2);
      expect(toolsCalled[0].name).toBe('tool1');
      expect(toolsCalled[1].name).toBe('tool2');
    });

    it('should extract tools called from metadata', () => {
      const dataPoint = createTestDataPoint('dp-1', [], []);
      dataPoint.metadata = {
        tools_called: [{ name: 'tool1', input_parameters: { param: 'value' } }],
      };

      const toolsCalled = extractToolsCalled(dataPoint);
      expect(toolsCalled).toHaveLength(1);
      expect(toolsCalled[0].name).toBe('tool1');
    });

    it('should extract expected tools from ground_truth', () => {
      const dataPoint = createTestDataPoint('dp-1', [], []);
      dataPoint.ground_truth = {
        expected_tools: [
          { name: 'expected1', input_parameters: { param: 'value' } },
          { name: 'expected2', input_parameters: { param2: 'value2' } },
        ],
      };

      const expectedTools = extractExpectedTools(dataPoint);
      expect(expectedTools).toHaveLength(2);
      expect(expectedTools[0].name).toBe('expected1');
      expect(expectedTools[1].name).toBe('expected2');
    });

    it('should handle malformed tools arrays gracefully', () => {
      const dataPoint = createTestDataPoint('dp-1', [], []);
      dataPoint.request_body = {
        tools_called: 'not-an-array',
      } as Record<string, unknown>;

      const toolsCalled = extractToolsCalled(dataPoint);
      expect(toolsCalled).toHaveLength(0);
    });

    it('should handle missing tools gracefully', () => {
      const dataPoint = createTestDataPoint('dp-1', [], []);
      dataPoint.request_body = {};
      dataPoint.metadata = {};

      const toolsCalled = extractToolsCalled(dataPoint);
      const expectedTools = extractExpectedTools(dataPoint);

      expect(toolsCalled).toHaveLength(0);
      expect(expectedTools).toHaveLength(0);
    });
  });

  describe('Parameter Matching Algorithm', () => {
    it('should match identical parameters', () => {
      const called = { param1: 'value1', param2: 42 };
      const expected = { param1: 'value1', param2: 42 };

      const result = parametersMatch(called, expected);
      expect(result).toBe(true);
    });

    it('should not match different parameters', () => {
      const called = { param1: 'value1', param2: 42 };
      const expected = { param1: 'value1', param2: 43 };

      const result = parametersMatch(called, expected);
      expect(result).toBe(false);
    });

    it('should not match different parameter counts', () => {
      const called = { param1: 'value1' };
      const expected = { param1: 'value1', param2: 42 };

      const result = parametersMatch(called, expected);
      expect(result).toBe(false);
    });

    it('should handle undefined parameters', () => {
      expect(parametersMatch(undefined, undefined)).toBe(true);
      expect(parametersMatch({ param: 'value' }, undefined)).toBe(false);
      expect(parametersMatch(undefined, { param: 'value' })).toBe(false);
    });

    it('should handle nested objects in parameters', () => {
      const called = {
        nested: { level1: { level2: 'value' } },
        simple: 'test',
      };
      const expected = {
        nested: { level1: { level2: 'value' } },
        simple: 'test',
      };

      const result = parametersMatch(called, expected);
      expect(result).toBe(true);
    });

    it('should handle arrays in parameters', () => {
      const called = {
        array: [1, 2, 3],
        mixed: { items: ['a', 'b', 'c'] },
      };
      const expected = {
        array: [1, 2, 3],
        mixed: { items: ['a', 'b', 'c'] },
      };

      const result = parametersMatch(called, expected);
      expect(result).toBe(true);
    });
  });

  describe('Output Matching Algorithm', () => {
    it('should match identical outputs', () => {
      const called = { result: 'success', data: [1, 2, 3] };
      const expected = { result: 'success', data: [1, 2, 3] };

      const result = outputMatch(called, expected);
      expect(result).toBe(true);
    });

    it('should not match different outputs', () => {
      const called = { result: 'success' };
      const expected = { result: 'failure' };

      const result = outputMatch(called, expected);
      expect(result).toBe(false);
    });

    it('should handle primitive outputs', () => {
      expect(outputMatch('string', 'string')).toBe(true);
      expect(outputMatch(42, 42)).toBe(true);
      expect(outputMatch(true, true)).toBe(true);
      expect(outputMatch(null, null)).toBe(true);
      expect(outputMatch(undefined, undefined)).toBe(true);
    });

    it('should handle complex nested outputs', () => {
      const called = {
        nested: {
          array: [1, { key: 'value' }, [3, 4]],
          object: { deep: { deeper: 'value' } },
        },
      };
      const expected = {
        nested: {
          array: [1, { key: 'value' }, [3, 4]],
          object: { deep: { deeper: 'value' } },
        },
      };

      const result = outputMatch(called, expected);
      expect(result).toBe(true);
    });
  });

  describe('Tool Matching Algorithm', () => {
    it('should match tools with same name and no evaluation params', () => {
      const called = createToolCall('tool1', { param: 'value' });
      const expected = createToolCall('tool1', { param: 'value' });

      const result = toolsMatch(called, expected, defaultParams);
      expect(result).toBe(true);
    });

    it('should not match tools with different names', () => {
      const called = createToolCall('tool1', { param: 'value' });
      const expected = createToolCall('tool2', { param: 'value' });

      const result = toolsMatch(called, expected, defaultParams);
      expect(result).toBe(false);
    });

    it('should match tools with INPUT_PARAMETERS evaluation', () => {
      const params = {
        ...defaultParams,
        evaluation_params: ['INPUT_PARAMETERS'] as (
          | 'INPUT_PARAMETERS'
          | 'OUTPUT'
        )[],
      };
      const called = createToolCall('tool1', { param: 'value' });
      const expected = createToolCall('tool1', { param: 'value' });

      const result = toolsMatch(called, expected, params);
      expect(result).toBe(true);
    });

    it('should not match tools with different INPUT_PARAMETERS', () => {
      const params = {
        ...defaultParams,
        evaluation_params: ['INPUT_PARAMETERS'] as (
          | 'INPUT_PARAMETERS'
          | 'OUTPUT'
        )[],
      };
      const called = createToolCall('tool1', { param: 'value1' });
      const expected = createToolCall('tool1', { param: 'value2' });

      const result = toolsMatch(called, expected, params);
      expect(result).toBe(false);
    });

    it('should match tools with OUTPUT evaluation', () => {
      const params = {
        ...defaultParams,
        evaluation_params: ['OUTPUT'] as ('INPUT_PARAMETERS' | 'OUTPUT')[],
      };
      const called = createToolCall('tool1', {}, { result: 'success' });
      const expected = createToolCall('tool1', {}, { result: 'success' });

      const result = toolsMatch(called, expected, params);
      expect(result).toBe(true);
    });

    it('should not match tools with different OUTPUT', () => {
      const params = {
        ...defaultParams,
        evaluation_params: ['OUTPUT'] as ('INPUT_PARAMETERS' | 'OUTPUT')[],
      };
      const called = createToolCall('tool1', {}, { result: 'success' });
      const expected = createToolCall('tool1', {}, { result: 'failure' });

      const result = toolsMatch(called, expected, params);
      expect(result).toBe(false);
    });

    it('should match tools with both INPUT_PARAMETERS and OUTPUT evaluation', () => {
      const params = {
        ...defaultParams,
        evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'] as (
          | 'INPUT_PARAMETERS'
          | 'OUTPUT'
        )[],
      };
      const called = createToolCall(
        'tool1',
        { param: 'value' },
        { result: 'success' },
      );
      const expected = createToolCall(
        'tool1',
        { param: 'value' },
        { result: 'success' },
      );

      const result = toolsMatch(called, expected, params);
      expect(result).toBe(true);
    });
  });

  describe('Perfect Match Algorithm', () => {
    it('should identify perfect matches', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = isPerfectMatch(toolsCalled, expectedTools, defaultParams);
      expect(result).toBe(true);
    });

    it('should not identify perfect matches with different lengths', () => {
      const toolsCalled = [createToolCall('tool1', { param: 'value' })];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = isPerfectMatch(toolsCalled, expectedTools, defaultParams);
      expect(result).toBe(false);
    });

    it('should not identify perfect matches with different tools', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool3', { param3: 'value3' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = isPerfectMatch(toolsCalled, expectedTools, defaultParams);
      expect(result).toBe(false);
    });
  });

  describe('Matched Tools Counting Algorithm', () => {
    it('should count all matched tools', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
        createToolCall('tool3', { param3: 'value3' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = countMatchedTools(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(2);
    });

    it('should not count duplicate matches', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool1', { param: 'value' }), // Duplicate
      ];
      const expectedTools = [createToolCall('tool1', { param: 'value' })];

      const result = countMatchedTools(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(1);
    });

    it('should handle no matches', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];
      const expectedTools = [
        createToolCall('tool3', { param3: 'value3' }),
        createToolCall('tool4', { param4: 'value4' }),
      ];

      const result = countMatchedTools(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0);
    });
  });

  describe('Strict Mode Algorithm', () => {
    it('should return 1 for perfect matches', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateStrictMode(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(1);
    });

    it('should return 0 for imperfect matches', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool3', { param3: 'value3' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateStrictMode(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0);
    });
  });

  describe('Exact Match Algorithm', () => {
    it('should return 1 for exact matches', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateExactMatch(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(1);
    });

    it('should return 0 for different counts', () => {
      const toolsCalled = [createToolCall('tool1', { param: 'value' })];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateExactMatch(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0);
    });

    it('should return partial score for partial matches', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool3', { param3: 'value3' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateExactMatch(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0.5); // 1 out of 2 matched
    });
  });

  describe('Ordering Algorithm', () => {
    it('should return 1 for correct order', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateWithOrdering(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(1);
    });

    it('should return 0 for wrong order', () => {
      const toolsCalled = [
        createToolCall('tool2', { param2: 'value2' }),
        createToolCall('tool1', { param: 'value' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateWithOrdering(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0);
    });

    it('should return partial score for partial order match', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool3', { param3: 'value3' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateWithOrdering(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0.5); // First tool matches, second doesn't
    });
  });

  describe('Basic Match Algorithm', () => {
    it('should return 1 for no tools expected and none called', () => {
      const toolsCalled: ToolCall[] = [];
      const expectedTools: ToolCall[] = [];

      const result = calculateBasicMatch(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(1);
    });

    it('should return 0 for no tools expected but tools called', () => {
      const toolsCalled = [createToolCall('tool1', { param: 'value' })];
      const expectedTools: ToolCall[] = [];

      const result = calculateBasicMatch(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0);
    });

    it('should return 1 for perfect match', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateBasicMatch(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(1);
    });

    it('should return partial score for partial match', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool3', { param3: 'value3' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateBasicMatch(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0.5); // 1 out of 2 matched
    });
  });

  describe('Main Tool Correctness Algorithm', () => {
    it('should use strict mode when enabled', () => {
      const params = { ...defaultParams, strict_mode: true };
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool3', { param3: 'value3' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateToolCorrectness(
        toolsCalled,
        expectedTools,
        params,
      );
      expect(result).toBe(0); // Strict mode requires perfect match
    });

    it('should use exact match when enabled', () => {
      const params = { ...defaultParams, should_exact_match: true };
      const toolsCalled = [createToolCall('tool1', { param: 'value' })];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateToolCorrectness(
        toolsCalled,
        expectedTools,
        params,
      );
      expect(result).toBe(0); // Different counts
    });

    it('should use ordering when enabled', () => {
      const params = { ...defaultParams, should_consider_ordering: true };
      const toolsCalled = [
        createToolCall('tool2', { param2: 'value2' }),
        createToolCall('tool1', { param: 'value' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateToolCorrectness(
        toolsCalled,
        expectedTools,
        params,
      );
      expect(result).toBe(0); // Wrong order
    });

    it('should use basic match as default', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool3', { param3: 'value3' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const result = calculateToolCorrectness(
        toolsCalled,
        expectedTools,
        defaultParams,
      );
      expect(result).toBe(0.5); // Basic match allows partial scoring
    });
  });

  describe('Reason Generation Algorithm', () => {
    it('should generate reason for perfect match', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const reason = generateReason(
        toolsCalled,
        expectedTools,
        1,
        defaultParams,
      );
      expect(reason).toContain('Perfect match');
      expect(reason).toContain('tool1, tool2');
    });

    it('should generate reason for no match', () => {
      const toolsCalled = [createToolCall('tool1', { param: 'value' })];
      const expectedTools = [createToolCall('tool2', { param2: 'value2' })];

      const reason = generateReason(
        toolsCalled,
        expectedTools,
        0,
        defaultParams,
      );
      expect(reason).toContain('No match');
      expect(reason).toContain('tool2');
      expect(reason).toContain('tool1');
    });

    it('should generate reason for partial match', () => {
      const toolsCalled = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool3', { param3: 'value3' }),
      ];
      const expectedTools = [
        createToolCall('tool1', { param: 'value' }),
        createToolCall('tool2', { param2: 'value2' }),
      ];

      const reason = generateReason(
        toolsCalled,
        expectedTools,
        0.5,
        defaultParams,
      );
      expect(reason).toContain('Partial match');
      expect(reason).toContain('1/2');
    });

    it('should handle empty tool arrays', () => {
      const toolsCalled: ToolCall[] = [];
      const expectedTools: ToolCall[] = [];

      const reason = generateReason(
        toolsCalled,
        expectedTools,
        1,
        defaultParams,
      );
      expect(reason).toContain('Perfect match');
      expect(reason).toContain('All expected tools () were called correctly');
    });
  });

  describe('Advanced Algorithm Validation - Strict Mode Precision', () => {
    it('should validate strict mode algorithm with perfect precision', () => {
      const testCases = [
        // Perfect match - should score 1.0
        {
          toolsCalled: [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
          expectedTools: [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
          expected: 1.0,
        },
        // Wrong order - should score 0.0 in strict mode
        {
          toolsCalled: [
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
          ],
          expectedTools: [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
          expected: 0.0,
        },
        // Extra tools - should score 0.0 in strict mode
        {
          toolsCalled: [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
            createToolCall('tool3', { param: 'value3' }, { result: 'output3' }),
          ],
          expectedTools: [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
          expected: 0.0,
        },
        // Missing tools - should score 0.0 in strict mode
        {
          toolsCalled: [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
          ],
          expectedTools: [
            createToolCall('tool1', { param: 'value1' }, { result: 'output1' }),
            createToolCall('tool2', { param: 'value2' }, { result: 'output2' }),
          ],
          expected: 0.0,
        },
      ];

      const strictParams = {
        ...defaultParams,
        strict_mode: true,
        evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'] as (
          | 'INPUT_PARAMETERS'
          | 'OUTPUT'
        )[],
        should_consider_ordering: true,
        should_exact_match: true,
      };

      testCases.forEach(({ toolsCalled, expectedTools, expected }, _index) => {
        const result = calculateStrictMode(
          toolsCalled,
          expectedTools,
          strictParams,
        );
        expect(result).toBe(expected);
      });
    });

    it('should validate basic match algorithm with partial scoring', () => {
      const testCases = [
        {
          toolsCalled: [
            createToolCall('tool1', { param: 'value1' }),
            createToolCall('tool3', { param: 'value3' }), // Not expected
          ],
          expectedTools: [
            createToolCall('tool1', { param: 'value1' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
          expected: 0.5, // 1 out of 2 expected tools matched
        },
        {
          toolsCalled: [
            createToolCall('tool1', { param: 'value1' }),
            createToolCall('tool2', { param: 'value2' }),
            createToolCall('tool3', { param: 'value3' }), // Extra tool
          ],
          expectedTools: [
            createToolCall('tool1', { param: 'value1' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
          expected: 1.0, // All expected tools matched (extra tools don't affect basic match)
        },
        {
          toolsCalled: [],
          expectedTools: [
            createToolCall('tool1', { param: 'value1' }),
            createToolCall('tool2', { param: 'value2' }),
          ],
          expected: 0.0, // No tools called but tools expected
        },
        {
          toolsCalled: [createToolCall('tool1', { param: 'value1' })],
          expectedTools: [],
          expected: 0.0, // Tools called but none expected
        },
      ];

      const basicParams = {
        ...defaultParams,
        evaluation_params: ['INPUT_PARAMETERS'] as (
          | 'INPUT_PARAMETERS'
          | 'OUTPUT'
        )[],
        strict_mode: false,
        should_exact_match: false,
        should_consider_ordering: false,
      };

      testCases.forEach(({ toolsCalled, expectedTools, expected }, _index) => {
        const result = calculateBasicMatch(
          toolsCalled,
          expectedTools,
          basicParams,
        );
        expect(result).toBe(expected);
      });
    });
  });

  describe('Edge Cases for Parameter Matching', () => {
    it('should handle complex parameter structures correctly', () => {
      const complexParams1 = {
        simple: 'string',
        number: 42,
        boolean: true,
        null_value: null,
        array: [1, 'two', { three: 3 }],
        nested: {
          level1: {
            level2: {
              deep_value: 'deep',
              deep_array: [{ id: 1 }, { id: 2 }],
            },
          },
        },
      };

      const complexParams2 = {
        simple: 'string',
        number: 42,
        boolean: true,
        null_value: null,
        array: [1, 'two', { three: 3 }],
        nested: {
          level1: {
            level2: {
              deep_value: 'deep',
              deep_array: [{ id: 1 }, { id: 2 }],
            },
          },
        },
      };

      expect(parametersMatch(complexParams1, complexParams2)).toBe(true);

      // Change a deep value
      const complexParams3 = {
        ...complexParams1,
        nested: {
          level1: {
            level2: {
              deep_value: 'different',
              deep_array: [{ id: 1 }, { id: 2 }],
            },
          },
        },
      };

      expect(parametersMatch(complexParams1, complexParams3)).toBe(false);
    });

    it('should handle edge cases in parameter comparison', () => {
      // Test with undefined vs null
      expect(parametersMatch({ value: undefined }, { value: null })).toBe(
        false,
      );

      // Test with empty objects
      expect(parametersMatch({}, {})).toBe(true);

      // Test with different types for same key
      expect(parametersMatch({ value: '42' }, { value: 42 })).toBe(false);

      // Test with array order sensitivity
      expect(parametersMatch({ arr: [1, 2, 3] }, { arr: [3, 2, 1] })).toBe(
        false,
      );

      // Test with NaN
      expect(parametersMatch({ value: NaN }, { value: NaN })).toBe(true);

      // Test with Date objects
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-01-01');
      expect(parametersMatch({ date: date1 }, { date: date2 })).toBe(true);

      const date3 = new Date('2023-01-02');
      expect(parametersMatch({ date: date1 }, { date: date3 })).toBe(false);
    });

    it('should handle large parameter objects efficiently', () => {
      const largeParams = {
        data: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
          metadata: {
            tags: [`tag${i}`, `tag${i + 1}`],
            attributes: Array.from({ length: 10 }, (_, j) => ({
              key: `attr${j}`,
              value: `value${i}-${j}`,
            })),
          },
        })),
      };

      const largeParamsCopy = JSON.parse(JSON.stringify(largeParams));

      const startTime = Date.now();
      const result = parametersMatch(largeParams, largeParamsCopy);
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Output Matching Edge Cases', () => {
    it('should handle special values in output matching', () => {
      // Test with functions (should be ignored or handled gracefully)
      const output1 = { func: () => 'test' };
      const output2 = { func: () => 'test' };
      expect(outputMatch(output1, output2)).toBe(false); // Functions are not equal

      // Test with symbols
      const sym1 = Symbol('test');
      const sym2 = Symbol('test');
      expect(outputMatch({ sym: sym1 }, { sym: sym2 })).toBe(false);
      expect(outputMatch({ sym: sym1 }, { sym: sym1 })).toBe(true);

      // Test with RegExp
      const regex1 = /test/g;
      const regex2 = /test/g;
      expect(outputMatch({ regex: regex1 }, { regex: regex2 })).toBe(true);

      const regex3 = /test/i;
      expect(outputMatch({ regex: regex1 }, { regex: regex3 })).toBe(false);
    });

    it('should handle deeply nested output structures', () => {
      const deepOutput = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                  array: [
                    { nested: { data: [1, 2, 3] } },
                    { nested: { data: [4, 5, 6] } },
                  ],
                },
              },
            },
          },
        },
      };

      const deepOutputCopy = JSON.parse(JSON.stringify(deepOutput));
      expect(outputMatch(deepOutput, deepOutputCopy)).toBe(true);

      // Modify deep nested value
      deepOutputCopy.level1.level2.level3.level4.level5.array[0].nested.data[0] = 99;
      expect(outputMatch(deepOutput, deepOutputCopy)).toBe(false);
    });
  });

  describe('Tool Matching with Complex Scenarios', () => {
    it('should handle tool matching with all evaluation parameters', () => {
      const params = {
        ...defaultParams,
        evaluation_params: ['INPUT_PARAMETERS', 'OUTPUT'] as (
          | 'INPUT_PARAMETERS'
          | 'OUTPUT'
        )[],
      };

      // Perfect match
      const tool1 = createToolCall(
        'complex_tool',
        {
          config: { mode: 'advanced', options: [1, 2, 3] },
          data: { items: [{ id: 1, value: 'test' }] },
        },
        {
          success: true,
          results: { processed: 1, errors: [] },
          metadata: { timestamp: '2023-01-01T00:00:00Z' },
        },
      );

      const tool2 = createToolCall(
        'complex_tool',
        {
          config: { mode: 'advanced', options: [1, 2, 3] },
          data: { items: [{ id: 1, value: 'test' }] },
        },
        {
          success: true,
          results: { processed: 1, errors: [] },
          metadata: { timestamp: '2023-01-01T00:00:00Z' },
        },
      );

      expect(toolsMatch(tool1, tool2, params)).toBe(true);

      // Different input parameters
      const tool3 = createToolCall(
        'complex_tool',
        {
          config: { mode: 'basic', options: [1, 2, 3] }, // Different mode
          data: { items: [{ id: 1, value: 'test' }] },
        },
        {
          success: true,
          results: { processed: 1, errors: [] },
          metadata: { timestamp: '2023-01-01T00:00:00Z' },
        },
      );

      expect(toolsMatch(tool1, tool3, params)).toBe(false);

      // Different output
      const tool4 = createToolCall(
        'complex_tool',
        {
          config: { mode: 'advanced', options: [1, 2, 3] },
          data: { items: [{ id: 1, value: 'test' }] },
        },
        {
          success: false, // Different success status
          results: { processed: 1, errors: [] },
          metadata: { timestamp: '2023-01-01T00:00:00Z' },
        },
      );

      expect(toolsMatch(tool1, tool4, params)).toBe(false);
    });

    it('should handle tool matching with only name comparison', () => {
      const params = {
        ...defaultParams,
        evaluation_params: [] as ('INPUT_PARAMETERS' | 'OUTPUT')[],
      };

      const tool1 = createToolCall(
        'tool_name',
        { different: 'params' },
        { different: 'output' },
      );

      const tool2 = createToolCall(
        'tool_name',
        { completely: 'different' },
        { totally: 'different' },
      );

      // Should match because only name is compared
      expect(toolsMatch(tool1, tool2, params)).toBe(true);

      const tool3 = createToolCall(
        'different_name',
        { different: 'params' },
        { different: 'output' },
      );

      // Should not match because names are different
      expect(toolsMatch(tool1, tool3, params)).toBe(false);
    });
  });
});
