/**
 * Generic LLM Judge defaults - only for fallback criteria-based evaluation
 * Each evaluation method should define its own scoring guidelines
 */

export const genericScoringGuidelines = {
  excellent: '0.9-1.0: Excellent, exceeds expectations',
  good: '0.7-0.8: Good, meets expectations',
  adequate: '0.5-0.6: Adequate, partially meets expectations',
  poor: '0.3-0.4: Poor, below expectations',
  veryPoor: '0.0-0.2: Very poor, fails to meet expectations',
} as const;

export const scoringGuidelinesText = Object.values(genericScoringGuidelines)
  .map((guideline) => `- ${guideline}`)
  .join('\n');

/**
 * Evaluation criteria for different types of content
 */
export const evaluationCriteria = {
  general: [
    'Accuracy and relevance of the information',
    'Completeness of the response',
    'Clarity and coherence',
    'Adherence to best practices',
  ],
  code: [
    'Code correctness and logic',
    'Readability and maintainability',
    'Performance considerations',
    'Best practices adherence',
    'Security considerations',
  ],
  conversation: [
    'Helpfulness and accuracy',
    'Safety and appropriateness',
    'Clarity and completeness',
    'User satisfaction',
  ],
  text: [
    'Grammar and spelling',
    'Clarity and coherence',
    'Style and tone',
    'Content relevance',
    'Structure and organization',
  ],
  response: [
    'Accuracy and relevance',
    'Completeness and thoroughness',
    'Clarity and understandability',
    'Helpfulness and usefulness',
  ],
} as const;
