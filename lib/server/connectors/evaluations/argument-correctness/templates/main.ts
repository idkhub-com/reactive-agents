import type {
  ArgumentCorrectnessTemplateConfig,
  ArgumentCorrectnessTemplateData,
} from '@server/connectors/evaluations/types/argument-correctness';

export function getArgumentCorrectnessTemplate(
  data: ArgumentCorrectnessTemplateData,
): ArgumentCorrectnessTemplateConfig {
  const systemPrompt = `You are an expert evaluator for agentic systems. Assess whether the arguments provided to each tool call are correct given the task.

Instructions:
- Analyze the user input, the tools called (name, description, and input), and the agent's output.
- For each tool call, decide if the arguments are correct based on the task.
- Compute an overall score as (# of correct tool calls) / (total number of tool calls).

Return a JSON object with fields:
{
  "score": <number between 0 and 1>,
  "reasoning": "<concise explanation of overall assessment>",
  "metadata": {
    "per_tool": [ { "name": "<tool name>", "correct": <true|false>, "explanation": "<brief why>" } ]
  }
}`;

  const userPrompt = `Evaluate the following:

Input:
${data.input ?? ''}

Agent Output:
${data.actual_output ?? ''}

Tools Called (name, description, input):
${JSON.stringify(data.tools_called ?? [], null, 2)}

Judge whether the arguments for each tool are correct given the input.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  } as const;
}
