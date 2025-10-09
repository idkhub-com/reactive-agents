import type { ConversationCompletenessEvaluationParameters } from '@shared/types/idkhub/evaluations/conversation-completeness';

/**
 * Default evaluation criteria for conversation completeness
 */
export const defaultConversationCompletenessCriteria = [
  'Extract all user intentions from the conversation',
  'Identify what the user is trying to accomplish',
  'Assess whether each user intention was satisfied by the assistant',
  'Evaluate the completeness of the conversation in addressing user needs',
  'Check for unresolved user requests or incomplete responses',
  'Calculate the conversation completeness score based on the formula: (Number of Satisfied User Intentions) / (Total Number of User Intentions)',
];

/**
 * Default scoring guidelines for conversation completeness
 */
export const defaultConversationCompletenessScoringGuidelines = [
  '1.0: Perfect completeness - all user intentions fully satisfied',
  '0.9: Excellent completeness - minor issues but exceeds expectations',
  '0.7-0.8: Good completeness - most user intentions satisfied',
  '0.5-0.6: Adequate completeness - basic user needs met',
  '0.3-0.4: Poor completeness - significant user intentions unaddressed',
  '0.0-0.2: Failed completeness - user intentions not satisfied',
];

/**
 * Generate the system prompt for conversation completeness evaluation
 */
export function generateConversationCompletenessSystemPrompt(
  _parameters: ConversationCompletenessEvaluationParameters,
): string {
  const criteria = defaultConversationCompletenessCriteria;
  const guidelines = defaultConversationCompletenessScoringGuidelines;

  return `You are an expert evaluator specializing in conversation completeness assessment for multi-turn conversations. Your task is to evaluate how well an AI assistant completes conversations by satisfying user needs throughout the interaction.

EVALUATION CRITERIA:
${criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n')}

SCORING GUIDELINES:
${guidelines.map((guideline, index) => `${index + 1}. ${guideline}`).join('\n')}

Your evaluation should focus on whether the assistant successfully addresses and satisfies all user intentions throughout the conversation.`;
}

/**
 * Generate the user prompt for conversation completeness evaluation
 */
export function generateConversationCompletenessUserPrompt(
  context: string,
  response: string,
): string {
  return `Please evaluate the conversation completeness of the following interaction.

CONVERSATION:
${context}

ASSISTANT RESPONSE:
${response}

Evaluate how well the assistant completes the conversation by satisfying user needs. Consider:
- Whether all user intentions were identified and addressed
- If the conversation feels complete and resolved
- Whether there are any unresolved user requests
- The overall satisfaction of user needs throughout the conversation

Provide a score between 0 and 1 with detailed reasoning for your evaluation.`;
}
