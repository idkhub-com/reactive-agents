import type { TaskCompletionTemplateConfig } from '@api/connectors/evaluations/task-completion/types';

/**
 * Template for generating verdict on task completion
 */
export function getTaskCompletionVerdictTemplate(data: {
  task: string;
  outcome: string;
  inProgress?: boolean;
}): TaskCompletionTemplateConfig {
  // An intermediate agentic turn ends by invoking tools; the task continues
  // in later requests. Judged as a finished task it scores near zero no
  // matter how well it is going, so the verdict grades progress instead.
  const inProgressNote = data.inProgress
    ? `

This outcome is an intermediate turn: it ends by invoking tools, and the task is still in progress -- the tool results, and the final result, arrive in later requests. Evaluate whether the work is on track toward the task: correct understanding, appropriate actions, nothing off course. Work that is clearly on track deserves a high score even though nothing is delivered yet.`
    : '';

  const systemPrompt = `You are an expert evaluator assessing whether a task was successfully completed.

Your job is to evaluate how well the outcome fulfills the task requirements.${inProgressNote}

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
${data.inProgress ? '\nNote: this turn ended in tool calls, so the task is still in progress. Score how well the work so far serves the task.\n' : ''}
Please evaluate how well the outcome fulfills the task requirements and provide a score between 0.0 and 1.0.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

// Export as default for template loader compatibility
export default getTaskCompletionVerdictTemplate;
