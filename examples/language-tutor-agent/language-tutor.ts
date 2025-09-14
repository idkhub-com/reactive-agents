#!/usr/bin/env tsx

/**
 * IDKHub Language Tutor Agent Example
 *
 * This example demonstrates a language tutor agent that can explain
 * learners' mistakes using IDKHub's unified AI provider system.
 *
 * FEATURES:
 * ✅ Proper IDKHub integration with type safety
 * ✅ Input validation and sanitization
 * ✅ Error handling and retry logic
 * ✅ Evaluation functionality for correctness assessment
 * ✅ Example data loading from JSON
 * ✅ Results saving with timestamps
 *
 * USAGE:
 * - Sequential execution: tsx language-tutor.ts
 * - Parallel execution: tsx language-tutor.ts --parallel
 * - Save results: tsx language-tutor.ts --save
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load environment variables from .env.local file
function loadEnvFile(): void {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach((line) => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.warn('Warning: Could not load .env.local file:', error);
  }
}

loadEnvFile();

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import type { ChatCompletionResponseBody } from '../../lib/shared/types/api/routes/chat-completions-api';
import { allSkills, getLanguageSkill } from './skills';

// Configuration with strict validation
function validateConfiguration(): {
  idkhubUrl: string;
  authToken: string;
  openaiApiKey: string;
} {
  const idkhubUrl = process.env.IDKHUB_URL || 'http://localhost:3000';
  const authToken = process.env.IDKHUB_AUTH_TOKEN || 'idk';
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error(
      'OPENAI_API_KEY environment variable is required. Please set it in your .env.local file or export it.',
    );
  }

  // Production environment validation
  if (process.env.NODE_ENV === 'production') {
    if (idkhubUrl.includes('localhost') || idkhubUrl.includes('127.0.0.1')) {
      throw new Error(
        'Production environment cannot use localhost URLs. Set IDKHUB_URL to a proper production endpoint.',
      );
    }
    if (authToken === 'idk') {
      throw new Error(
        'Production environment cannot use default auth token. Set IDKHUB_AUTH_TOKEN to a secure token.',
      );
    }
    if (idkhubUrl.startsWith('http://') && !idkhubUrl.includes('localhost')) {
      throw new Error(
        'Production environment must use HTTPS URLs for security. Update IDKHUB_URL to use https://',
      );
    }
  }

  // Validate URL format
  try {
    new URL(idkhubUrl);
  } catch {
    throw new Error(
      `Invalid IDKHUB_URL format: ${idkhubUrl}. Must be a valid URL.`,
    );
  }

  return { idkhubUrl, authToken, openaiApiKey };
}

const config = validateConfiguration();
const IDKHUB_URL = config.idkhubUrl;
const AUTH_TOKEN = config.authToken;
const OPENAI_API_KEY = config.openaiApiKey;

// Error handling helper
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

// Enhanced input validation and sanitization helper
export function validateUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: must be a non-empty string');
  }

  // Enhanced sanitization to prevent various injection attacks
  let sanitized = input.trim();

  // Remove potentially dangerous HTML/XML tags and script content
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:(?!image\/[png|jpg|jpeg|gif|svg])/gi, '');

  // Remove HTML tags but preserve content
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove null bytes and control characters (except normal whitespace)
  sanitized = sanitized
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      // Keep printable characters and normal whitespace (space, tab, newline, carriage return)
      return code >= 32 || code === 9 || code === 10 || code === 13;
    })
    .join('');

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  if (sanitized.length === 0) {
    throw new Error('Invalid input: cannot be empty after sanitization');
  }

  if (sanitized.length > 10000) {
    throw new Error(
      'Invalid input: exceeds maximum length of 10,000 characters',
    );
  }

  // Check for suspicious patterns that might indicate injection attempts
  const suspiciousPatterns = [
    /\b(union\s+select|drop\s+table|exec\s*\(|eval\s*\()/i,
    /['"]\s*;\s*--/,
    /\${.*}/,
    /__proto__|constructor\s*\[/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error('Invalid input: contains potentially malicious content');
    }
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

// Enhanced API key validation
export function validateApiKey(apiKey: string | undefined): string {
  if (!apiKey) {
    throw new Error('API key is required but not provided');
  }

  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('API key must be a non-empty string');
  }

  const trimmedKey = apiKey.trim();

  if (trimmedKey.length < 20) {
    console.warn(
      'Warning: API key seems unusually short, please verify it is correct',
    );
  }

  return trimmedKey;
}

// Validate the API key format
const validatedApiKey = validateApiKey(OPENAI_API_KEY);

// Types for multi-language tutor agent
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
  hooks?: unknown[];
  trace_id?: string;
}

interface TutorContext {
  learner_text: string;
  target_language: string;
  language_explanations: Record<string, string>;
  conversation_history: string[];
}

interface EvaluationResult {
  correct: boolean;
  explanation?: string;
}

function tryParseEvaluationJson(raw: string): EvaluationResult {
  const trimmed = raw.trim();
  const withoutFences = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  let candidate = trimmed;
  if (withoutFences.length < trimmed.length) {
    candidate = withoutFences;
  }
  try {
    const parsed = JSON.parse(candidate) as Partial<EvaluationResult>;
    if (typeof parsed.correct !== 'boolean') {
      throw new Error('Missing or invalid "correct" boolean');
    }
    if (
      parsed.correct === false &&
      (typeof parsed.explanation !== 'string' ||
        parsed.explanation.trim() === '')
    ) {
      parsed.explanation =
        'The answer contains mistakes. Provide a specific explanation of errors and how to improve.';
    }
    return { correct: parsed.correct, explanation: parsed.explanation };
  } catch (_error) {
    // Fallback: coerce to a conservative shape
    return {
      correct: false,
      explanation:
        'Failed to parse model JSON output. The model did not return valid JSON as instructed.',
    };
  }
}

// Helper function to safely extract content from response
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

// IDKHub AI provider request function
export async function makeLanguageTutorRequest(
  messages: ChatMessage[],
  config: IdkConfig,
): Promise<string> {
  try {
    // Use the IDKHub API endpoint
    const idkhubUrl = `${IDKHUB_URL}/v1/chat/completions`;

    const response = await fetch(idkhubUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'x-idk-config': JSON.stringify(config),
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
        user: 'language-tutor-user',
      }),
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'Unable to read error response');
      throw new Error(
        `Language tutor request failed! status: ${response.status}, message: ${errorText}`,
      );
    }

    const data = await response.json();
    if (isValidChatCompletionResponse(data)) {
      return extractResponseContent(data as ChatCompletionResponseBody);
    } else {
      throw new Error('Invalid response format from AI provider');
    }
  } catch (error) {
    const message = getErrorMessage(error);
    throw new Error(`Language tutor request failed: ${message}`);
  }
}

// Language Tutor Workflow (Single English Analysis)
export async function multiLanguageTutorWorkflow(
  learnerText: string,
  targetLanguage = 'en',
  _meta?: Record<string, unknown>,
): Promise<void> {
  console.log('\n=== Language Tutor Workflow ===\n');

  // Validate and sanitize input
  const validatedText = validateUserInput(learnerText);
  console.log(`Learner Text: ${validatedText}\n`);
  console.log(`Target Language: ${targetLanguage}\n`);

  const context: TutorContext = {
    learner_text: validatedText,
    target_language: targetLanguage,
    language_explanations: {},
    conversation_history: [],
  };

  // Find the target language skill
  const targetSkill = getLanguageSkill(targetLanguage);

  if (!targetSkill) {
    console.error(`Unsupported language: ${targetLanguage}`);
    console.log(
      'Available languages:',
      allSkills.map((s) => `${s.name} (${s.code})`).join(', '),
    );
    return;
  }

  console.log(`Using ${targetSkill.name} language skill...\n`);

  // English Analysis
  console.log('English Analysis...');
  const englishSkill = allSkills[0]; // English is first in the array
  const englishMessages: ChatMessage[] = [
    {
      role: 'system',
      content: englishSkill.systemPrompt,
    },
    {
      role: 'user',
      content: `Please analyze this learner text and explain any mistakes: "${validatedText}"`,
    },
  ];

  const englishConfig: IdkConfig = {
    agent_name: 'language-tutor',
    skill_name: 'english-language-analysis',
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        weight: 1,
        retry: { attempts: 2 },
      },
    ],
    hooks: [],
    trace_id: `language-tutor-english-${Date.now()}`,
  };

  const englishResult = await makeLanguageTutorRequest(
    englishMessages,
    englishConfig,
  );
  context.language_explanations.english = englishResult;
  console.log('English Analysis Result:', englishResult);

  console.log('\n=== Language Tutor Complete ===\n');
  console.log('Summary of Results:');
  console.log('===================');
  console.log(
    `English Analysis: ${context.language_explanations.english ? '✅' : '❌'}`,
  );
}

export async function evaluateLearnerText(
  learnerText: string,
  targetLanguage = 'en',
  meta?: Record<string, unknown>,
): Promise<EvaluationResult> {
  const validatedText = validateUserInput(learnerText);
  const targetSkill = getLanguageSkill(targetLanguage);

  if (!targetSkill) {
    throw new Error(`Unsupported language: ${targetLanguage}`);
  }

  // Determine the preferred explanation language (defaults to English for accessibility)
  const preferredLanguageInput =
    typeof meta?.preferred_language === 'string'
      ? String(meta.preferred_language)
      : undefined;
  const preferredSkill = preferredLanguageInput
    ? getLanguageSkill(preferredLanguageInput)
    : undefined;
  const explanationLanguageName = preferredSkill?.name ?? 'English';

  const systemPrompt = `You are a strict ${targetSkill.name} language evaluator.
Your task: Determine if the learner's text is fully correct in ${targetSkill.name}.
Always respond in the user's preferred language (${explanationLanguageName}).
Respond with a STRICT JSON object only, no prose, no markdown fences, keys exactly:
{"correct": boolean, "explanation"?: string}
- If correct is true: return only {"correct": true} with no explanation.
- If correct is false: include an "explanation" (in ${explanationLanguageName}) that briefly states why it's incorrect and how to improve.`;

  const userPrompt = `Evaluate this ${targetSkill.name} text for correctness:
Text: "${validatedText}"
${meta ? `Metadata: ${JSON.stringify(meta)}` : ''}
Return ONLY a JSON object with keys: correct, and explanation if correct is false.`;

  const idkConfig: IdkConfig = {
    agent_name: 'language-tutor',
    skill_name: `${targetSkill.code}-evaluation`,
    strategy: { mode: 'single' },
    targets: [
      {
        provider: 'openai',
        api_key: validatedApiKey,
        weight: 1,
        retry: { attempts: 2 },
      },
    ],
    hooks: [],
    trace_id: `language-evaluation-${targetSkill.code}-${Date.now()}`,
  };

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const responseText = await makeLanguageTutorRequest(messages, idkConfig);
    return tryParseEvaluationJson(responseText);
  } catch (_error) {
    // Fallback evaluation
    const fallbackMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
    const fallbackConfig: IdkConfig = {
      agent_name: 'language-tutor',
      skill_name: `${targetSkill.code}-evaluation-fallback`,
      strategy: { mode: 'single' },
      targets: [
        {
          provider: 'openai',
          api_key: validatedApiKey,
          weight: 1,
          retry: { attempts: 2 },
        },
      ],
      hooks: [],
      trace_id: `language-evaluation-fallback-${targetSkill.code}-${Date.now()}`,
    };
    const fallbackResponse = await makeLanguageTutorRequest(
      fallbackMessages,
      fallbackConfig,
    );
    return tryParseEvaluationJson(fallbackResponse);
  }
}

// Type for the example data structure
interface ExampleData {
  id: string;
  correct: boolean;
  target_language: string;
  learner_text: string;
  meta: {
    level: string;
    topic: string;
    grammar_focus: string;
  };
}

interface ProcessedExample {
  text: string;
  language: string;
  description: string;
  correct: boolean;
  meta: ExampleData['meta'];
}

// Example learner texts for demonstration
const exampleLearnerTexts: ProcessedExample[] = (() => {
  try {
    const dataPath = join(__dirname, 'example-user-data.json');
    const fileContent = readFileSync(dataPath, 'utf-8');
    const data: { examples: ExampleData[] } = JSON.parse(fileContent);

    // Convert the examples from the JSON file to the expected format
    return data.examples.map((example: ExampleData) => ({
      text: example.learner_text,
      language: example.target_language,
      description: `${example.meta?.topic || 'general'} - ${example.meta?.grammar_focus || 'grammar'}`,
      correct: example.correct,
      meta: example.meta,
    }));
  } catch (_error) {
    // Fallback to original examples if file reading fails
    return [
      {
        text: 'I goed to the store yesterday and buyed some bread.',
        language: 'en',
        description: 'Common English grammar mistakes (past tense)',
        correct: false,
        meta: {
          level: 'A2',
          topic: 'daily activities',
          grammar_focus: 'irregular past tense',
        },
      },
      {
        text: 'Yo voy al tienda ayer y compro pan.',
        language: 'es',
        description: 'Spanish grammar mistakes (gender agreement, past tense)',
        correct: false,
        meta: {
          level: 'A2',
          topic: 'shopping',
          grammar_focus: 'past tense and gender agreement',
        },
      },
      {
        text: 'म माछा खान्छु र तिमीले पानी पिउँछौं।',
        language: 'ne',
        description: 'Nepali verb conjugation mistakes',
        correct: false,
        meta: {
          level: 'A2',
          topic: 'food & drink',
          grammar_focus: 'verb conjugation and subject agreement',
        },
      },
    ];
  }
})();

// Main execution function
async function runLanguageTutorExamples(runInParallel = false): Promise<void> {
  console.log('IDKHub Multi-Language Tutor Agent Example');
  console.log('==========================================\n');

  try {
    if (runInParallel) {
      console.log(
        '🚀 Running examples in parallel for better performance...\n',
      );

      // Run examples in parallel
      await Promise.allSettled(
        exampleLearnerTexts.map((example) =>
          multiLanguageTutorWorkflow(example.text, example.language),
        ),
      );
    } else {
      console.log(
        '📋 Running examples sequentially for demonstration purposes...\n',
      );

      // Run examples sequentially
      for (const example of exampleLearnerTexts) {
        console.log(`\n--- Example: ${example.description} ---`);
        await multiLanguageTutorWorkflow(example.text, example.language);
      }
    }

    console.log('All language tutor examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', getErrorMessage(error));
  }
}

async function saveResults(): Promise<void> {
  const outputsDir = join(__dirname, 'output');
  if (!existsSync(outputsDir)) {
    mkdirSync(outputsDir, { recursive: true });
  }

  const results: Array<{
    id: string;
    input: { learner_text: string; target_language: string; meta?: unknown };
    output: { correct: boolean; explanation?: string };
  }> = [];

  // Reuse the example texts as inputs to the evaluator
  let counter = 1;
  for (const example of exampleLearnerTexts) {
    const id = `ex-${example.language}-${String(counter).padStart(3, '0')}`;
    const output = await evaluateLearnerText(example.text, example.language);
    const record = {
      id,
      input: {
        learner_text: example.text,
        target_language: example.language,
        meta: example.meta,
      },
      output,
    };
    results.push(record);
    counter += 1;
  }

  // Create timestamped filename to avoid overwriting
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `results-${timestamp}.json`;
  const filePath = join(outputsDir, fileName);

  const payload = {
    generated_at: new Date().toISOString(),
    agent_name: 'language-tutor',
    results,
  };
  writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Saved results to: ${filePath}`);
}

// Main execution function
async function main(): Promise<void> {
  const runParallel = process.argv.includes('--parallel');
  const shouldSave = process.argv.includes('--save');

  if (shouldSave) {
    await saveResults();
    return;
  }

  if (runParallel) {
    console.log('⚡ Parallel execution mode enabled\n');
  } else {
    console.log(
      '📝 Sequential execution mode (add --parallel flag for faster execution)\n',
    );
  }

  await runLanguageTutorExamples(runParallel);
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
