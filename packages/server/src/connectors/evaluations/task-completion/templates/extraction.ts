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

CRITICAL: You MUST return a JSON object with this EXACT structure:
{
  "task": "<the task the user was trying to accomplish>",
  "outcome": "<what actually happened or was produced>"
}

IMPORTANT RULES:
- Do NOT include any other fields (no "reasoning", "metadata", "score", etc.)
- Do NOT put the task/outcome in nested objects
- The "task" field should describe what the user wanted to achieve
- The "outcome" field should describe what was actually produced or accomplished
- Both fields should be concise but complete sentences

EXAMPLES:

Example 1 - Creative Writing:
Input: "Write a poem about the ocean"
Output: "The waves crash against the shore..."
Your response:
{
  "task": "write a poem about the ocean",
  "outcome": "a poem about ocean waves crashing against the shore was created"
}

Example 2 - Information Request:
Input: "What is the capital of France?"
Output: "The capital of France is Paris."
Your response:
{
  "task": "find out the capital of France",
  "outcome": "provided the answer that Paris is the capital of France"
}

Example 3 - Creative Ideas:
Input: "Give me creative blog post ideas about AI"
Output: "Here are 5 creative blog post ideas: 1. The Future of AI in Healthcare..."
Your response:
{
  "task": "generate creative blog post ideas about AI",
  "outcome": "provided 5 creative blog post ideas about AI with detailed descriptions"
}`;

  const userPrompt = `Analyze this interaction and extract the task and outcome:

INPUT:
${data.input}

TOOLS CALLED:
${JSON.stringify(data.tools_called, null, 2)}

ACTUAL OUTPUT:
${data.actual_output}

Extract the TASK and OUTCOME from this interaction.

Remember: Return ONLY a JSON object with "task" and "outcome" fields. No other fields or nested structures.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

// Export as default for template loader compatibility
export default getTaskCompletionExtractionTemplate;
