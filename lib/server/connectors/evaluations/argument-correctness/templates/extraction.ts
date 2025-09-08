import type { ArgumentCorrectnessTemplateConfig } from '@server/connectors/evaluations/argument-correctness/types';

/**
 * Template for extracting per-tool argument correctness from input, tools, and output
 */
export function getArgumentCorrectnessExtractionTemplate(data: {
  input: string;
  tools_called: unknown[];
  actual_output: string;
}): ArgumentCorrectnessTemplateConfig {
  const systemPrompt = `You are an expert at analyzing AI agent tool usage to determine argument correctness for each tool call.

Instructions:
- Consider the task implied by the input and the agent's output.
- For each tool call, judge whether its input arguments are appropriate and sufficient for the task at that point in time.

Return a JSON object with this exact structure:
{
  "per_tool": [
    { "name": "<tool name>", "correct": <true|false>, "explanation": "<brief reason>" }
  ]
}`;

  const userPrompt = `Analyze this interaction and evaluate per-tool argument correctness:

INPUT:
${data.input}

TOOLS CALLED:
${JSON.stringify(data.tools_called, null, 2)}

AGENT OUTPUT:
${data.actual_output}

For each tool call, decide if the arguments are correct and explain briefly.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

export default getArgumentCorrectnessExtractionTemplate;
