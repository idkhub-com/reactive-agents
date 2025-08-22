import { z } from 'zod';
import type {
  ArticleSummary,
  MathReasoning,
  ResponseTextConfig,
  StructuredOutputWithRefusal,
  StructuredReasoningOutput,
} from './response';

/**
 * Utility functions for working with OpenAI Structured Outputs
 * Based on OpenAI's official documentation and best practices
 */

/**
 * Creates a JSON schema format configuration for structured outputs
 * @param name - The name of the response format (must be a-z, A-Z, 0-9, underscores, dashes, max 64 chars)
 * @param schema - The JSON schema object
 * @param description - Optional description for the model
 * @param strict - Whether to enable strict mode (default: true)
 */
export function createJsonSchemaFormat(
  name: string,
  schema: Record<string, unknown>,
  description?: string,
  strict = true,
): {
  type: 'json_schema';
  json_schema: {
    name: string;
    schema: Record<string, unknown>;
    strict: boolean;
    description?: string;
  };
} {
  return {
    type: 'json_schema',
    json_schema: {
      name,
      schema,
      strict,
      ...(description && { description }),
    },
  };
}

/**
 * Creates a ResponseTextConfig for structured JSON outputs
 * @param name - The name of the response format
 * @param schema - The JSON schema object
 * @param description - Optional description
 * @param strict - Whether to enable strict mode (default: true)
 */
export function createStructuredTextConfig(
  name: string,
  schema: Record<string, unknown>,
  description?: string,
  strict = true,
): ResponseTextConfig {
  return {
    format: {
      name,
      schema,
      type: 'json_schema',
      strict,
      ...(description && { description }),
    },
  };
}

/**
 * Validates if a response contains a refusal and handles it appropriately
 * @param response - The structured output response
 * @returns Object indicating if refusal was found and the message
 */
export function checkForRefusal(response: StructuredOutputWithRefusal): {
  hasRefusal: boolean;
  refusalMessage?: string;
  content?: unknown[];
} {
  if (response.refusal) {
    return {
      hasRefusal: true,
      refusalMessage: response.refusal,
    };
  }

  return {
    hasRefusal: false,
    content: response.content,
  };
}

/**
 * Common JSON schemas for typical structured output use cases
 */
export const CommonSchemas = {
  /**
   * Math tutoring schema that provides step-by-step solutions
   */
  mathReasoning: {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            explanation: { type: 'string' },
            output: { type: 'string' },
          },
          required: ['explanation', 'output'],
          additionalProperties: false,
        },
      },
      final_answer: { type: 'string' },
    },
    required: ['steps', 'final_answer'],
    additionalProperties: false,
  } as const,

  /**
   * Article summarization schema for content extraction
   */
  articleSummary: {
    type: 'object',
    properties: {
      invented_year: { type: 'number' },
      summary: { type: 'string' },
      inventors: {
        type: 'array',
        items: { type: 'string' },
      },
      description: { type: 'string' },
      concepts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
          },
          required: ['title', 'description'],
          additionalProperties: false,
        },
      },
    },
    required: [
      'invented_year',
      'summary',
      'inventors',
      'description',
      'concepts',
    ],
    additionalProperties: false,
  } as const,

  /**
   * Entity extraction schema for user input processing
   */
  entityExtraction: {
    type: 'object',
    properties: {
      entities: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            type: {
              type: 'string',
              enum: [
                'person',
                'organization',
                'location',
                'date',
                'product',
                'other',
              ],
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
          },
          required: ['text', 'type'],
          additionalProperties: false,
        },
      },
      summary: { type: 'string' },
    },
    required: ['entities', 'summary'],
    additionalProperties: false,
  } as const,

  /**
   * Calendar event extraction schema
   */
  calendarEvent: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      date: { type: 'string' },
      time: { type: 'string' },
      location: { type: 'string' },
      participants: {
        type: 'array',
        items: { type: 'string' },
      },
      description: { type: 'string' },
    },
    required: ['name', 'date', 'participants'],
    additionalProperties: false,
  } as const,
};

/**
 * Helper function to create a structured output request format
 * @param schemaKey - Key from CommonSchemas
 * @param name - Name for the response format
 * @param description - Optional description
 */
export function createCommonSchemaFormat(
  schemaKey: keyof typeof CommonSchemas,
  name: string,
  description?: string,
): {
  type: 'json_schema';
  json_schema: {
    name: string;
    schema: Record<string, unknown>;
    strict: boolean;
    description?: string;
  };
} {
  return createJsonSchemaFormat(name, CommonSchemas[schemaKey], description);
}

/**
 * Validates that a schema follows OpenAI's structured output requirements
 * @param schema - The JSON schema to validate
 * @returns Validation result with errors if any
 */
export function validateStructuredOutputSchema(
  schema: Record<string, unknown>,
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if schema has required additionalProperties: false for objects
  function checkAdditionalProperties(obj: unknown, path = 'root'): void {
    if (obj && typeof obj === 'object' && obj !== null) {
      const typedObj = obj as Record<string, unknown>;
      if (
        typedObj.type === 'object' &&
        typedObj.additionalProperties !== false
      ) {
        errors.push(
          `Object at ${path} must have "additionalProperties": false`,
        );
      }

      if (typedObj.properties && typeof typedObj.properties === 'object') {
        Object.entries(typedObj.properties).forEach(([key, value]) => {
          checkAdditionalProperties(value, `${path}.properties.${key}`);
        });
      }

      if (typedObj.items) {
        checkAdditionalProperties(typedObj.items, `${path}.items`);
      }

      if (Array.isArray(typedObj.anyOf)) {
        typedObj.anyOf.forEach((item: unknown, index: number) => {
          checkAdditionalProperties(item, `${path}.anyOf[${index}]`);
        });
      }
    }
  }

  checkAdditionalProperties(schema);

  // Check nesting depth (max 5 levels)
  function checkNestingDepth(obj: unknown, depth = 0): void {
    if (depth > 5) {
      errors.push('Schema exceeds maximum nesting depth of 5 levels');
      return;
    }

    if (obj && typeof obj === 'object' && obj !== null) {
      const typedObj = obj as Record<string, unknown>;
      if (typedObj.properties && typeof typedObj.properties === 'object') {
        Object.values(typedObj.properties).forEach((prop: unknown) => {
          checkNestingDepth(prop, depth + 1);
        });
      }

      if (typedObj.items) {
        checkNestingDepth(typedObj.items, depth + 1);
      }
    }
  }

  checkNestingDepth(schema);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Type guards for checking structured output response types
 */
export const StructuredOutputTypeGuards = {
  isMathReasoning: (data: unknown): data is z.infer<typeof MathReasoning> => {
    try {
      const mathReasoningSchema = z.object({
        steps: z.array(
          z.object({
            explanation: z.string(),
            output: z.string(),
          }),
        ),
        final_answer: z.string(),
      });
      mathReasoningSchema.parse(data);
      return true;
    } catch {
      return false;
    }
  },

  isArticleSummary: (data: unknown): data is z.infer<typeof ArticleSummary> => {
    try {
      const articleSummarySchema = z.object({
        invented_year: z.number(),
        summary: z.string(),
        inventors: z.array(z.string()),
        description: z.string(),
        concepts: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
          }),
        ),
      });
      articleSummarySchema.parse(data);
      return true;
    } catch {
      return false;
    }
  },

  isReasoningOutput: (data: unknown): data is StructuredReasoningOutput => {
    return (
      data !== null &&
      typeof data === 'object' &&
      'type' in data &&
      (data as Record<string, unknown>).type === 'reasoning' &&
      'summary' in data &&
      typeof (data as Record<string, unknown>).summary === 'string'
    );
  },

  hasRefusal: (response: unknown): response is { refusal: string } => {
    return (
      response !== null &&
      typeof response === 'object' &&
      'refusal' in response &&
      typeof (response as Record<string, unknown>).refusal === 'string'
    );
  },
};

/**
 * Best practices and examples for structured outputs
 */
export const StructuredOutputBestPractices = {
  /**
   * Example of a well-formed structured output request
   */
  exampleRequest: {
    model: 'gpt-4o-2024-08-06',
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful math tutor. Provide step-by-step solutions.',
      },
      {
        role: 'user',
        content: 'How can I solve 8x + 7 = -23?',
      },
    ],
    response_format: createJsonSchemaFormat(
      'math_reasoning',
      CommonSchemas.mathReasoning,
      'Step-by-step math problem solution',
    ),
  },

  /**
   * Tips for effective structured outputs
   */
  tips: [
    'Always set additionalProperties: false for all object types',
    'Keep nesting depth to 5 levels or less',
    'Use descriptive field names and include descriptions in schema',
    'Handle refusals gracefully in your application',
    'Use strict: true for consistent schema adherence',
    'Test with edge cases and malformed inputs',
    'Consider streaming for large responses',
    'Reuse schemas to minimize first-request latency',
  ],

  /**
   * Common pitfalls to avoid
   */
  pitfalls: [
    'Not setting additionalProperties: false',
    'Using unsupported JSON Schema keywords (minLength, maxLength, pattern)',
    'Exceeding nesting depth limits',
    'Not handling refusal responses',
    'Making all fields optional when strict adherence is needed',
    'Not validating schema before sending to API',
  ],
} as const;
