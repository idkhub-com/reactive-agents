import type {
  TaskCompletionTemplateConfig,
  TaskCompletionTemplateData,
} from '../../types/task-completion';
import { taskCompletionScoringText } from '../../types/task-completion';

/**
 * Main task completion evaluation template
 */
export function getTaskCompletionMainTemplate(
  data: TaskCompletionTemplateData,
): TaskCompletionTemplateConfig {
  const strictModeWarning = data.strict_mode
    ? '\n**IMPORTANT: This evaluation uses STRICT MODE. Only perfect completions (score = 1.0) will pass.**'
    : '';

  const verboseInstruction = data.verbose_mode
    ? '\nPlease provide detailed step-by-step reasoning for your evaluation, including specific examples from the task and output.'
    : '';

  const jsonStructure = data.include_reason
    ? `{
  "criteria": {
    "task_understood": <true|false>,
    "outcome_achieved": <true|false>,
    "completion_quality": <number between 0.0 and 1.0>,
    "tool_usage_appropriate": <true|false|null>
  },
  "score": <number between 0.0 and 1.0>,
  "reasoning": "<detailed explanation of your evaluation>",
  "overall_success": <true|false>
}`
    : `{
  "criteria": {
    "task_understood": <true|false>,
    "outcome_achieved": <true|false>,
    "completion_quality": <number between 0.0 and 1.0>,
    "tool_usage_appropriate": <true|false|null>
  },
  "score": <number between 0.0 and 1.0>,
  "overall_success": <true|false>
}`;

  const systemPrompt = `You are an expert evaluator assessing whether an AI agent successfully completed a given task.${strictModeWarning}

Evaluate the task completion based on the following criteria:
1. Task Understanding: Did the agent understand what was asked?
2. Outcome Achievement: Did the agent produce a result that fulfills the task?
3. Quality: How well was the task executed?
4. Tool Usage: If tools were used, were they appropriate and effective?${verboseInstruction}

Task Completion Scoring Guidelines:
${taskCompletionScoringText}

Provide your evaluation as a JSON object with this exact structure:
${jsonStructure}`;

  const task = data.task || '';
  const output = data.output || data.outcome || '';

  let toolUsageSection = '';
  if (data.tool_usage && data.tool_usage.length > 0) {
    toolUsageSection =
      '\n\nTools used during execution:\n' +
      data.tool_usage
        .map(
          (tool) =>
            `- **${tool.name}**: ${tool.purpose} (${tool.success ? '✅ success' : '❌ failed'})`,
        )
        .join('\n');
  } else {
    toolUsageSection = '\n\nNo tools were used during execution.';
  }

  const userPrompt = `Task: ${task}

Output: ${output}${toolUsageSection}

Please evaluate how well the output fulfills the task requirements.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

// Export as default for template loader compatibility
export default getTaskCompletionMainTemplate;
