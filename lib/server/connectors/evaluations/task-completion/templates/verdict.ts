import type { TaskCompletionTemplateConfig } from '../../types/task-completion';

/**
 * Template for generating verdict on task completion
 */
export function getTaskCompletionVerdictTemplate(data: {
  task: string;
  outcome: string;
}): TaskCompletionTemplateConfig {
  const systemPrompt = `You are an expert evaluator assessing whether a task was successfully completed.

Your job is to evaluate how well the outcome fulfills the task requirements.

Evaluate based on:
1. Task Understanding: Was the task properly understood?
2. Outcome Achievement: Does the outcome fulfill the task requirements?
3. Quality: How well was the task executed?

Return your response as a JSON object with this exact structure:
{
  "score": <number between 0.0 and 1.0>,
  "reasoning": "<detailed explanation of your evaluation>"
}`;

  const userPrompt = `Task: ${data.task}

Outcome: ${data.outcome}

Please evaluate how well the outcome fulfills the task requirements and provide a score between 0.0 and 1.0.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

// Export as default for template loader compatibility
export default getTaskCompletionVerdictTemplate;
