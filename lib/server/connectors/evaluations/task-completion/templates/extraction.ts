import type { TaskCompletionTemplateConfig } from '@server/connectors/evaluations/task-completion/types';

/**
 * Template for extracting task and outcome from input, tools, and output
 */
export function getTaskCompletionExtractionTemplate(data: {
  input: string;
  tools_called: unknown[];
  actual_output: string;
}): TaskCompletionTemplateConfig {
  const systemPrompt = `You are an expert at analyzing AI system interactions to extract task objectives and factual outcomes.

Your job is to analyze the provided input, tools used, and output to determine:
1. The TASK: What was the user trying to accomplish?
2. The OUTCOME: What actually happened or was produced?

Be precise and factual. Focus on the concrete task and measurable outcome.

Return your response as a JSON object with this exact structure:
{
  "task": "<the task the user was trying to accomplish>",
  "outcome": "<what actually happened or was produced>"
}`;

  const userPrompt = `Analyze this interaction and extract the task and outcome:

INPUT:
${data.input}

TOOLS CALLED:
${JSON.stringify(data.tools_called, null, 2)}

ACTUAL OUTPUT:
${data.actual_output}

Extract the TASK and OUTCOME from this interaction.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

// Export as default for template loader compatibility
export default getTaskCompletionExtractionTemplate;
