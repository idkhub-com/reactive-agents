import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

interface LogEntry {
  id: string;
  function_name: string;
  ai_provider_request_log: {
    request_body: {
      messages: Array<{ role: string; content: string }>;
      tools?: Array<{
        type: string;
        function: {
          name: string;
          parameters: Record<string, unknown>;
        };
      }>;
    };
    response_body: {
      choices: Array<{
        message: {
          content: string;
          tool_calls?: Array<{
            function: {
              name: string;
              arguments: string;
            };
          }>;
        };
      }>;
    };
  };
}

interface ToolCall {
  name: string;
  input_parameters: Record<string, unknown>;
  output?: unknown;
}

function parseToolCalls(logEntry: LogEntry): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  if (
    logEntry.ai_provider_request_log.response_body.choices[0]?.message
      .tool_calls
  ) {
    for (const toolCall of logEntry.ai_provider_request_log.response_body
      .choices[0].message.tool_calls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        toolCalls.push({
          name: toolCall.function.name,
          input_parameters: args,
        });
      } catch (_error) {
        console.warn(
          `Failed to parse tool call arguments for ${toolCall.function.name}`,
        );
      }
    }
  }

  return toolCalls;
}

function extractExpectedTools(logEntry: LogEntry): ToolCall[] {
  const expectedTools: ToolCall[] = [];

  // This is a simple heuristic - in practice, you'd want more sophisticated logic
  // or manual annotation of expected tools
  const userMessage =
    logEntry.ai_provider_request_log.request_body.messages.find(
      (m) => m.role === 'user',
    );
  if (userMessage) {
    const content = userMessage.content.toLowerCase();

    // Simple keyword-based detection
    if (content.includes('weather') || content.includes('temperature')) {
      expectedTools.push({
        name: 'get_weather',
        input_parameters: {},
      });
    }

    if (content.includes('time') || content.includes('clock')) {
      expectedTools.push({
        name: 'get_time',
        input_parameters: {},
      });
    }

    if (
      content.includes('calculate') ||
      content.includes('math') ||
      content.includes('+') ||
      content.includes('-')
    ) {
      expectedTools.push({
        name: 'calculator',
        input_parameters: {},
      });
    }
  }

  return expectedTools;
}

function evaluateToolCorrectness(logEntries: LogEntry[]) {
  const results = {
    total_entries: logEntries.length,
    evaluated_entries: 0,
    average_score: 0,
    scores: [] as Array<{
      log_id: string;
      score: number;
      reason: string;
      tools_called: ToolCall[];
      expected_tools: ToolCall[];
    }>,
  };

  let totalScore = 0;

  for (const logEntry of logEntries) {
    const toolsCalled = parseToolCalls(logEntry);
    const expectedTools = extractExpectedTools(logEntry);

    // Scoring logic
    let score = 0;
    let reason = '';

    if (expectedTools.length === 0 && toolsCalled.length === 0) {
      score = 1;
      reason = 'No tools expected and none called';
    } else if (expectedTools.length > 0 && toolsCalled.length > 0) {
      const calledNames = toolsCalled.map((t) => t.name);
      const expectedNames = expectedTools.map((t) => t.name);

      if (
        calledNames.length === expectedNames.length &&
        calledNames.every((name) => expectedNames.includes(name))
      ) {
        score = 1;
        reason = `Perfect match: All expected tools (${expectedNames.join(', ')}) were called correctly.`;
      } else {
        score = 0;
        reason = `No match: Expected tools (${expectedNames.join(', ')}) but called (${calledNames.join(', ')}).`;
      }
    } else {
      score = 0;
      reason = `Mismatch: Expected ${expectedTools.length} tools but called ${toolsCalled.length} tools.`;
    }

    results.scores.push({
      log_id: logEntry.id,
      score,
      reason,
      tools_called: toolsCalled,
      expected_tools: expectedTools,
    });

    totalScore += score;
    results.evaluated_entries++;
  }

  // Calculate average score
  if (results.evaluated_entries > 0) {
    results.average_score = totalScore / results.evaluated_entries;
  }

  return results;
}

describe('Tool Correctness Evaluation', () => {
  let sampleLogEntries: LogEntry[];

  beforeEach(() => {
    // Sample test data
    sampleLogEntries = [
      {
        id: 'test-1',
        function_name: 'chat_complete',
        ai_provider_request_log: {
          request_body: {
            messages: [
              { role: 'user', content: 'What is the weather like today?' },
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'get_weather',
                  parameters: {},
                },
              },
            ],
          },
          response_body: {
            choices: [
              {
                message: {
                  content: '',
                  tool_calls: [
                    {
                      function: {
                        name: 'get_weather',
                        arguments: '{}',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      {
        id: 'test-2',
        function_name: 'chat_complete',
        ai_provider_request_log: {
          request_body: {
            messages: [{ role: 'user', content: 'What time is it?' }],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'get_time',
                  parameters: {},
                },
              },
            ],
          },
          response_body: {
            choices: [
              {
                message: {
                  content: '',
                  tool_calls: [
                    {
                      function: {
                        name: 'get_time',
                        arguments: '{}',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
      {
        id: 'test-3',
        function_name: 'chat_complete',
        ai_provider_request_log: {
          request_body: {
            messages: [{ role: 'user', content: 'Calculate 2 + 2' }],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'calculator',
                  parameters: {},
                },
              },
            ],
          },
          response_body: {
            choices: [
              {
                message: {
                  content: '',
                  tool_calls: [
                    {
                      function: {
                        name: 'calculator',
                        arguments: '{"expression": "2 + 2"}',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    ];
  });

  describe('parseToolCalls', () => {
    it('should parse tool calls from log entry', () => {
      const logEntry = sampleLogEntries[0];
      const toolCalls = parseToolCalls(logEntry);

      expect(toolCalls).toHaveLength(1);
      expect(toolCalls[0].name).toBe('get_weather');
      expect(toolCalls[0].input_parameters).toEqual({});
    });

    it('should handle log entries without tool calls', () => {
      const logEntryWithoutTools: LogEntry = {
        id: 'test-no-tools',
        function_name: 'chat_complete',
        ai_provider_request_log: {
          request_body: {
            messages: [{ role: 'user', content: 'Hello' }],
          },
          response_body: {
            choices: [
              {
                message: {
                  content: 'Hello there!',
                },
              },
            ],
          },
        },
      };

      const toolCalls = parseToolCalls(logEntryWithoutTools);
      expect(toolCalls).toHaveLength(0);
    });

    it('should handle invalid JSON in tool call arguments', () => {
      const logEntryWithInvalidJson: LogEntry = {
        id: 'test-invalid-json',
        function_name: 'chat_complete',
        ai_provider_request_log: {
          request_body: {
            messages: [{ role: 'user', content: 'Test' }],
          },
          response_body: {
            choices: [
              {
                message: {
                  content: '',
                  tool_calls: [
                    {
                      function: {
                        name: 'test_tool',
                        arguments: 'invalid json',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };

      const toolCalls = parseToolCalls(logEntryWithInvalidJson);
      expect(toolCalls).toHaveLength(0);
    });
  });

  describe('extractExpectedTools', () => {
    it('should detect weather-related tools', () => {
      const logEntry = sampleLogEntries[0];
      const expectedTools = extractExpectedTools(logEntry);

      expect(expectedTools).toHaveLength(1);
      expect(expectedTools[0].name).toBe('get_weather');
    });

    it('should detect time-related tools', () => {
      const logEntry = sampleLogEntries[1];
      const expectedTools = extractExpectedTools(logEntry);

      expect(expectedTools).toHaveLength(1);
      expect(expectedTools[0].name).toBe('get_time');
    });

    it('should detect calculator tools', () => {
      const logEntry = sampleLogEntries[2];
      const expectedTools = extractExpectedTools(logEntry);

      expect(expectedTools).toHaveLength(1);
      expect(expectedTools[0].name).toBe('calculator');
    });

    it('should return empty array for unrelated content', () => {
      const logEntry: LogEntry = {
        id: 'test-unrelated',
        function_name: 'chat_complete',
        ai_provider_request_log: {
          request_body: {
            messages: [{ role: 'user', content: 'Tell me a joke' }],
          },
          response_body: {
            choices: [
              {
                message: {
                  content: 'Here is a joke...',
                },
              },
            ],
          },
        },
      };

      const expectedTools = extractExpectedTools(logEntry);
      expect(expectedTools).toHaveLength(0);
    });
  });

  describe('evaluateToolCorrectness', () => {
    it('should evaluate tool correctness for multiple log entries', () => {
      const results = evaluateToolCorrectness(sampleLogEntries);

      expect(results.total_entries).toBe(3);
      expect(results.evaluated_entries).toBe(3);
      expect(results.average_score).toBe(1); // All should be perfect matches
      expect(results.scores).toHaveLength(3);
    });

    it('should give perfect score when expected and called tools match', () => {
      const logEntry = sampleLogEntries[0];
      const results = evaluateToolCorrectness([logEntry]);

      expect(results.scores[0].score).toBe(1);
      expect(results.scores[0].reason).toContain('Perfect match');
    });

    it('should give zero score when tools do not match', () => {
      const mismatchedLogEntry: LogEntry = {
        id: 'test-mismatch',
        function_name: 'chat_complete',
        ai_provider_request_log: {
          request_body: {
            messages: [{ role: 'user', content: 'What is the weather?' }],
          },
          response_body: {
            choices: [
              {
                message: {
                  content: '',
                  tool_calls: [
                    {
                      function: {
                        name: 'get_time', // Wrong tool called
                        arguments: '{}',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      };

      const results = evaluateToolCorrectness([mismatchedLogEntry]);
      expect(results.scores[0].score).toBe(0);
      expect(results.scores[0].reason).toContain('No match');
    });

    it('should handle cases with no tools expected and none called', () => {
      const noToolsLogEntry: LogEntry = {
        id: 'test-no-tools',
        function_name: 'chat_complete',
        ai_provider_request_log: {
          request_body: {
            messages: [{ role: 'user', content: 'Tell me a joke' }],
          },
          response_body: {
            choices: [
              {
                message: {
                  content: 'Here is a joke...',
                },
              },
            ],
          },
        },
      };

      const results = evaluateToolCorrectness([noToolsLogEntry]);
      expect(results.scores[0].score).toBe(1);
      expect(results.scores[0].reason).toBe(
        'No tools expected and none called',
      );
    });

    it('should handle empty log entries array', () => {
      const results = evaluateToolCorrectness([]);

      expect(results.total_entries).toBe(0);
      expect(results.evaluated_entries).toBe(0);
      expect(results.average_score).toBe(0);
      expect(results.scores).toHaveLength(0);
    });
  });

  describe('Integration with actual log files', () => {
    it('should process sample log file if available', () => {
      const sampleLogPath = path.join(
        __dirname,
        '../../../assets/sample-logs.json',
      );

      if (fs.existsSync(sampleLogPath)) {
        const logData = JSON.parse(fs.readFileSync(sampleLogPath, 'utf8'));

        // Handle different log file formats
        let logEntries: LogEntry[];
        if (Array.isArray(logData)) {
          logEntries = logData;
        } else if (logData.entries && Array.isArray(logData.entries)) {
          logEntries = logData.entries;
        } else if (logData.logs && Array.isArray(logData.logs)) {
          logEntries = logData.logs;
        } else {
          throw new Error('Invalid log file format');
        }

        // Filter for chat completion entries
        const chatEntries = logEntries.filter(
          (entry) =>
            entry.function_name === 'chat_complete' &&
            entry.ai_provider_request_log?.request_body?.tools,
        );

        if (chatEntries.length > 0) {
          const results = evaluateToolCorrectness(chatEntries);

          expect(results.total_entries).toBeGreaterThan(0);
          expect(results.evaluated_entries).toBeGreaterThan(0);
          expect(results.average_score).toBeGreaterThanOrEqual(0);
          expect(results.average_score).toBeLessThanOrEqual(1);
          expect(results.scores).toHaveLength(chatEntries.length);
        }
      } else {
        // Skip test if sample file doesn't exist
        console.log('Sample log file not found, skipping integration test');
      }
    });
  });
});
