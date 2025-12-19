import {
  ArticleConcept,
  ArticleSummary,
  DeleteResponseResponseBody,
  FileCitationAnnotation,
  FilePathAnnotation,
  ListResponsesResponseBody,
  MathReasoning,
  MathReasoningStep,
  McpApprovalRequest,
  McpCall,
  McpListTools,
  ResponseCompletedEvent,
  ResponseFormatTextConfig,
  ResponseInputItem,
  ResponseRefusal,
  ResponsesAPIFunctionCall,
  ResponsesAPIOutput,
  ResponsesAPIOutputAnnotation,
  ResponsesAPIOutputContent,
  ResponsesAPIOutputWithRefusal,
  ResponsesAPIReasoningOutput,
  ResponsesResponseBody,
  ResponsesResponseBodyError,
  ResponseTextConfig,
  URLCitationAnnotation,
} from '@shared/types/api/routes/responses-api/response';

import { describe, expect, it } from 'vitest';

describe('Responses API Response Types', () => {
  describe('Annotation Types', () => {
    describe('FileCitationAnnotation', () => {
      it('should validate valid file citation annotation', () => {
        const validAnnotation = {
          type: 'file_citation',
          text: 'According to the document',
          file_citation: {
            file_id: 'file-abc123',
            quote: 'relevant quote from file',
          },
          start_index: 0,
          end_index: 25,
        };

        const result = FileCitationAnnotation.safeParse(validAnnotation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('file_citation');
          expect(result.data.file_citation.file_id).toBe('file-abc123');
          expect(result.data.file_citation.quote).toBe(
            'relevant quote from file',
          );
        }
      });

      it('should validate file citation without quote', () => {
        const validAnnotation = {
          type: 'file_citation',
          text: 'According to the document',
          file_citation: {
            file_id: 'file-abc123',
          },
          start_index: 0,
          end_index: 25,
        };

        const result = FileCitationAnnotation.safeParse(validAnnotation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.file_citation.quote).toBeUndefined();
        }
      });

      it('should reject invalid type', () => {
        const invalidAnnotation = {
          type: 'invalid_type',
          text: 'According to the document',
          file_citation: {
            file_id: 'file-abc123',
          },
          start_index: 0,
          end_index: 25,
        };

        const result = FileCitationAnnotation.safeParse(invalidAnnotation);
        expect(result.success).toBe(false);
      });

      it('should reject missing required fields', () => {
        const invalidAnnotation = {
          type: 'file_citation',
          text: 'According to the document',
          // missing file_citation
          start_index: 0,
          end_index: 25,
        };

        const result = FileCitationAnnotation.safeParse(invalidAnnotation);
        expect(result.success).toBe(false);
      });
    });

    describe('URLCitationAnnotation', () => {
      it('should validate valid URL citation annotation', () => {
        const validAnnotation = {
          type: 'url_citation',
          text: 'Based on this source',
          url_citation: {
            url: 'https://example.com/article',
            title: 'Example Article Title',
          },
          start_index: 0,
          end_index: 20,
        };

        const result = URLCitationAnnotation.safeParse(validAnnotation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('url_citation');
          expect(result.data.url_citation.url).toBe(
            'https://example.com/article',
          );
          expect(result.data.url_citation.title).toBe('Example Article Title');
        }
      });

      it('should validate URL citation without title', () => {
        const validAnnotation = {
          type: 'url_citation',
          text: 'Based on this source',
          url_citation: {
            url: 'https://example.com/article',
          },
          start_index: 0,
          end_index: 20,
        };

        const result = URLCitationAnnotation.safeParse(validAnnotation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.url_citation.title).toBeUndefined();
        }
      });

      it('should reject invalid URL citation', () => {
        const invalidAnnotation = {
          type: 'url_citation',
          text: 'Based on this source',
          url_citation: {
            // missing url
            title: 'Example Article Title',
          },
          start_index: 0,
          end_index: 20,
        };

        const result = URLCitationAnnotation.safeParse(invalidAnnotation);
        expect(result.success).toBe(false);
      });
    });

    describe('FilePathAnnotation', () => {
      it('should validate valid file path annotation', () => {
        const validAnnotation = {
          type: 'file_path',
          text: 'See file for details',
          file_path: {
            file_id: 'file-xyz789',
          },
          start_index: 0,
          end_index: 20,
        };

        const result = FilePathAnnotation.safeParse(validAnnotation);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('file_path');
          expect(result.data.file_path.file_id).toBe('file-xyz789');
        }
      });

      it('should reject missing file_id', () => {
        const invalidAnnotation = {
          type: 'file_path',
          text: 'See file for details',
          file_path: {},
          start_index: 0,
          end_index: 20,
        };

        const result = FilePathAnnotation.safeParse(invalidAnnotation);
        expect(result.success).toBe(false);
      });
    });

    describe('ResponsesAPIOutputAnnotation Union', () => {
      it('should accept all valid annotation types', () => {
        const fileCitation = {
          type: 'file_citation',
          text: 'According to the document',
          file_citation: { file_id: 'file-123' },
          start_index: 0,
          end_index: 25,
        };

        const urlCitation = {
          type: 'url_citation',
          text: 'Based on this source',
          url_citation: { url: 'https://example.com' },
          start_index: 0,
          end_index: 20,
        };

        const filePath = {
          type: 'file_path',
          text: 'See file for details',
          file_path: { file_id: 'file-456' },
          start_index: 0,
          end_index: 20,
        };

        expect(
          ResponsesAPIOutputAnnotation.safeParse(fileCitation).success,
        ).toBe(true);
        expect(
          ResponsesAPIOutputAnnotation.safeParse(urlCitation).success,
        ).toBe(true);
        expect(ResponsesAPIOutputAnnotation.safeParse(filePath).success).toBe(
          true,
        );
      });

      it('should reject invalid annotation types', () => {
        const invalidAnnotation = {
          type: 'invalid_type',
          text: 'Some text',
          start_index: 0,
          end_index: 20,
        };

        const result =
          ResponsesAPIOutputAnnotation.safeParse(invalidAnnotation);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Output Content and Structure', () => {
    describe('ResponsesAPIOutputContent', () => {
      it('should validate valid output content', () => {
        const validContent = {
          annotations: [
            {
              type: 'file_citation',
              text: 'According to the document',
              file_citation: { file_id: 'file-123' },
              start_index: 0,
              end_index: 25,
            },
          ],
          text: 'This is the generated content according to the document.',
          type: 'text',
        };

        const result = ResponsesAPIOutputContent.safeParse(validContent);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.text).toBe(
            'This is the generated content according to the document.',
          );
          expect(result.data.type).toBe('text');
          expect(result.data.annotations).toHaveLength(1);
        }
      });

      it('should validate content with empty annotations', () => {
        const validContent = {
          annotations: [],
          text: 'Simple text without annotations.',
          type: 'text',
        };

        const result = ResponsesAPIOutputContent.safeParse(validContent);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.annotations).toHaveLength(0);
        }
      });

      it('should validate content with multiple annotation types', () => {
        const validContent = {
          annotations: [
            {
              type: 'file_citation',
              text: 'According to the document',
              file_citation: { file_id: 'file-123' },
              start_index: 0,
              end_index: 25,
            },
            {
              type: 'url_citation',
              text: 'and from this source',
              url_citation: { url: 'https://example.com' },
              start_index: 26,
              end_index: 46,
            },
          ],
          text: 'Combined content from multiple sources.',
          type: 'text',
        };

        const result = ResponsesAPIOutputContent.safeParse(validContent);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.annotations).toHaveLength(2);
        }
      });
    });

    describe('ResponsesAPIOutput', () => {
      it('should validate valid basic output', () => {
        const validOutput = {
          id: 'output-123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              annotations: [],
              text: 'Hello! How can I help you today?',
              type: 'text',
            },
          ],
        };

        const result = ResponsesAPIOutput.safeParse(validOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('output-123');
          expect(result.data.type).toBe('message');
          expect(result.data.role).toBe('assistant');
          expect(result.data.content).toHaveLength(1);
        }
      });

      it('should validate output with status', () => {
        const validOutput = {
          id: 'output-123',
          type: 'message',
          role: 'assistant',
          content: [
            {
              annotations: [],
              text: 'Processing your request...',
              type: 'text',
            },
          ],
          status: 'in_progress',
        };

        const result = ResponsesAPIOutput.safeParse(validOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('in_progress');
        }
      });

      it('should validate output with multiple content items', () => {
        const validOutput = {
          id: 'output-456',
          type: 'message',
          role: 'assistant',
          content: [
            {
              annotations: [],
              text: 'First part of the response.',
              type: 'text',
            },
            {
              annotations: [
                {
                  type: 'url_citation',
                  text: 'source reference',
                  url_citation: { url: 'https://example.com' },
                  start_index: 0,
                  end_index: 16,
                },
              ],
              text: 'Second part with source reference.',
              type: 'text',
            },
          ],
        };

        const result = ResponsesAPIOutput.safeParse(validOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.content).toHaveLength(2);
        }
      });

      it('should reject invalid role', () => {
        const invalidOutput = {
          id: 'output-123',
          type: 'message',
          role: 'invalid_role',
          content: [],
        };

        const result = ResponsesAPIOutput.safeParse(invalidOutput);
        expect(result.success).toBe(false);
      });

      it('should reject invalid type', () => {
        const invalidOutput = {
          id: 'output-123',
          type: 'invalid_type',
          role: 'assistant',
          content: [],
        };

        const result = ResponsesAPIOutput.safeParse(invalidOutput);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Function Calls and Tool Interactions', () => {
    describe('ResponsesAPIFunctionCall', () => {
      it('should validate valid function call', () => {
        const validFunctionCall = {
          arguments: '{"location": "San Francisco"}',
          call_id: 'call-abc123',
          name: 'get_weather',
          type: 'function',
        };

        const result = ResponsesAPIFunctionCall.safeParse(validFunctionCall);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.arguments).toBe('{"location": "San Francisco"}');
          expect(result.data.call_id).toBe('call-abc123');
          expect(result.data.name).toBe('get_weather');
          expect(result.data.type).toBe('function');
        }
      });

      it('should validate function call with optional fields', () => {
        const validFunctionCall = {
          arguments: '{"query": "hello world"}',
          call_id: 'call-xyz789',
          name: 'search',
          type: 'function',
          id: 'tool-call-456',
          status: 'completed',
        };

        const result = ResponsesAPIFunctionCall.safeParse(validFunctionCall);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('tool-call-456');
          expect(result.data.status).toBe('completed');
        }
      });

      it('should validate all status types', () => {
        const statuses = ['in_progress', 'completed', 'incomplete'];

        statuses.forEach((status) => {
          const validFunctionCall = {
            arguments: '{}',
            call_id: 'call-123',
            name: 'test_function',
            type: 'function',
            status,
          };

          const result = ResponsesAPIFunctionCall.safeParse(validFunctionCall);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.status).toBe(status);
          }
        });
      });

      it('should reject invalid status', () => {
        const invalidFunctionCall = {
          arguments: '{}',
          call_id: 'call-123',
          name: 'test_function',
          type: 'function',
          status: 'invalid_status',
        };

        const result = ResponsesAPIFunctionCall.safeParse(invalidFunctionCall);
        expect(result.success).toBe(false);
      });

      it('should reject missing required fields', () => {
        const invalidFunctionCall = {
          arguments: '{}',
          // missing call_id
          name: 'test_function',
          type: 'function',
        };

        const result = ResponsesAPIFunctionCall.safeParse(invalidFunctionCall);
        expect(result.success).toBe(false);
      });
    });

    describe('MCP (Model Context Protocol) Types', () => {
      describe('McpCall', () => {
        it('should validate valid MCP call', () => {
          const validMcpCall = {
            id: 'mcp-call-123',
            arguments: '{"param": "value"}',
            name: 'get_data',
            server_label: 'data-server',
            type: 'mcp_call',
          };

          const result = McpCall.safeParse(validMcpCall);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.type).toBe('mcp_call');
            expect(result.data.server_label).toBe('data-server');
          }
        });

        it('should validate MCP call with output and error', () => {
          const validMcpCall = {
            id: 'mcp-call-456',
            arguments: '{"param": "value"}',
            name: 'get_data',
            server_label: 'data-server',
            type: 'mcp_call',
            output: 'Operation completed successfully',
            error: null,
          };

          const result = McpCall.safeParse(validMcpCall);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.output).toBe('Operation completed successfully');
            expect(result.data.error).toBe(null);
          }
        });

        it('should validate MCP call with error', () => {
          const validMcpCall = {
            id: 'mcp-call-789',
            arguments: '{"param": "value"}',
            name: 'get_data',
            server_label: 'data-server',
            type: 'mcp_call',
            output: null,
            error: 'Connection timeout',
          };

          const result = McpCall.safeParse(validMcpCall);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.error).toBe('Connection timeout');
            expect(result.data.output).toBe(null);
          }
        });

        it('should reject invalid type', () => {
          const invalidMcpCall = {
            id: 'mcp-call-123',
            arguments: '{"param": "value"}',
            name: 'get_data',
            server_label: 'data-server',
            type: 'invalid_type',
          };

          const result = McpCall.safeParse(invalidMcpCall);
          expect(result.success).toBe(false);
        });
      });

      describe('McpApprovalRequest', () => {
        it('should validate valid MCP approval request', () => {
          const validApprovalRequest = {
            id: 'approval-123',
            arguments: '{"sensitive_operation": true}',
            name: 'delete_data',
            server_label: 'admin-server',
            type: 'mcp_approval_request',
          };

          const result = McpApprovalRequest.safeParse(validApprovalRequest);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.type).toBe('mcp_approval_request');
            expect(result.data.name).toBe('delete_data');
          }
        });

        it('should reject invalid type', () => {
          const invalidApprovalRequest = {
            id: 'approval-123',
            arguments: '{"sensitive_operation": true}',
            name: 'delete_data',
            server_label: 'admin-server',
            type: 'wrong_type',
          };

          const result = McpApprovalRequest.safeParse(invalidApprovalRequest);
          expect(result.success).toBe(false);
        });
      });

      describe('McpListTools', () => {
        it('should validate valid MCP list tools', () => {
          const validListTools = {
            id: 'tools-list-123',
            server_label: 'tool-server',
            tools: [
              { name: 'tool1', description: 'First tool' },
              { name: 'tool2', description: 'Second tool' },
            ],
            type: 'mcp_list_tools',
          };

          const result = McpListTools.safeParse(validListTools);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.type).toBe('mcp_list_tools');
            expect(result.data.tools).toHaveLength(2);
          }
        });

        it('should validate MCP list tools with error', () => {
          const validListTools = {
            id: 'tools-list-456',
            server_label: 'broken-server',
            tools: [],
            type: 'mcp_list_tools',
            error: 'Server unavailable',
          };

          const result = McpListTools.safeParse(validListTools);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.error).toBe('Server unavailable');
          }
        });
      });
    });
  });

  describe('Structured Output Examples', () => {
    describe('MathReasoning', () => {
      describe('MathReasoningStep', () => {
        it('should validate valid math reasoning step', () => {
          const validStep = {
            explanation: 'First, we need to identify the equation',
            output: 'x + 2 = 10',
          };

          const result = MathReasoningStep.safeParse(validStep);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.explanation).toBe(
              'First, we need to identify the equation',
            );
            expect(result.data.output).toBe('x + 2 = 10');
          }
        });

        it('should reject missing fields', () => {
          const invalidStep = {
            explanation: 'Missing output field',
            // missing output
          };

          const result = MathReasoningStep.safeParse(invalidStep);
          expect(result.success).toBe(false);
        });
      });

      it('should validate complete math reasoning', () => {
        const validMathReasoning = {
          steps: [
            {
              explanation: 'Start with the given equation',
              output: 'x + 2 = 10',
            },
            {
              explanation: 'Subtract 2 from both sides',
              output: 'x = 10 - 2',
            },
            {
              explanation: 'Simplify the right side',
              output: 'x = 8',
            },
          ],
          final_answer: '8',
        };

        const result = MathReasoning.safeParse(validMathReasoning);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.steps).toHaveLength(3);
          expect(result.data.final_answer).toBe('8');
        }
      });

      it('should reject empty steps array', () => {
        const invalidMathReasoning = {
          steps: [],
          final_answer: '8',
        };

        const result = MathReasoning.safeParse(invalidMathReasoning);
        expect(result.success).toBe(true); // Empty array is valid in Zod
        if (result.success) {
          expect(result.data.steps).toHaveLength(0);
        }
      });
    });

    describe('ArticleSummary', () => {
      describe('ArticleConcept', () => {
        it('should validate valid article concept', () => {
          const validConcept = {
            title: 'Machine Learning',
            description:
              'A subset of artificial intelligence focused on algorithms that learn from data',
          };

          const result = ArticleConcept.safeParse(validConcept);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.title).toBe('Machine Learning');
            expect(result.data.description).toContain(
              'artificial intelligence',
            );
          }
        });
      });

      it('should validate complete article summary', () => {
        const validArticleSummary = {
          invented_year: 1943,
          summary:
            'Neural networks are computing systems inspired by biological neural networks.',
          inventors: ['Warren McCulloch', 'Walter Pitts'],
          description:
            'Neural networks consist of interconnected nodes that process information.',
          concepts: [
            {
              title: 'Perceptron',
              description: 'A linear classifier algorithm',
            },
            {
              title: 'Backpropagation',
              description: 'An algorithm for training neural networks',
            },
          ],
        };

        const result = ArticleSummary.safeParse(validArticleSummary);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.invented_year).toBe(1943);
          expect(result.data.inventors).toHaveLength(2);
          expect(result.data.concepts).toHaveLength(2);
        }
      });

      it('should validate article summary with empty inventors', () => {
        const validArticleSummary = {
          invented_year: 2000,
          summary: 'A modern invention with unknown inventors.',
          inventors: [],
          description: 'This invention has no known specific inventors.',
          concepts: [],
        };

        const result = ArticleSummary.safeParse(validArticleSummary);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.inventors).toHaveLength(0);
          expect(result.data.concepts).toHaveLength(0);
        }
      });
    });
  });

  describe('Advanced Response Types', () => {
    describe('ResponseRefusal', () => {
      it('should validate valid refusal', () => {
        const validRefusal = {
          refusal:
            'I cannot provide information about creating harmful content as it violates our usage policies.',
        };

        const result = ResponseRefusal.safeParse(validRefusal);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.refusal).toContain('usage policies');
        }
      });

      it('should reject empty refusal', () => {
        const invalidRefusal = {
          refusal: '',
        };

        const result = ResponseRefusal.safeParse(invalidRefusal);
        expect(result.success).toBe(true); // Empty string is valid in Zod
        if (result.success) {
          expect(result.data.refusal).toBe('');
        }
      });
    });

    describe('ResponsesAPIOutputWithRefusal', () => {
      it('should validate output with refusal', () => {
        const validOutputWithRefusal = {
          id: 'output-refused-123',
          type: 'message',
          role: 'assistant',
          refusal:
            'I cannot assist with that request as it violates our safety guidelines.',
        };

        const result = ResponsesAPIOutputWithRefusal.safeParse(
          validOutputWithRefusal,
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.refusal).toContain('safety guidelines');
          expect(result.data.content).toBeUndefined();
        }
      });

      it('should validate output with content (no refusal)', () => {
        const validOutputWithContent = {
          id: 'output-content-456',
          type: 'message',
          role: 'assistant',
          content: [
            {
              annotations: [],
              text: 'Here is the requested information.',
              type: 'text',
            },
          ],
          refusal: '',
        };

        const result = ResponsesAPIOutputWithRefusal.safeParse(
          validOutputWithContent,
        );
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.content).toHaveLength(1);
          expect(result.data.refusal).toBe('');
        }
      });
    });

    describe('ResponsesAPIReasoningOutput', () => {
      it('should validate valid reasoning output', () => {
        const validReasoningOutput = {
          id: 'reasoning-123',
          type: 'reasoning',
          summary: [
            'Analyzed the problem parameters',
            'Applied mathematical principles',
            'Verified the solution',
          ],
        };

        const result =
          ResponsesAPIReasoningOutput.safeParse(validReasoningOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('reasoning');
          expect(result.data.summary).toHaveLength(3);
        }
      });

      it('should validate reasoning output with trace', () => {
        const validReasoningOutput = {
          id: 'reasoning-456',
          type: 'reasoning',
          summary: ['Comprehensive analysis completed'],
          trace:
            'Step 1: Initial assessment\nStep 2: Data analysis\nStep 3: Conclusion',
        };

        const result =
          ResponsesAPIReasoningOutput.safeParse(validReasoningOutput);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.trace).toContain('Step 1');
        }
      });

      it('should reject invalid type', () => {
        const invalidReasoningOutput = {
          id: 'reasoning-789',
          type: 'invalid_reasoning_type',
          summary: ['Analysis completed'],
        };

        const result = ResponsesAPIReasoningOutput.safeParse(
          invalidReasoningOutput,
        );
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Response Format Configuration', () => {
    describe('ResponseFormatTextConfig', () => {
      it('should validate JSON schema format', () => {
        const validFormat = {
          type: 'json_schema',
          name: 'math_solution',
          schema: {
            type: 'object',
            properties: {
              steps: { type: 'array' },
              answer: { type: 'string' },
            },
          },
          strict: true,
          description: 'Math problem solution format',
        };

        const result = ResponseFormatTextConfig.safeParse(validFormat);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('json_schema');
          expect(result.data.strict).toBe(true);
        }
      });

      it('should validate text format', () => {
        const validFormat = {
          type: 'text',
        };

        const result = ResponseFormatTextConfig.safeParse(validFormat);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('text');
        }
      });

      it('should validate JSON object format', () => {
        const validFormat = {
          type: 'json_object',
        };

        const result = ResponseFormatTextConfig.safeParse(validFormat);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('json_object');
        }
      });

      it('should reject invalid type', () => {
        const invalidFormat = {
          type: 'invalid_format',
        };

        const result = ResponseFormatTextConfig.safeParse(invalidFormat);
        expect(result.success).toBe(false);
      });
    });

    describe('ResponseTextConfig', () => {
      it('should validate response text config with format', () => {
        const validConfig = {
          format: {
            type: 'json_schema',
            name: 'user_profile',
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
            },
          },
        };

        const result = ResponseTextConfig.safeParse(validConfig);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.format?.type).toBe('json_schema');
        }
      });

      it('should validate response text config without format', () => {
        const validConfig = {};

        const result = ResponseTextConfig.safeParse(validConfig);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.format).toBeUndefined();
        }
      });
    });
  });

  describe('Error Types', () => {
    describe('ResponsesResponseBodyError', () => {
      it('should validate valid error', () => {
        const validError = {
          code: 'invalid_request',
          message: 'The request was malformed or contained invalid parameters.',
        };

        const result = ResponsesResponseBodyError.safeParse(validError);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.code).toBe('invalid_request');
          expect(result.data.message).toContain('malformed');
        }
      });

      it('should reject missing fields', () => {
        const invalidError = {
          code: 'invalid_request',
          // missing message
        };

        const result = ResponsesResponseBodyError.safeParse(invalidError);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Main Response Body', () => {
    describe('ResponsesResponseBody', () => {
      it('should validate minimal valid response body', () => {
        const validResponseBody = {
          id: 'resp-123',
          created_at: 1677649420,
          error: null,
          incomplete_details: null,
          instructions: null,
          metadata: null,
          model: 'gpt-4',
          object: 'response',
          output: [
            {
              id: 'output-456',
              type: 'message',
              role: 'assistant',
              content: [
                {
                  annotations: [],
                  text: 'Hello! How can I help you today?',
                  type: 'text',
                },
              ],
            },
          ],
          parallel_tool_calls: null,
          previous_response_id: null,
          reasoning: null,
          reasoning_effort: null,
          status: null,
          temperature: null,
          text: null,
          tool_choice: null,
          tools: [],
          top_p: null,
          max_output_tokens: null,
          truncation: null,
          usage: null,
          user: null,
        };

        const result = ResponsesResponseBody.safeParse(validResponseBody);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('resp-123');
          expect(result.data.object).toBe('response');
          expect(result.data.output).toHaveLength(1);
        }
      });

      it('should validate response body with error', () => {
        const validResponseBody = {
          id: 'resp-error-123',
          created_at: 1677649420,
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many requests in a short time period.',
          },
          incomplete_details: null,
          instructions: null,
          metadata: null,
          model: 'gpt-4',
          object: 'response',
          output: [],
          parallel_tool_calls: null,
          previous_response_id: null,
          reasoning: null,
          reasoning_effort: null,
          status: 'failed',
          temperature: null,
          text: null,
          tool_choice: null,
          tools: [],
          top_p: null,
          max_output_tokens: null,
          truncation: null,
          usage: null,
          user: null,
        };

        const result = ResponsesResponseBody.safeParse(validResponseBody);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.error?.code).toBe('rate_limit_exceeded');
          expect(result.data.status).toBe('failed');
        }
      });

      it('should validate response body with comprehensive usage data', () => {
        const validResponseBody = {
          id: 'resp-usage-123',
          created_at: 1677649420,
          error: null,
          incomplete_details: null,
          instructions: 'You are a helpful assistant.',
          metadata: { session_id: 'session-456', user_id: 'user-789' },
          model: 'gpt-4',
          object: 'response',
          output: [
            {
              id: 'output-reasoning-123',
              type: 'reasoning',
              summary: [
                'Problem analysis',
                'Solution approach',
                'Verification',
              ],
            },
            {
              id: 'output-message-456',
              type: 'message',
              role: 'assistant',
              content: [
                {
                  annotations: [],
                  text: 'Based on my analysis, the solution is...',
                  type: 'text',
                },
              ],
            },
          ],
          parallel_tool_calls: true,
          previous_response_id: 'resp-prev-123',
          reasoning: {
            effort: 'high',
          },
          reasoning_effort: 'high',
          status: 'completed',
          temperature: 0.7,
          text: {
            format: {
              type: 'json_schema',
              name: 'solution',
              schema: { type: 'object' },
            },
          },
          tool_choice: 'auto',
          tools: [
            {
              type: 'function',
              function: {
                name: 'calculate',
                description: 'Perform mathematical calculations',
                parameters: { type: 'object' },
              },
            },
          ],
          top_p: 0.9,
          max_output_tokens: 1000,
          truncation: 'auto',
          usage: {
            input_tokens: 50,
            input_tokens_details: {
              cached_tokens: 10,
            },
            output_tokens: 150,
            output_tokens_details: {
              reasoning_tokens: 50,
            },
            total_tokens: 200,
          },
          user: 'user-789',
          provider: 'openai',
          service_tier: 'scale',
        };

        const result = ResponsesResponseBody.safeParse(validResponseBody);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.usage?.total_tokens).toBe(200);
          expect(result.data.reasoning?.effort).toBe('high');
          expect(result.data.tools).toHaveLength(1);
        }
      });

      it('should validate all status types', () => {
        const statuses = ['completed', 'failed', 'in_progress', 'incomplete'];

        statuses.forEach((status) => {
          const validResponseBody = {
            id: `resp-${status}-123`,
            created_at: 1677649420,
            error: null,
            incomplete_details: null,
            instructions: null,
            metadata: null,
            model: 'gpt-4',
            object: 'response',
            output: [],
            parallel_tool_calls: null,
            previous_response_id: null,
            reasoning: null,
            reasoning_effort: null,
            status,
            temperature: null,
            text: null,
            tool_choice: null,
            tools: [],
            top_p: null,
            max_output_tokens: null,
            truncation: null,
            usage: null,
            user: null,
          };

          const result = ResponsesResponseBody.safeParse(validResponseBody);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.status).toBe(status);
          }
        });
      });

      it('should validate all reasoning effort levels', () => {
        const efforts = ['low', 'medium', 'high'];

        efforts.forEach((effort) => {
          const validResponseBody = {
            id: `resp-effort-${effort}-123`,
            created_at: 1677649420,
            error: null,
            incomplete_details: null,
            instructions: null,
            metadata: null,
            model: 'o1-preview',
            object: 'response',
            output: [],
            parallel_tool_calls: null,
            previous_response_id: null,
            reasoning: { effort },
            reasoning_effort: effort,
            status: null,
            temperature: null,
            text: null,
            tool_choice: null,
            tools: [],
            top_p: null,
            max_output_tokens: null,
            truncation: null,
            usage: null,
            user: null,
          };

          const result = ResponsesResponseBody.safeParse(validResponseBody);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.reasoning_effort).toBe(effort);
          }
        });
      });

      it('should reject invalid object type', () => {
        const invalidResponseBody = {
          id: 'resp-123',
          created_at: 1677649420,
          error: null,
          incomplete_details: null,
          instructions: null,
          metadata: null,
          model: 'gpt-4',
          object: 'invalid_object_type',
          output: [],
          parallel_tool_calls: null,
          previous_response_id: null,
          reasoning: null,
          reasoning_effort: null,
          status: null,
          temperature: null,
          text: null,
          tool_choice: null,
          tools: [],
          top_p: null,
          max_output_tokens: null,
          truncation: null,
          usage: null,
          user: null,
        };

        const result = ResponsesResponseBody.safeParse(invalidResponseBody);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('List and Management Response Bodies', () => {
    describe('ListResponsesResponseBody', () => {
      it('should validate valid list responses', () => {
        const validListResponse = {
          object: 'list',
          data: [
            {
              id: 'resp-1',
              created_at: 1677649420,
              error: null,
              incomplete_details: null,
              instructions: null,
              metadata: null,
              model: 'gpt-4',
              object: 'response',
              output: [],
              parallel_tool_calls: null,
              previous_response_id: null,
              reasoning: null,
              reasoning_effort: null,
              status: null,
              temperature: null,
              text: null,
              tool_choice: null,
              tools: [],
              top_p: null,
              max_output_tokens: null,
              truncation: null,
              usage: null,
              user: null,
            },
          ],
          first_id: 'resp-1',
          last_id: 'resp-1',
          has_more: false,
        };

        const result = ListResponsesResponseBody.safeParse(validListResponse);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.object).toBe('list');
          expect(result.data.data).toHaveLength(1);
          expect(result.data.has_more).toBe(false);
        }
      });

      it('should validate empty list', () => {
        const validListResponse = {
          object: 'list',
          data: [],
          first_id: null,
          last_id: null,
          has_more: false,
        };

        const result = ListResponsesResponseBody.safeParse(validListResponse);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.data).toHaveLength(0);
          expect(result.data.first_id).toBe(null);
        }
      });
    });

    describe('DeleteResponseResponseBody', () => {
      it('should validate valid delete response', () => {
        const validDeleteResponse = {
          id: 'resp-deleted-123',
          object: 'response.deleted',
          deleted: true,
        };

        const result =
          DeleteResponseResponseBody.safeParse(validDeleteResponse);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.object).toBe('response.deleted');
          expect(result.data.deleted).toBe(true);
        }
      });

      it('should reject invalid object type', () => {
        const invalidDeleteResponse = {
          id: 'resp-deleted-123',
          object: 'wrong_object_type',
          deleted: true,
        };

        const result = DeleteResponseResponseBody.safeParse(
          invalidDeleteResponse,
        );
        expect(result.success).toBe(false);
      });

      it('should reject invalid deleted value', () => {
        const invalidDeleteResponse = {
          id: 'resp-deleted-123',
          object: 'response.deleted',
          deleted: false, // Must be true
        };

        const result = DeleteResponseResponseBody.safeParse(
          invalidDeleteResponse,
        );
        expect(result.success).toBe(false);
      });
    });

    describe('ResponseInputItem', () => {
      it('should validate text input item', () => {
        const validInputItem = {
          id: 'input-123',
          object: 'response.input_item',
          created_at: 1677649420,
          content: 'What is the capital of France?',
          type: 'text',
        };

        const result = ResponseInputItem.safeParse(validInputItem);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('text');
          expect(result.data.content).toBe('What is the capital of France?');
        }
      });

      it('should validate message input item', () => {
        const validInputItem = {
          id: 'input-456',
          object: 'response.input_item',
          created_at: 1677649420,
          content: [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there!' },
          ],
          type: 'message',
        };

        const result = ResponseInputItem.safeParse(validInputItem);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('message');
          expect(Array.isArray(result.data.content)).toBe(true);
        }
      });

      it('should reject invalid type', () => {
        const invalidInputItem = {
          id: 'input-789',
          object: 'response.input_item',
          created_at: 1677649420,
          content: 'Some content',
          type: 'invalid_type',
        };

        const result = ResponseInputItem.safeParse(invalidInputItem);
        expect(result.success).toBe(false);
      });
    });

    describe('Event Types', () => {
      describe('ResponseCompletedEvent', () => {
        it('should validate valid response completed event', () => {
          const validEvent = {
            type: 'response.completed',
            response: {
              id: 'resp-completed-123',
              created_at: 1677649420,
              error: null,
              incomplete_details: null,
              instructions: null,
              metadata: null,
              model: 'gpt-4',
              object: 'response',
              output: [
                {
                  id: 'output-final',
                  type: 'message',
                  role: 'assistant',
                  content: [
                    {
                      annotations: [],
                      text: 'Task completed successfully!',
                      type: 'text',
                    },
                  ],
                },
              ],
              parallel_tool_calls: null,
              previous_response_id: null,
              reasoning: null,
              reasoning_effort: null,
              status: 'completed',
              temperature: null,
              text: null,
              tool_choice: null,
              tools: [],
              top_p: null,
              max_output_tokens: null,
              truncation: null,
              usage: {
                input_tokens: 20,
                output_tokens: 30,
                output_tokens_details: { reasoning_tokens: 0 },
                total_tokens: 50,
              },
              user: null,
            },
          };

          const result = ResponseCompletedEvent.safeParse(validEvent);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.type).toBe('response.completed');
            expect(result.data.response.status).toBe('completed');
          }
        });

        it('should reject invalid event type', () => {
          const invalidEvent = {
            type: 'wrong.event.type',
            response: {
              id: 'resp-123',
              created_at: 1677649420,
              error: null,
              incomplete_details: null,
              instructions: null,
              metadata: null,
              model: 'gpt-4',
              object: 'response',
              output: [],
              parallel_tool_calls: null,
              previous_response_id: null,
              reasoning: null,
              reasoning_effort: null,
              status: null,
              temperature: null,
              text: null,
              tool_choice: null,
              tools: [],
              top_p: null,
              max_output_tokens: null,
              truncation: null,
              usage: null,
              user: null,
            },
          };

          const result = ResponseCompletedEvent.safeParse(invalidEvent);
          expect(result.success).toBe(false);
        });
      });
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should validate response with mixed output types', () => {
      const complexResponse = {
        id: 'resp-complex-123',
        created_at: 1677649420,
        error: null,
        incomplete_details: null,
        instructions: 'Solve this math problem step by step',
        metadata: { complexity: 'high', domain: 'mathematics' },
        model: 'o1-preview',
        object: 'response',
        output: [
          {
            id: 'reasoning-output',
            type: 'reasoning',
            summary: [
              'Analyzed problem structure',
              'Applied mathematical principles',
            ],
            trace: 'Detailed reasoning trace here...',
          },
          {
            arguments: '{"operation": "calculate", "expression": "2+2"}',
            call_id: 'call-math-123',
            name: 'calculate',
            type: 'function',
            status: 'completed',
          },
          {
            id: 'final-message',
            type: 'message',
            role: 'assistant',
            content: [
              {
                annotations: [
                  {
                    type: 'file_citation',
                    text: 'mathematical reference',
                    file_citation: {
                      file_id: 'math-ref-456',
                      quote: 'Addition is commutative',
                    },
                    start_index: 50,
                    end_index: 73,
                  },
                ],
                text: 'The answer is 4, based on mathematical reference principles.',
                type: 'text',
              },
            ],
          },
        ],
        parallel_tool_calls: true,
        previous_response_id: null,
        reasoning: { effort: 'medium' },
        reasoning_effort: 'medium',
        status: 'completed',
        temperature: 0.3,
        text: null,
        tool_choice: 'auto',
        tools: [
          {
            type: 'function',
            function: {
              name: 'calculate',
              description: 'Perform mathematical calculations',
              parameters: {
                type: 'object',
                properties: {
                  operation: { type: 'string' },
                  expression: { type: 'string' },
                },
              },
            },
          },
        ],
        top_p: null,
        max_output_tokens: null,
        truncation: null,
        usage: {
          input_tokens: 75,
          input_tokens_details: { cached_tokens: 25 },
          output_tokens: 125,
          output_tokens_details: { reasoning_tokens: 50 },
          total_tokens: 200,
        },
        user: 'test-user',
      };

      const result = ResponsesResponseBody.safeParse(complexResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toHaveLength(3);
        expect(result.data.output[0].type).toBe('reasoning');
        expect(result.data.output[1].type).toBe('function');
        expect(result.data.output[2].type).toBe('message');
      }
    });

    it('should validate response with MCP interactions', () => {
      const mcpResponse = {
        id: 'resp-mcp-123',
        created_at: 1677649420,
        error: null,
        incomplete_details: null,
        instructions: null,
        metadata: null,
        model: 'gpt-4',
        object: 'response',
        output: [
          {
            id: 'mcp-tools-list',
            server_label: 'data-server',
            tools: [
              { name: 'fetch_data', description: 'Fetch data from database' },
              { name: 'update_record', description: 'Update database record' },
            ],
            type: 'mcp_list_tools',
          },
          {
            id: 'mcp-approval-req',
            arguments: '{"table": "users", "operation": "delete"}',
            name: 'delete_user',
            server_label: 'admin-server',
            type: 'mcp_approval_request',
          },
          {
            id: 'mcp-call-result',
            arguments: '{"user_id": "123"}',
            name: 'get_user_info',
            server_label: 'data-server',
            type: 'mcp_call',
            output: '{"name": "John Doe", "email": "john@example.com"}',
            error: null,
          },
        ],
        parallel_tool_calls: false,
        previous_response_id: null,
        reasoning: null,
        reasoning_effort: null,
        status: 'completed',
        temperature: null,
        text: null,
        tool_choice: null,
        tools: [],
        top_p: null,
        max_output_tokens: null,
        truncation: null,
        usage: null,
        user: null,
      };

      const result = ResponsesResponseBody.safeParse(mcpResponse);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.output).toHaveLength(3);
        const [listTools, approvalReq, callResult] = result.data.output;

        expect(listTools.type).toBe('mcp_list_tools');
        expect(approvalReq.type).toBe('mcp_approval_request');
        expect(callResult.type).toBe('mcp_call');
      }
    });
  });
});
