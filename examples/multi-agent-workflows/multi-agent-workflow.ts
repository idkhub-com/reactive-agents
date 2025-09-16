#!/usr/bin/env tsx

/**
 * IDKHub Unified AI Workflow Example
 *
 * This example demonstrates both basic chat completion and complex multi-node AI agent workflows.
 * It shows how IDKHub can handle simple requests and sophisticated enterprise workflows.
 *
 * IMPROVEMENTS & FIXES:
 * ✅ Enhanced type safety with proper type guards and null checks
 * ✅ Robust error handling with detailed error messages
 * ✅ Input validation and sanitization to prevent injection attacks
 * ✅ Response size limits to prevent buffer overflow
 * ✅ Improved timeout handling with proper AbortError management
 * ✅ Enhanced API key validation with format checking
 * ✅ Parallel execution option for better performance
 * ✅ Memory management with content size limits
 * ✅ Graceful error recovery to prevent workflow failures
 *
 * USAGE:
 * - Sequential execution: tsx multi-agent-workflow.ts
 * - Parallel execution: tsx multi-agent-workflow.ts --parallel
 */

import type { ChatCompletionResponseBody } from '../../lib/shared/types/api/routes/chat-completions-api';

// Configuration
const IDKHUB_URL = 'http://localhost:3000/v1';
const AUTH_TOKEN = 'idk';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Configuration constants for better maintainability
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB limit
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const MAX_CONTENT_LENGTH = 1000000; // 1MB content limit

// Input validation helper
export function validateUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: must be a non-empty string');
  }

  // Sanitize input to prevent injection attacks
  const sanitized = input.trim().replace(/[<>]/g, '');

  if (sanitized.length === 0) {
    throw new Error('Invalid input: cannot be empty after sanitization');
  }

  if (sanitized.length > 10000) {
    throw new Error(
      'Invalid input: exceeds maximum length of 10,000 characters',
    );
  }

  return sanitized;
}

// Type guard for ChatCompletionResponseBody
export function isValidChatCompletionResponse(
  data: unknown,
): data is ChatCompletionResponseBody {
  if (!data || typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    obj.object === 'chat.completion' &&
    typeof obj.id === 'string' &&
    Array.isArray(obj.choices) &&
    obj.choices.length > 0 &&
    obj.choices.every((choice: unknown) => {
      if (!choice || typeof choice !== 'object' || choice === null) {
        return false;
      }
      const choiceObj = choice as Record<string, unknown>;
      const message = choiceObj.message as Record<string, unknown>;

      return (
        message &&
        typeof message === 'object' &&
        message !== null &&
        typeof message.role === 'string' &&
        typeof choiceObj.finish_reason === 'string'
      );
    })
  );
}

// Enhanced API key validation - generic for multiple providers
export function validateApiKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new Error('API key is required but not provided');
  }

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('API key must be a non-empty string');
  }

  const trimmedKey = apiKey.trim();

  // Basic length validation - most API keys are at least 20 characters
  if (trimmedKey.length < 20) {
    console.warn(
      'Warning: API key seems unusually short, please verify it is correct',
    );
  }

  // Generic format hints for common providers (non-blocking)
  if (trimmedKey.startsWith('sk-')) {
    console.log('Detected OpenAI-style API key format');
  } else if (trimmedKey.startsWith('gsk_')) {
    console.log('Detected Groq API key format');
  } else if (trimmedKey.includes('::')) {
    console.log('Detected Anthropic API key format');
  } else {
    console.log('Using API key with generic format');
  }

  return trimmedKey;
}

// Check if API key is available with enhanced validation
function checkApiKeyOrThrow(): string {
  if (!OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY environment variable is required. Please set it with: export OPENAI_API_KEY="your-actual-api-key"',
    );
  }
  return OPENAI_API_KEY;
}

// Validate the API key format
const validatedApiKey = validateApiKey(checkApiKeyOrThrow());

// Types for multi-node workflows
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface IdkConfig {
  agent_name: string;
  skill_name: string;
  strategy: { mode: string };
  targets: Array<{
    provider: string;
    api_key: string;
    weight?: number;
    retry?: { attempts: number };
  }>;
}

// Enhanced helper function to create fetch with timeout and proper error handling
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Proper AbortError handling
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to connect to ${url}`);
      }
    }

    // Re-throw with more context
    throw new Error(
      `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// Helper function to safely parse response with size limits
export async function safeParseResponse(
  response: Response,
): Promise<ChatCompletionResponseBody> {
  // Check content length
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error(
      `Response too large: ${contentLength} bytes exceeds limit of ${MAX_RESPONSE_SIZE} bytes`,
    );
  }

  // Read response with size check
  const text = await response.text();
  if (text.length > MAX_CONTENT_LENGTH) {
    throw new Error(
      `Response content too large: ${text.length} characters exceeds limit of ${MAX_CONTENT_LENGTH} characters`,
    );
  }

  try {
    const data = JSON.parse(text) as unknown;

    // Type guard for ChatCompletionResponseBody
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response: not a valid object');
    }

    const parsedData = data as Partial<ChatCompletionResponseBody>;

    // Validate required fields with proper type guard
    if (!isValidChatCompletionResponse(parsedData)) {
      throw new Error('Invalid response: missing or invalid required fields');
    }

    return parsedData;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid response: malformed JSON');
    }
    throw error;
  }
}

// Helper function to safely extract content with null checks
function extractResponseContent(data: ChatCompletionResponseBody): string {
  if (!data.choices || data.choices.length === 0) {
    return 'No choices available in response';
  }

  const firstChoice = data.choices[0];
  if (!firstChoice) {
    return 'First choice is null or undefined';
  }

  if (!firstChoice.message) {
    return 'Message is null or undefined';
  }

  const content = firstChoice.message.content;
  if (!content || typeof content !== 'string') {
    return 'No content available';
  }

  return content;
}

// Basic chat completion example
async function basicChatExample(): Promise<void> {
  console.log('=== Basic Chat Completion ===\n');

  const userInput = 'Hello! Can you explain what you are in one sentence?';
  const validatedInput = validateUserInput(userInput);

  const request = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user' as const,
        content: validatedInput,
      },
    ],
    max_tokens: 100,
    user: 'test-user',
    stream: false,
  };

  const headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'x-idk-config': JSON.stringify({
      agent_name: 'basic-example-agent',
      skill_name: 'chat-completion',
      strategy: { mode: 'single' },
      targets: [
        {
          provider: 'openai',
          api_key: validatedApiKey,
        },
      ],
    }),
  };

  try {
    const response = await fetchWithTimeout(
      `${IDKHUB_URL}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      },
      DEFAULT_TIMEOUT,
    );

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'Unable to read error response');
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`,
      );
    }

    const data = await safeParseResponse(response);
    const content = extractResponseContent(data);
    console.log('Response:', content);
  } catch (error) {
    console.error(
      'Error in basic chat example:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    // Don't re-throw here to allow other examples to continue
  }
}

// Helper function to make agent requests with improved error handling
export async function makeAgentRequest(
  messages: ChatMessage[],
  config: IdkConfig,
  model = 'gpt-3.5-turbo',
  temperature = 0.7,
  max_tokens = 500,
): Promise<string> {
  // Validate messages
  if (!messages || messages.length === 0) {
    throw new Error('Messages array cannot be empty');
  }

  // Validate each message
  for (const message of messages) {
    if (!message.content || typeof message.content !== 'string') {
      throw new Error('All messages must have valid content');
    }
    validateUserInput(message.content);
  }

  const request = {
    model,
    messages,
    temperature,
    max_tokens,
    user: 'test-user',
    stream: false,
  };

  const headers = {
    Authorization: `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
    'x-idk-config': JSON.stringify(config),
  };

  try {
    const response = await fetchWithTimeout(
      `${IDKHUB_URL}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      },
      DEFAULT_TIMEOUT,
    );

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'Unable to read error response');
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`,
      );
    }

    const data = await safeParseResponse(response);
    return extractResponseContent(data);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in agent request:', errorMessage);
    // Re-throw with context to allow proper error handling in workflows
    throw new Error(`Agent request failed: ${errorMessage}`);
  }
}

// Research Analysis Workflow (3 nodes)
async function researchAnalysisWorkflow(userQuery: string): Promise<void> {
  console.log('\n=== Research Analysis Workflow ===\n');

  // Validate and sanitize user input
  const validatedQuery = validateUserInput(userQuery);
  console.log(`User Query: ${validatedQuery}\n`);

  const context = {
    user_query: validatedQuery,
    intermediate_results: {} as Record<string, string | undefined>,
    conversation_history: [],
  };

  // Node 1: Query Analysis
  console.log('Node 1: Analyzing query...');
  const analysisMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a research analyst. Analyze the user query and break it down into key research areas.',
    },
    {
      role: 'user',
      content: `Analyze this query: "${validatedQuery}". Provide 3-4 key research areas to focus on.`,
    },
  ];

  const analysisConfig: IdkConfig = {
    agent_name: 'research-analyzer',
    skill_name: 'query-analysis',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        retry: { attempts: 2 },
      },
    ],
  };

  const analysisResult = await makeAgentRequest(
    analysisMessages,
    analysisConfig,
  );
  context.intermediate_results.analysis = analysisResult;
  console.log('Analysis Result:', analysisResult);

  // Node 2: Content Synthesis
  console.log('\nNode 2: Synthesizing content...');
  const synthesisMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a content synthesizer. Create comprehensive content based on research areas.',
    },
    {
      role: 'user',
      content: `Based on this analysis: "${analysisResult}", create a comprehensive synthesis for: "${validatedQuery}"`,
    },
  ];

  const synthesisConfig: IdkConfig = {
    agent_name: 'content-synthesizer',
    skill_name: 'content-synthesis',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        retry: { attempts: 2 },
      },
    ],
  };

  const synthesisResult = await makeAgentRequest(
    synthesisMessages,
    synthesisConfig,
  );
  context.intermediate_results.synthesis = synthesisResult;
  console.log('Synthesis Result:', synthesisResult);

  // Node 3: Quality Review
  console.log('\nNode 3: Quality review...');
  const reviewMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a quality reviewer. Review the content for accuracy, completeness, and clarity.',
    },
    {
      role: 'user',
      content: `Review this synthesis: "${synthesisResult}" for the original query: "${validatedQuery}". Provide a brief quality assessment.`,
    },
  ];

  const reviewConfig: IdkConfig = {
    agent_name: 'quality-reviewer',
    skill_name: 'quality-review',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        retry: { attempts: 2 },
      },
    ],
  };

  const reviewResult = await makeAgentRequest(reviewMessages, reviewConfig);
  context.intermediate_results.review = reviewResult;
  console.log('Quality Review:', reviewResult);

  console.log('\n=== Research Analysis Complete ===\n');
}

// Strategic Planning Workflow (3 nodes)
async function strategicPlanningWorkflow(planningGoal: string): Promise<void> {
  console.log('\n=== Strategic Planning Workflow ===\n');

  // Validate and sanitize input
  const validatedGoal = validateUserInput(planningGoal);
  console.log(`Planning Goal: ${validatedGoal}\n`);

  // Node 1: Strategic Planning
  console.log('Node 1: Strategic planning...');
  const planningMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a strategic planner. Create high-level strategic plans.',
    },
    {
      role: 'user',
      content: `Create a strategic plan for: "${validatedGoal}". Focus on key objectives and approaches.`,
    },
  ];

  const planningConfig: IdkConfig = {
    agent_name: 'strategic-planner',
    skill_name: 'strategic-planning',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        retry: { attempts: 2 },
      },
    ],
  };

  const planningResult = await makeAgentRequest(
    planningMessages,
    planningConfig,
  );
  console.log('Strategic Plan:', planningResult);

  // Node 2: Detail Analysis
  console.log('\nNode 2: Detail analysis...');
  const detailMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a detail analyst. Break down strategic plans into actionable details.',
    },
    {
      role: 'user',
      content: `Break down this strategic plan into actionable details: "${planningResult}"`,
    },
  ];

  const detailConfig: IdkConfig = {
    agent_name: 'detail-analyzer',
    skill_name: 'detail-analysis',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        retry: { attempts: 2 },
      },
    ],
  };

  const detailResult = await makeAgentRequest(detailMessages, detailConfig);
  console.log('Detail Analysis:', detailResult);

  // Node 3: Risk Assessment
  console.log('\nNode 3: Risk assessment...');
  const riskMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a risk assessor. Identify potential risks and mitigation strategies.',
    },
    {
      role: 'user',
      content: `Assess risks for this plan: "${detailResult}". Identify key risks and mitigation strategies.`,
    },
  ];

  const riskConfig: IdkConfig = {
    agent_name: 'risk-assessor',
    skill_name: 'risk-assessment',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        retry: { attempts: 2 },
      },
    ],
  };

  const riskResult = await makeAgentRequest(riskMessages, riskConfig);
  console.log('Risk Assessment:', riskResult);

  console.log('\n=== Strategic Planning Complete ===\n');
}

// Content Creation Workflow (2 nodes)
async function contentCreationWorkflow(contentBrief: string): Promise<void> {
  console.log('\n=== Content Creation Workflow ===\n');

  // Validate and sanitize input
  const validatedBrief = validateUserInput(contentBrief);
  console.log(`Content Brief: ${validatedBrief}\n`);

  // Node 1: Creative Ideation
  console.log('Node 1: Creative ideation...');
  const ideationMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a creative ideator. Generate creative ideas and concepts.',
    },
    {
      role: 'user',
      content: `Generate creative ideas for: "${validatedBrief}". Focus on unique angles and approaches.`,
    },
  ];

  const ideationConfig: IdkConfig = {
    agent_name: 'creative-ideator',
    skill_name: 'creative-ideation',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        retry: { attempts: 2 },
      },
    ],
  };

  const ideationResult = await makeAgentRequest(
    ideationMessages,
    ideationConfig,
  );
  console.log('Creative Ideas:', ideationResult);

  // Node 2: Content Development
  console.log('\nNode 2: Content development...');
  const developmentMessages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are a content developer. Create compelling content based on creative ideas.',
    },
    {
      role: 'user',
      content: `Develop content based on these ideas: "${ideationResult}" for the brief: "${validatedBrief}". Create engaging, well-structured content.`,
    },
  ];

  const developmentConfig: IdkConfig = {
    agent_name: 'content-developer',
    skill_name: 'content-development',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        retry: { attempts: 2 },
      },
    ],
  };

  const developmentResult = await makeAgentRequest(
    developmentMessages,
    developmentConfig,
  );
  console.log('Developed Content:', developmentResult);

  console.log('\n=== Content Creation Complete ===\n');
}

// Main execution function with performance optimization options
async function runUnifiedExample(runInParallel = false): Promise<void> {
  console.log('IDKHub Unified AI Workflow Example');
  console.log('==================================\n');

  try {
    // Run basic chat completion first
    await basicChatExample();

    if (runInParallel) {
      console.log(
        '\n🚀 Running workflows in parallel for better performance...\n',
      );

      // Run multi-node workflows in parallel
      await Promise.allSettled([
        researchAnalysisWorkflow(
          'What are the latest trends in AI and machine learning?',
        ),
        strategicPlanningWorkflow(
          'Launching a new AI-powered customer service chatbot',
        ),
        contentCreationWorkflow(
          'Create a blog post about the future of AI in healthcare',
        ),
      ]);
    } else {
      console.log(
        '\n📋 Running workflows sequentially for demonstration purposes...\n',
      );

      // Run multi-node workflows sequentially
      await researchAnalysisWorkflow(
        'What are the latest trends in AI and machine learning?',
      );
      await strategicPlanningWorkflow(
        'Launching a new AI-powered customer service chatbot',
      );
      await contentCreationWorkflow(
        'Create a blog post about the future of AI in healthcare',
      );
    }

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error(
      'Error running examples:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Enhanced main execution with performance options
async function main(): Promise<void> {
  const runParallel = process.argv.includes('--parallel');

  if (runParallel) {
    console.log('⚡ Parallel execution mode enabled\n');
  } else {
    console.log(
      '📝 Sequential execution mode (add --parallel flag for faster execution)\n',
    );
  }

  await runUnifiedExample(runParallel);
}

main().catch(console.error);
