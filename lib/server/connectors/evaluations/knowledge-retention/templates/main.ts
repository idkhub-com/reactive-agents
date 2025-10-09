import type { KnowledgeRetentionEvaluationParameters } from '@shared/types/idkhub/evaluations/knowledge-retention';

// Default evaluation criteria for knowledge retention
export const defaultKnowledgeRetentionCriteria = [
  'Extract all factual information provided by the user throughout the conversation',
  'Identify key details, numbers, names, dates, and specific facts mentioned by the user',
  'Assess whether the assistant demonstrates knowledge retention or shows knowledge attrition',
  'Check for consistency in recalling previously mentioned information',
  "Evaluate the assistant's ability to maintain context across multiple turns",
  'Determine if the assistant can accurately reference earlier parts of the conversation',
];

// Default scoring guidelines for knowledge retention
export const defaultKnowledgeRetentionScoringGuidelines = [
  'Score 1.0: Perfect knowledge retention - assistant recalls all information without any attrition',
  'Score 0.8-0.9: Excellent retention - minor knowledge attrition, most information retained',
  'Score 0.6-0.7: Good retention - some knowledge attrition but core information maintained',
  'Score 0.4-0.5: Adequate retention - moderate knowledge attrition, partial information retained',
  'Score 0.2-0.3: Poor retention - significant knowledge attrition, most information lost',
  'Score 0.0-0.1: Very poor retention - complete knowledge attrition, no information retained',
];

/**
 * Generate the system prompt for knowledge retention evaluation
 */
export function generateKnowledgeRetentionSystemPrompt(
  _parameters: KnowledgeRetentionEvaluationParameters,
): string {
  const criteria = defaultKnowledgeRetentionCriteria;
  const guidelines = defaultKnowledgeRetentionScoringGuidelines;

  return `You are an expert evaluator specializing in knowledge retention assessment for multi-turn conversations. Your task is to evaluate how well an AI assistant retains and recalls information provided by the user throughout the conversation.

EVALUATION CRITERIA:
${criteria.map((criterion, index) => `${index + 1}. ${criterion}`).join('\n')}

SCORING GUIDELINES:
${guidelines.map((guideline, index) => `${index + 1}. ${guideline}`).join('\n')}

EVALUATION PROCESS:
1. Extract all factual information provided by the user throughout the conversation
2. Identify key details, numbers, names, dates, and specific facts mentioned by the user
3. Assess whether the assistant demonstrates knowledge retention or shows knowledge attrition
4. Check for consistency in recalling previously mentioned information
5. Evaluate the assistant's ability to maintain context across multiple turns
6. Calculate the knowledge retention score based on the formula: (Number of Assistant Turns without Knowledge Attritions) / (Total Number of Assistant Turns)

Provide your evaluation as a JSON object with the following structure:
{
  "score": <number between 0 and 1>,
  "reasoning": "<detailed explanation of the score>",
  "knowledgeRetention": {
    "extractedKnowledge": ["<list of key facts and information provided by user>"],
    "assistantTurnsWithoutAttrition": <number>,
    "totalAssistantTurns": <number>,
    "knowledgeAttritionDetails": ["<specific instances of knowledge attrition>"],
    "retentionAccuracy": <number between 0 and 1>,
    "contextConsistency": <number between 0 and 1>
  }
}`;
}

/**
 * Generate the user prompt for knowledge retention evaluation
 */
export function generateKnowledgeRetentionUserPrompt(
  context: string,
  response: string,
): string {
  return `Please evaluate the knowledge retention quality of the following multi-turn conversation.

CONVERSATION:
${context}

ASSISTANT RESPONSE:
${response}

Evaluate how well the assistant retains and recalls information provided by the user throughout the conversation. Focus on:
1. Whether the assistant demonstrates knowledge retention or shows knowledge attrition
2. Consistency in recalling previously mentioned information
3. Ability to maintain context across multiple turns
4. Specific instances where information was retained or lost

Calculate the knowledge retention score using the formula: (Number of Assistant Turns without Knowledge Attritions) / (Total Number of Assistant Turns)`;
}

/**
 * Get the main template for knowledge retention evaluation
 */
export function getKnowledgeRetentionMainTemplate(
  parameters: KnowledgeRetentionEvaluationParameters,
  context: string,
  response: string,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: generateKnowledgeRetentionSystemPrompt(parameters),
    userPrompt: generateKnowledgeRetentionUserPrompt(context, response),
  };
}
