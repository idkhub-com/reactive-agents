import type { ToolCall } from '@server/connectors/evaluations/tool-correctness/types';
import { HttpMethod } from '@server/types/http';
import { FunctionName } from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import type { Log } from '@shared/types/data';
import type { ToolCorrectnessEvaluationParameters } from '@shared/types/idkhub/evaluations/tool-correctness';
import { CacheMode, CacheStatus } from '@shared/types/middleware/cache';

// Re-export the core functions for testing
// These functions are copied from the main implementation to allow direct testing

export const extractToolsCalled = (log: Log): ToolCall[] => {
  const toolsCalled =
    log.ai_provider_request_log.request_body?.tools_called ||
    log.metadata?.tools_called ||
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

export const extractExpectedTools = (log: Log): ToolCall[] => {
  const expectedTools = log.metadata?.expected_tools || [];

  if (Array.isArray(expectedTools)) {
    return expectedTools.map((tool) => ({
      name: tool.name || tool.tool_name || '',
      input_parameters: tool.input_parameters || tool.args || {},
      output: tool.output || tool.result,
    }));
  }

  return [];
};

export const parametersMatch = (
  calledParams: Record<string, unknown> | undefined,
  expectedParams: Record<string, unknown> | undefined,
): boolean => {
  if (!calledParams && !expectedParams) return true;
  if (!calledParams || !expectedParams) return false;

  const calledKeys = Object.keys(calledParams);
  const expectedKeys = Object.keys(expectedParams);

  if (calledKeys.length !== expectedKeys.length) return false;

  for (const key of expectedKeys) {
    if (!calledKeys.includes(key)) return false;
    if (
      JSON.stringify(calledParams[key]) !== JSON.stringify(expectedParams[key])
    ) {
      return false;
    }
  }

  return true;
};

export const outputMatch = (
  calledOutput: unknown,
  expectedOutput: unknown,
): boolean => {
  // Perform deep equality check that handles all types properly
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

      // Check symbol properties
      const aSymbols = Object.getOwnPropertySymbols(
        a as Record<string | symbol, unknown>,
      );
      const bSymbols = Object.getOwnPropertySymbols(
        b as Record<string | symbol, unknown>,
      );

      if (aSymbols.length !== bSymbols.length) return false;

      for (const sym of aSymbols) {
        if (!bSymbols.includes(sym)) return false;
        if (
          !deepEqual(
            (a as Record<string | symbol, unknown>)[sym],
            (b as Record<string | symbol, unknown>)[sym],
          )
        ) {
          return false;
        }
      }

      return true;
    }

    return false;
  };

  return deepEqual(calledOutput, expectedOutput);
};

export const toolsMatch = (
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

export const isPerfectMatch = (
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

export const countMatchedTools = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
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

export const calculateStrictMode = (
  tools_called: ToolCall[],
  expected_tools: ToolCall[],
  parameters: ToolCorrectnessEvaluationParameters,
): number => {
  const perfect = isPerfectMatch(tools_called, expected_tools, parameters);
  return perfect ? 1 : 0;
};

export const calculateExactMatch = (
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

export const calculateWithOrdering = (
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

export const calculateBasicMatch = (
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

export const calculateToolCorrectness = (
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

export const generateReason = (
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

// Helper function to create test logs
export const createTestLog = (
  id: string,
  toolsCalled: ToolCall[],
  expectedTools: ToolCall[],
  metadata?: Record<string, unknown>,
): Log => {
  const seen = new WeakSet();
  return {
    id,
    agent_id: 'agent-123',
    skill_id: 'skill-123',
    method: HttpMethod.POST,
    endpoint: '/v1/chat/completions',
    function_name: FunctionName.CHAT_COMPLETE,
    status: 200,
    start_time: Date.now(),
    end_time: Date.now() + 1000,
    duration: 1000,
    base_idk_config: {},
    ai_provider: AIProvider.OPENAI,
    model: 'gpt-4',
    ai_provider_request_log: {
      provider: AIProvider.OPENAI,
      function_name: FunctionName.CHAT_COMPLETE,
      method: HttpMethod.POST,
      request_url: '/v1/chat/completions',
      status: 200,
      request_body: {
        messages: [{ role: 'user', content: 'Test message' }],
        tools_called: toolsCalled,
      },
      response_body: {
        choices: [{ message: { content: 'Test response' } }],
      },
      raw_request_body: JSON.stringify(
        {
          messages: [{ role: 'user', content: 'Test message' }],
          tools_called: toolsCalled,
        },
        (_key, value) => {
          // Handle circular references
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular Reference]';
            }
            seen.add(value);
          }
          return value;
        },
      ),
      raw_response_body: JSON.stringify({
        choices: [{ message: { content: 'Test response' } }],
      }),
      cache_mode: CacheMode.SIMPLE,
      cache_status: CacheStatus.MISS,
    },
    hook_logs: [],
    metadata: {
      expected_tools: expectedTools,
      tools_called: toolsCalled,
      ...metadata,
    },
    cache_status: CacheStatus.MISS,
    trace_id: null,
    parent_span_id: null,
    span_id: null,
    span_name: null,
    app_id: null,
    external_user_id: null,
    external_user_human_name: null,
    user_metadata: null,
  };
};

// Helper function to create tool calls
export const createToolCall = (
  name: string,
  inputParams?: Record<string, unknown>,
  output?: unknown,
): ToolCall => ({
  name,
  input_parameters: inputParams,
  output,
});
