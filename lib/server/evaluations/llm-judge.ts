import { BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';
import {
  evaluationCriteria,
  scoringGuidelinesText,
} from '@server/evaluations/generic-judge-defaults';
import {
  type EvaluationInput,
  type LLMJudge,
  type LLMJudgeConfig,
  LLMJudgeResult,
} from '@server/types/evaluations/llm-judge';
import { AIProvider } from '@shared/types/constants';
import { CacheMode } from '@shared/types/middleware/cache';
import OpenAI from 'openai';
import { z } from 'zod';

// Constants for retry logic
const LLM_JUDGE_MAX_RETRIES = 3;
const LLM_JUDGE_RETRY_DELAY_BASE = 1000; // 1 second base delay

/**
 * Check if an error is retryable for LLM judge requests
 */
function isRetryableLLMJudgeError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('temporary') ||
      message.includes('server error') ||
      message.includes('gateway') ||
      message.includes('service unavailable')
    );
  }
  return false;
}

/**
 * Check if input text appears to be a pre-formatted template prompt
 */
function isTemplateBasedInput(text: string): boolean {
  // Generic template detection criteria:
  const templateIndicators = [
    text.includes('You are an expert evaluator'),
    text.includes('You are a quality evaluator'),
    text.includes('Provide your evaluation as a JSON object'),
    text.includes('Return your response as a JSON object'),
    text.includes('You are') &&
      text.includes('evaluate') &&
      text.includes('\n\n'),
  ];

  // Must have at least one strong indicator AND contain double newlines (separator)
  return (
    templateIndicators.some((indicator) => indicator) && text.includes('\n\n')
  );
}

/**
 * Parse a template-based prompt into system and user components
 */
function parseTemplatePrompt(text: string): {
  systemPrompt: string;
  userPrompt: string;
} {
  // Split on first occurrence of double newline
  const doubleLnIndex = text.indexOf('\n\n');
  if (doubleLnIndex === -1) {
    return { systemPrompt: '', userPrompt: text };
  }

  const systemPrompt = text.substring(0, doubleLnIndex).trim();
  const userPrompt = text.substring(doubleLnIndex + 2).trim();

  // Validate that we have meaningful content in both parts
  if (systemPrompt.length < 10 || userPrompt.length < 10) {
    return { systemPrompt: '', userPrompt: text };
  }

  return { systemPrompt, userPrompt };
}

/**
 * Check if the prompt expects structured JSON output
 */
function expectsStructuredOutput(systemPrompt: string): boolean {
  return (
    systemPrompt.includes('JSON object') ||
    systemPrompt.includes('JSON structure') ||
    systemPrompt.includes('Return your response as') ||
    systemPrompt.includes('as a JSON object')
  );
}

/**
 * Zod schema for evaluation results
 */
const EvaluationResultSchema = z.object({
  score: z.number().min(0).max(1).describe('Evaluation score between 0 and 1'),
  reasoning: z.string().describe('Detailed reasoning for the evaluation'),
});

export function createLLMJudge(
  config: Partial<LLMJudgeConfig> = {},
  openaiClient?: OpenAI,
): LLMJudge {
  const judgeConfig = {
    model: config.model || 'gpt-5-mini',
    temperature: config.temperature || 0.1,
    max_tokens: config.max_tokens || 1000,
    timeout: config.timeout || 30000,
  };

  // Create OpenAI client once (or use injected client for testing)
  const client =
    openaiClient ||
    new OpenAI({
      apiKey: BEARER_TOKEN ?? 'reactive-agents',
      baseURL: 'http://localhost:3000/v1',
      dangerouslyAllowBrowser: true, // Safe in server-side Node.js context
    });

  /**
   * Generate evaluation prompt for text evaluation
   */
  function generateEvaluationPrompt(input: EvaluationInput): {
    systemPrompt: string;
    userPrompt: string;
    useStructuredOutput: boolean;
  } {
    // If outputFormat is explicitly specified (always 'json' now), use structured output
    if (input.outputFormat === 'json') {
      const { systemPrompt, userPrompt } = parseTemplatePrompt(input.text);
      if (systemPrompt && userPrompt) {
        return { systemPrompt, userPrompt, useStructuredOutput: true };
      }
    }

    // Template-based evaluation: More robust detection of pre-formatted prompts
    if (isTemplateBasedInput(input.text)) {
      const { systemPrompt, userPrompt } = parseTemplatePrompt(input.text);
      if (systemPrompt && userPrompt) {
        const useStructuredOutput = expectsStructuredOutput(systemPrompt);
        return { systemPrompt, userPrompt, useStructuredOutput };
      }
    }

    // Criteria-based evaluation (generic judge fallback)
    const criteria =
      input.evaluationCriteria?.criteria || evaluationCriteria.general;

    const systemPrompt = `You are a quality evaluator. Evaluate the given text based on these criteria:

${criteria.map((criterion: string) => `- ${criterion}`).join('\n')}

Scoring Guidelines:
${scoringGuidelinesText}

Provide a score between 0 and 1 where:
- 1.0 means excellent quality, exceeds expectations
- 0.5 means adequate quality, partially meets expectations  
- 0.0 means very poor quality, fails to meet expectations`;

    const userPrompt = `Please evaluate the following text:

${input.text}

Provide a score between 0 and 1 with detailed reasoning for your evaluation.`;

    return { systemPrompt, userPrompt, useStructuredOutput: false };
  }

  /**
   * Core evaluation method using OpenAI library
   */
  async function evaluate(input: EvaluationInput): Promise<LLMJudgeResult> {
    const api_key = OPENAI_API_KEY;

    if (!api_key || api_key === 'demo-key' || api_key.trim() === '') {
      console.warn('⚠️ OpenAI API key not configured for LLM Judge');
      return getFallbackResult('no_api_key', undefined, {
        retryCount: 0,
        maxRetries: LLM_JUDGE_MAX_RETRIES,
      });
    }

    const raConfig = {
      targets: [
        {
          provider: AIProvider.OPENAI,
          model: judgeConfig.model,
          cache: {
            mode: CacheMode.SIMPLE,
          },
          api_key,
        },
      ],
      agent_name: 'reactive-agents',
      skill_name: 'judge',
    };

    let lastError: unknown;
    let retryCount = 0;
    for (let i = 0; i < LLM_JUDGE_MAX_RETRIES; i++) {
      try {
        const prompt = generateEvaluationPrompt(input);
        const response = await client
          .withOptions({
            defaultHeaders: {
              'ra-config': JSON.stringify(raConfig),
            },
          })
          .chat.completions.parse({
            model: judgeConfig.model,
            messages: [
              { role: 'system', content: prompt.systemPrompt },
              { role: 'user', content: prompt.userPrompt },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'evaluation_result',
                strict: true,
                schema: z.toJSONSchema(EvaluationResultSchema),
              },
            },
          });

        const parsed = response.choices[0].message.parsed;
        if (!parsed) {
          throw new Error('No parsed response from OpenAI');
        }

        // For structured output (like task/outcome extraction), return as metadata
        if (prompt.useStructuredOutput) {
          return {
            score: 1.0, // Default score for successful extraction
            reasoning: 'Structured data extracted successfully',
            metadata: parsed,
          };
        }

        // For regular evaluation, validate and return
        return LLMJudgeResult.parse(parsed);
      } catch (error) {
        lastError = error;
        if (i < LLM_JUDGE_MAX_RETRIES - 1 && isRetryableLLMJudgeError(error)) {
          const delay = LLM_JUDGE_RETRY_DELAY_BASE * 2 ** i;
          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
        } else {
          break;
        }
      }
    }

    // Categorize error type for better fallback messaging
    const retryInfo = {
      retryCount,
      maxRetries: LLM_JUDGE_MAX_RETRIES,
    };

    if (lastError instanceof Error) {
      if (
        lastError.message.includes('fetch') ||
        lastError.message.includes('network')
      ) {
        return getFallbackResult('network_error', lastError.message, retryInfo);
      }
      if (
        lastError.message.includes('JSON') ||
        lastError.message.includes('parse') ||
        lastError.message.includes('No valid message output') ||
        lastError.message.includes('No valid text content')
      ) {
        return getFallbackResult('parse_error', lastError.message, retryInfo);
      }
      if (
        lastError.message.includes('timeout') ||
        lastError.message.includes('abort')
      ) {
        return getFallbackResult('timeout_error', lastError.message, retryInfo);
      }
      if (
        lastError.message.includes('unknown') ||
        lastError.message.includes('Unknown')
      ) {
        return getFallbackResult('unknown_error', lastError.message, retryInfo);
      }
      return getFallbackResult('api_error', lastError.message, retryInfo);
    }

    return getFallbackResult('unknown_error', String(lastError), retryInfo);
  }

  return {
    evaluate,
    config: judgeConfig,
  };
}

/**
 * Get fallback result with specific error type and optional details
 */
function getFallbackResult(
  errorType:
    | 'no_api_key'
    | 'network_error'
    | 'parse_error'
    | 'timeout_error'
    | 'api_error'
    | 'unknown_error',
  errorDetails?: string,
  retryInfo?: {
    retryCount: number;
    maxRetries: number;
  },
): LLMJudgeResult {
  const errorMessages = {
    no_api_key: 'Evaluation skipped - OpenAI API key not configured',
    network_error: 'Evaluation failed - network connection error',
    parse_error: 'Evaluation failed - response parsing error',
    timeout_error: 'Evaluation failed - request timeout',
    api_error: 'Evaluation failed - OpenAI API error',
    unknown_error: 'Evaluation failed - unknown error occurred',
  };

  const reasoning =
    retryInfo && retryInfo.retryCount > 0
      ? `${errorMessages[errorType]} (retried ${retryInfo.retryCount}/${retryInfo.maxRetries} times)`
      : errorMessages[errorType];

  return {
    score: 0.5,
    reasoning,
    metadata: {
      fallback: true,
      errorType,
      ...(errorDetails && { errorDetails }),
      ...(retryInfo && retryInfo.retryCount > 0 && { retryInfo }),
    },
  };
}
