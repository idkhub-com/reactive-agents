import type {
  EvaluationMethodConnector,
  UserDataStorageConnector,
} from '@server/types/connector';
import type { DataPoint } from '@shared/types/data/data-point';
import type { EvaluationRun } from '@shared/types/data/evaluation-run';
import { EvaluationRunStatus } from '@shared/types/data/evaluation-run';
import {
  type EvaluationMethodDetails,
  EvaluationMethodName,
  type EvaluationMethodRequest,
} from '@shared/types/idkhub/evaluations';
import { ToolCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/tool-correctness';
import type { ToolCall } from './types';

// Simple logger utility - TODO: Replace with proper logging framework (e.g., winston, pino)
const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  warn: (message: string, data?: unknown) => {
    console.warn(
      `[WARN] ${message}`,
      data ? JSON.stringify(data, null, 2) : '',
    );
  },
  error: (message: string, error?: unknown) => {
    console.error(
      `[ERROR] ${message}`,
      error instanceof Error ? error.message : error,
    );
  },
  debug: (message: string, data?: unknown) => {
    // Only log debug messages in development or when verbose mode is enabled
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[DEBUG] ${message}`,
        data ? JSON.stringify(data, null, 2) : '',
      );
    }
  },
};

// Pure functions for tool evaluation logic
const extractToolsCalled = (dataPoint: DataPoint): ToolCall[] => {
  if (!dataPoint || typeof dataPoint !== 'object') {
    logger.warn('Invalid dataPoint provided to extractToolsCalled', {
      dataPointId: (dataPoint as DataPoint)?.id,
    });
    return [];
  }

  const toolsCalled =
    dataPoint.request_body?.tools_called ||
    dataPoint.metadata?.tools_called ||
    [];

  if (Array.isArray(toolsCalled)) {
    return toolsCalled.map((tool) => ({
      name: tool.name || tool.tool_name || '',
      input_parameters: tool.input_parameters || tool.args || {},
      output: tool.output || tool.result,
    }));
  }

  return [];
};

const extractExpectedTools = (dataPoint: DataPoint): ToolCall[] => {
  if (!dataPoint || typeof dataPoint !== 'object') {
    logger.warn('Invalid dataPoint provided to extractExpectedTools', {
      dataPointId: (dataPoint as DataPoint)?.id,
    });
    return [];
  }

  const expectedTools =
    dataPoint.ground_truth?.expected_tools ||
    dataPoint.metadata?.expected_tools ||
    [];

  if (Array.isArray(expectedTools)) {
    return expectedTools.map((tool) => ({
      name: tool.name || tool.tool_name || '',
      input_parameters: tool.input_parameters || tool.args || {},
      output: tool.output || tool.result,
    }));
  }

  return [];
};

// More efficient deep equality comparison that avoids JSON.stringify
const deepEqual = (a: unknown, b: unknown): boolean => {
  // Handle primitive types and null/undefined
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  // Handle different types
  if (typeof a !== typeof b) return false;

  // Handle functions - only equal if same reference
  if (typeof a === 'function') return a === b;

  // Handle symbols - only equal if same reference
  if (typeof a === 'symbol') return a === b;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle regular expressions
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);

    if (aKeys.length !== bKeys.length) return false;

    // Check regular properties
    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (
        !deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        )
      ) {
        return false;
      }
    }

    return true;
  }

  return false;
};

const parametersMatch = (
  calledParams: Record<string, unknown> | undefined,
  expectedParams: Record<string, unknown> | undefined,
): boolean => {
  if (!calledParams && !expectedParams) return true;
  if (!calledParams || !expectedParams) return false;

  // Use optimized deep equality instead of JSON.stringify
  try {
    return deepEqual(calledParams, expectedParams);
  } catch (error) {
    // Fallback to JSON comparison if deep equality fails
    logger.warn(
      'Failed to compare parameters, falling back to JSON comparison',
      { error },
    );

    try {
      return JSON.stringify(calledParams) === JSON.stringify(expectedParams);
    } catch (jsonError) {
      logger.warn('Failed to serialize parameters', { error: jsonError });

      // Final fallback to shallow comparison
      const calledKeys = Object.keys(calledParams);
      const expectedKeys = Object.keys(expectedParams);

      if (calledKeys.length !== expectedKeys.length) return false;

      for (const key of expectedKeys) {
        if (
          !calledKeys.includes(key) ||
          calledParams[key] !== expectedParams[key]
        ) {
          return false;
        }
      }

      return true;
    }
  }
};

const outputMatch = (
  calledOutput: unknown,
  expectedOutput: unknown,
): boolean => {
  try {
    return deepEqual(calledOutput, expectedOutput);
  } catch (error) {
    // Handle circular references or other comparison issues
    logger.warn('Failed to compare outputs, using shallow comparison', {
      error,
    });
    // If we can't compare, perform a shallow comparison as fallback
    return calledOutput === expectedOutput;
  }
};

const toolsMatch = (
  called: ToolCall,
  expected: ToolCall,
  parameters: ToolCorrectnessEvaluationParameters,
): boolean => {
  // Check tool name
  if (called.name !== expected.name) {
    return false;
  }

  // Check input parameters if required
  if (parameters.evaluation_params.includes('INPUT_PARAMETERS')) {
    if (!parametersMatch(called.input_parameters, expected.input_parameters)) {
      return false;
    }
  }

  // Check output if required
  if (parameters.evaluation_params.includes('OUTPUT')) {
    if (!outputMatch(called.output, expected.output)) {
      return false;
    }
  }

  return true;
};

const isPerfectMatch = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): boolean => {
  if (tools_called.length !== expected_tools.length) {
    return false;
  }

  for (let i = 0; i < tools_called.length; i++) {
    if (!toolsMatch(tools_called[i], expected_tools[i], parameters)) {
      return false;
    }
  }

  return true;
};

// Helper function to create a unique signature for a tool based on evaluation parameters
const createToolSignature = (
  tool: ToolCall,
  parameters: ToolCorrectnessEvaluationParameters,
): string => {
  const parts = [tool.name];

  if (parameters.evaluation_params.includes('INPUT_PARAMETERS')) {
    try {
      // Use a more efficient serialization approach
      parts.push(JSON.stringify(tool.input_parameters || {}));
    } catch (_error) {
      // Fallback for circular references
      parts.push(String(tool.input_parameters));
    }
  }

  if (parameters.evaluation_params.includes('OUTPUT')) {
    try {
      parts.push(JSON.stringify(tool.output));
    } catch (_error) {
      // Fallback for circular references
      parts.push(String(tool.output));
    }
  }

  return parts.join('|');
};

// Optimized version with O(n) complexity instead of O(n²)
const countMatchedToolsOptimized = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
  // Create frequency map of called tools for O(1) lookup
  const calledToolsMap = new Map<string, number>();

  for (const tool of tools_called) {
    const signature = createToolSignature(tool, parameters);
    calledToolsMap.set(signature, (calledToolsMap.get(signature) || 0) + 1);
  }

  let matchedCount = 0;

  // Match expected tools against called tools map
  for (const expectedTool of expected_tools) {
    const signature = createToolSignature(expectedTool, parameters);
    const availableCount = calledToolsMap.get(signature) || 0;

    if (availableCount > 0) {
      matchedCount++;
      calledToolsMap.set(signature, availableCount - 1);
    }
  }

  return matchedCount;
};

// Fallback to original algorithm for cases where hash-based matching might not work
const countMatchedTools = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
  // For small datasets, use optimized version
  if (tools_called.length <= 100 && expected_tools.length <= 100) {
    try {
      return countMatchedToolsOptimized(
        tools_called,
        expected_tools,
        parameters,
      );
    } catch (error) {
      // Fallback to original algorithm if optimization fails
      logger.warn('Falling back to original matching algorithm', { error });
    }
  }

  // Original O(n²) algorithm as fallback for large datasets or edge cases
  let matchedCount = 0;
  const usedCalledTools = new Set<number>();

  for (const expectedTool of expected_tools) {
    for (let i = 0; i < tools_called.length; i++) {
      if (
        !usedCalledTools.has(i) &&
        toolsMatch(tools_called[i], expectedTool, parameters)
      ) {
        matchedCount++;
        usedCalledTools.add(i);
        break;
      }
    }
  }

  return matchedCount;
};

const calculateStrictMode = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
  const perfect = isPerfectMatch(tools_called, expected_tools, parameters);
  return perfect ? 1 : 0;
};

const calculateExactMatch = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
  if (tools_called.length !== expected_tools.length) {
    return 0;
  }

  const matchedTools = countMatchedTools(
    tools_called,
    expected_tools,
    parameters,
  );
  return matchedTools / expected_tools.length;
};

const calculateWithOrdering = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
  const minLength = Math.min(tools_called.length, expected_tools.length);
  let matchedCount = 0;

  for (let i = 0; i < minLength; i++) {
    if (toolsMatch(tools_called[i], expected_tools[i], parameters)) {
      matchedCount++;
    }
  }

  return matchedCount / expected_tools.length;
};

const calculateBasicMatch = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
  if (expected_tools.length === 0) {
    return tools_called.length === 0 ? 1 : 0;
  }

  const matchedTools = countMatchedTools(
    tools_called,
    expected_tools,
    parameters,
  );
  return matchedTools / expected_tools.length;
};

const calculateToolCorrectness = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
  if (parameters.strict_mode) {
    return calculateStrictMode(tools_called, expected_tools, parameters);
  }

  if (parameters.should_exact_match) {
    return calculateExactMatch(tools_called, expected_tools, parameters);
  }

  if (parameters.should_consider_ordering) {
    return calculateWithOrdering(tools_called, expected_tools, parameters);
  }

  return calculateBasicMatch(tools_called, expected_tools, parameters);
};

const generateReason = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  score: number,
  _parameters: ToolCorrectnessEvaluationParameters,
): string => {
  const calledNames = tools_called.map((t) => t.name);
  const expectedNames = expected_tools.map((t) => t.name);

  if (score === 1) {
    return `Perfect match: All expected tools (${expectedNames.join(', ')}) were called correctly.`;
  }

  if (score === 0) {
    return `No match: Expected tools (${expectedNames.join(', ')}) but called (${calledNames.join(', ')}).`;
  }

  const matchedCount = Math.round(score * expected_tools.length);
  return `Partial match: ${matchedCount}/${expected_tools.length} expected tools were called correctly. Expected: ${expectedNames.join(', ')}, Called: ${calledNames.join(', ')}.`;
};

const evaluateDataPoint = (
  dataPoint: DataPoint,
  parameters: ToolCorrectnessEvaluationParameters,
): {
  data_point_id: string;
  score: number;
  reason?: string;
  tools_called: ToolCall[];
  expected_tools: ToolCall[];
} => {
  // Enhanced validation for dataPoint structure
  if (!dataPoint || typeof dataPoint !== 'object') {
    throw new Error(
      `Invalid data point: ${(dataPoint as DataPoint)?.id || 'unknown'}`,
    );
  }

  if (!dataPoint.id || typeof dataPoint.id !== 'string') {
    throw new Error('Data point missing required id field');
  }

  // Validate that dataPoint has expected structure for tool extraction
  if (
    typeof dataPoint.request_body !== 'object' &&
    typeof dataPoint.metadata !== 'object' &&
    typeof dataPoint.ground_truth !== 'object'
  ) {
    throw new Error(
      `Data point ${dataPoint.id} missing expected structure (request_body, metadata, or ground_truth)`,
    );
  }

  // Extract tools_called and expected_tools from data point with validation
  const tools_called = extractToolsCalled(dataPoint);
  const expected_tools = extractExpectedTools(dataPoint);

  // Validate array contents before processing
  if (!Array.isArray(tools_called)) {
    throw new Error(
      `Invalid tools_called format in data point ${dataPoint.id}: expected array`,
    );
  }

  if (!Array.isArray(expected_tools)) {
    throw new Error(
      `Invalid expected_tools format in data point ${dataPoint.id}: expected array`,
    );
  }

  // Validate tool structure
  for (let i = 0; i < tools_called.length; i++) {
    const tool = tools_called[i];
    if (!tool || typeof tool !== 'object' || typeof tool.name !== 'string') {
      throw new Error(
        `Invalid tool structure at index ${i} in tools_called for data point ${dataPoint.id}`,
      );
    }
  }

  for (let i = 0; i < expected_tools.length; i++) {
    const tool = expected_tools[i];
    if (!tool || typeof tool !== 'object' || typeof tool.name !== 'string') {
      throw new Error(
        `Invalid tool structure at index ${i} in expected_tools for data point ${dataPoint.id}`,
      );
    }
  }

  // Use structured logging instead of console.log
  if (parameters.verbose_mode) {
    logger.info(`Evaluating data point ${dataPoint.id}`, {
      tools_called,
      expected_tools,
    });
  }

  // Calculate tool correctness score
  const score = calculateToolCorrectness(
    tools_called,
    expected_tools,
    parameters,
  );

  let reason: string | undefined;
  if (parameters.include_reason) {
    reason = generateReason(tools_called, expected_tools, score, parameters);
  }

  return {
    data_point_id: dataPoint.id,
    score,
    reason,
    tools_called,
    expected_tools,
  };
};

// Tool correctness connector constant instance
export const toolCorrectnessEvaluationConnector: EvaluationMethodConnector = {
  getDetails(): EvaluationMethodDetails {
    return {
      method: EvaluationMethodName.TOOL_CORRECTNESS,
      name: 'Tool Correctness Evaluation',
      description: 'Evaluates the correctness of tool calls made by agents',
    };
  },

  async evaluate(
    request: EvaluationMethodRequest,
    userDataStorageConnector: UserDataStorageConnector,
  ): Promise<EvaluationRun> {
    const { agent_id, dataset_id, parameters } = request;

    // Parameters are now directly ToolCorrectnessEvaluationMethodDetails with defaults from schema
    const toolCorrectnessParams = parameters;

    // Create evaluation run
    const evaluationRun = await userDataStorageConnector.createEvaluationRun({
      dataset_id,
      agent_id,
      evaluation_method: EvaluationMethodName.TOOL_CORRECTNESS,
      name:
        request.name ||
        `Tool Correctness Evaluation - ${new Date().toISOString()}`,
      description:
        request.description || 'Evaluation of tool calling correctness',
      metadata: {
        parameters: toolCorrectnessParams,
      },
    });

    try {
      // Update status to running
      await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
        status: EvaluationRunStatus.RUNNING,
        started_at: new Date().toISOString(),
      });

      // Get dataset data points
      const dataPoints = await userDataStorageConnector.getDataPoints(
        dataset_id,
        {},
      );

      const results = {
        total_data_points: dataPoints.length,
        evaluated_data_points: 0,
        average_score: 0,
        passed_count: 0,
        failed_count: 0,
        threshold_used: toolCorrectnessParams.threshold || 0.5,
        scores: [] as Array<{
          data_point_id: string;
          score: number;
          reason?: string;
          tools_called: ToolCall[];
          expected_tools: ToolCall[];
        }>,
      };

      let totalScore = 0;

      for (const dataPoint of dataPoints) {
        try {
          const dataPointResult = evaluateDataPoint(
            dataPoint,
            toolCorrectnessParams as ToolCorrectnessEvaluationParameters,
          );

          results.scores.push(dataPointResult);
          totalScore += dataPointResult.score;
          results.evaluated_data_points++;

          // Count passed/failed based on threshold
          if (dataPointResult.score >= results.threshold_used) {
            results.passed_count++;
          } else {
            results.failed_count++;
          }

          // Create data point output
          try {
            await userDataStorageConnector.createDataPointOutput(
              evaluationRun.id,
              {
                data_point_id: dataPoint.id,
                output: {
                  tools_called: dataPointResult.tools_called,
                  expected_tools: dataPointResult.expected_tools,
                  score: dataPointResult.score,
                  reason: dataPointResult.reason,
                },
                score: dataPointResult.score,
                metadata: {
                  evaluation_method: 'tool_correctness',
                  parameters: toolCorrectnessParams,
                },
              },
            );
          } catch (outputError) {
            logger.error(
              `Error creating data point output for ${dataPoint.id}:`,
              outputError,
            );
            // Continue with other data points even if output creation fails
          }
        } catch (error) {
          logger.error(`Error evaluating data point ${dataPoint.id}:`, error);
          // Continue with other data points
        }
      }

      // Calculate average score
      if (results.evaluated_data_points > 0) {
        results.average_score = totalScore / results.evaluated_data_points;
      }

      // Update evaluation run with results
      await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
        status: EvaluationRunStatus.COMPLETED,
        results,
        completed_at: new Date().toISOString(),
      });

      const updatedRuns = await userDataStorageConnector.getEvaluationRuns({
        id: evaluationRun.id,
      });
      return updatedRuns[0];
    } catch (error) {
      logger.error('Error during tool correctness evaluation:', error);

      // Update evaluation run with error status
      await userDataStorageConnector.updateEvaluationRun(evaluationRun.id, {
        status: EvaluationRunStatus.FAILED,
        results: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        completed_at: new Date().toISOString(),
      });

      throw error;
    }
  },

  getParameterSchema: ToolCorrectnessEvaluationParameters,
};
