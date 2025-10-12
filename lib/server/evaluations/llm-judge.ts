import { API_URL, BEARER_TOKEN, OPENAI_API_KEY } from '@server/constants';
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
// Import IDKHub OpenAI provider types for better schema handling
import type { ResponseCreateParamsNonStreaming } from '@server/types/model-response';
import { error } from '@shared/console-logging';
import type { ResponsesResponseBody } from '@shared/types/api/routes/responses-api/response';
import { AIProvider } from '@shared/types/constants';
import { CacheMode } from '@shared/types/middleware/cache';

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
 * Generate JSON schema for structured output based on prompt content
 */
function generateStructuredOutputSchema(
  _systemPrompt: string,
): Record<string, unknown> {
  // Default schema for evaluation results
  return {
    type: 'object',
    properties: {
      score: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Evaluation score between 0 and 1',
      },
      reasoning: {
        type: 'string',
        description: 'Detailed reasoning for the evaluation',
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata about the evaluation',
        additionalProperties: false,
      },
    },
    required: ['score', 'reasoning'],
    additionalProperties: false,
  };
}

export function createLLMJudge(config: Partial<LLMJudgeConfig> = {}): LLMJudge {
  const judgeConfig = {
    model: config.model || 'gpt-4o-mini',
    temperature: config.temperature || 0.1,
    max_tokens: config.max_tokens || 1000,
    timeout: config.timeout || 30000,
  };

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
   * Core evaluation method using IDKHub OpenAI provider infrastructure
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

    let lastError: unknown;
    let retryCount = 0;
    for (let i = 0; i < LLM_JUDGE_MAX_RETRIES; i++) {
      try {
        const prompt = generateEvaluationPrompt(input);
        const response_data = await callIDKHubOpenAIResponsesAPI(
          prompt,
          judgeConfig,
          api_key,
        );
        return parseResponseData(response_data, prompt.useStructuredOutput);
      } catch (error) {
        lastError = error;
        if (i < LLM_JUDGE_MAX_RETRIES - 1 && isRetryableLLMJudgeError(error)) {
          const delay = LLM_JUDGE_RETRY_DELAY_BASE * 2 ** i;
          console.warn(
            `LLM Judge evaluation failed (attempt ${i + 1}/${LLM_JUDGE_MAX_RETRIES}). Retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          retryCount++;
        } else {
          break;
        }
      }
    }

    console.error(
      'LLM Judge evaluation failed after multiple retries:',
      lastError,
    );

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
 * Call OpenAI Responses API using IDKHub OpenAI provider infrastructure
 * This leverages the existing provider system for better schema handling, parsing, and logging
 */
async function callIDKHubOpenAIResponsesAPI(
  prompt: {
    systemPrompt: string;
    userPrompt: string;
    useStructuredOutput: boolean;
  },
  config: LLMJudgeConfig,
  api_key: string,
): Promise<ResponsesResponseBody> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    // Generate appropriate schema based on prompt content
    const schema = prompt.useStructuredOutput
      ? generateStructuredOutputSchema(prompt.systemPrompt)
      : {
          type: 'object',
          properties: {
            score: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Evaluation score between 0 and 1',
            },
            reasoning: {
              type: 'string',
              description: 'Detailed reasoning for the evaluation',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata about the evaluation',
              additionalProperties: false,
            },
          },
          required: ['score', 'reasoning'],
          additionalProperties: false,
        };

    // Use IDKHub OpenAI provider's request structure for better type safety and logging
    const requestParams: ResponseCreateParamsNonStreaming = {
      model: config.model,
      input: [
        { role: 'system', content: prompt.systemPrompt },
        { role: 'user', content: prompt.userPrompt },
      ],
      temperature: config.temperature,
      max_output_tokens: config.max_tokens,
      text: {
        format: {
          name: 'evaluation_result',
          type: 'json_schema',
          schema,
          strict: true,
        },
      },
      // Enable logging through IDKHub responses system
      store: true,
      metadata: {
        source: 'llm_judge',
        evaluation_type: prompt.useStructuredOutput ? 'structured' : 'standard',
      },
    };

    const idkConfig = {
      agent_name: 'llm-judge',
      skill_name: 'judge',
      targets: [
        {
          provider: AIProvider.OPENAI,
          model: config.model,
          cache: {
            mode: CacheMode.SIMPLE,
          },
          api_key,
        },
      ],
    };

    // Use the configured API_URL directly
    const response = await fetch(`${API_URL}/v1/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${BEARER_TOKEN}`,
        'x-idk-config': JSON.stringify(idkConfig),
      },
      body: JSON.stringify(requestParams),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response) {
      throw new Error('OpenAI Responses API error: No response received');
    }

    if (!response.ok) {
      const error_text = await response.text();
      throw new Error(
        `OpenAI Responses API error: ${response.status} ${response.statusText} - ${error_text}`,
      );
    }

    const body = await response.text();

    return JSON.parse(body) as ResponsesResponseBody;
  } catch (e) {
    error('Error in OpenAI Responses API:', e);
    clearTimeout(timeoutId);
    throw e;
  }
}

/**
 * Parse OpenAI Response data to LLMJudgeResult using proper Responses API types
 */
function parseResponseData(
  response_data: ResponsesResponseBody,
  useStructuredOutput = false,
): LLMJudgeResult {
  const output = response_data.output?.[0];
  if (!output || output.type !== 'message' || !('content' in output)) {
    throw new Error('No valid message output in LLM evaluation response');
  }

  const textContent = output.content?.[0];
  if (!textContent || textContent.type !== 'output_text') {
    throw new Error('No valid text content in LLM evaluation response');
  }

  const parsed = JSON.parse(textContent.text);

  // For structured output (like task/outcome extraction), return as metadata
  if (useStructuredOutput) {
    return {
      score: 1.0, // Default score for successful extraction
      reasoning: 'Structured data extracted successfully',
      metadata: parsed,
    };
  }

  // For regular evaluation, use the standard schema
  return LLMJudgeResult.parse(parsed);
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
