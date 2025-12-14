import type { ArgumentCorrectnessTemplateConfig } from '@server/connectors/evaluations/argument-correctness/types';

/**
 * Template for generating overall verdict on argument correctness
 */
export function getArgumentCorrectnessVerdictTemplate(data: {
  per_tool: Array<{ name: string; correct: boolean; explanation?: string }>;
}): ArgumentCorrectnessTemplateConfig {
  const systemPrompt = `You are an expert evaluator assessing overall argument correctness across tool calls.

Instructions:
- Use the per-tool analysis to compute an overall score as (# of correct tool calls) / (total tool calls).
- Provide a concise reasoning summarizing the main strengths and weaknesses.

Return a JSON object with this exact structure:
{
  "score": <number between 0.0 and 1.0>,
  "reasoning": "<concise explanation>",
  "per_tool": [ { "name": "...", "correct": true|false, "explanation": "..." } ]
}`;

  const userPrompt = `Per-Tool Analysis:
${JSON.stringify(data.per_tool, null, 2)}

Provide an overall score and reasoning. The score may be computed as (# correct tool calls) / (total tool calls).`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

export default getArgumentCorrectnessVerdictTemplate;
