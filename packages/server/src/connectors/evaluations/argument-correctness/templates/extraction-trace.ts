import type { ArgumentCorrectnessTemplateConfig } from '@server/connectors/evaluations/argument-correctness/types';

/**
 * Template for extracting per-tool argument correctness from trace data
 */
export function getArgumentCorrectnessExtractionTraceTemplate(data: {
  trace: unknown;
}): ArgumentCorrectnessTemplateConfig {
  const systemPrompt = `You are an expert at analyzing workflow traces to evaluate the correctness of tool call arguments.

Instructions:
- Review the sequence of steps and tool calls in the trace.
- For each tool call, judge whether its input arguments are appropriate and sufficient for the task.

Return a JSON object with this exact structure:
{
  "per_tool": [
    { "name": "<tool name>", "correct": <true|false>, "explanation": "<brief reason>" }
  ]
}`;

  const userPrompt = `Analyze this trace and evaluate per-tool argument correctness:

TRACE:
${JSON.stringify(data.trace, null, 2)}

For each tool call, decide if the arguments are correct and explain briefly.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

export default getArgumentCorrectnessExtractionTraceTemplate;
