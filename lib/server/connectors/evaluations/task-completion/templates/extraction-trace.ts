import type { TaskCompletionTemplateConfig } from '@server/connectors/evaluations/task-completion/types';

/**
 * Template for extracting task and outcome from trace data
 */
export function getTaskCompletionExtractionTraceTemplate(data: {
  trace: unknown;
}): TaskCompletionTemplateConfig {
  const systemPrompt = `You are an expert at analyzing workflow traces to extract task objectives and factual outcomes.

Your job is to analyze the provided trace and extract:
1. The TASK: What was the user trying to accomplish?
2. The OUTCOME: What actually happened or was produced?

Be precise and factual. Focus on the concrete task and measurable outcome.

Return your response as a JSON object with this exact structure:
{
  "task": "<the task the user was trying to accomplish>",
  "outcome": "<what actually happened or was produced>"
}`;

  const userPrompt = `Analyze this trace and extract the task and outcome:

TRACE:
${JSON.stringify(data.trace, null, 2)}

Extract the TASK and OUTCOME from this trace.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

// Export as default for template loader compatibility
export default getTaskCompletionExtractionTraceTemplate;
