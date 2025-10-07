import type {
  ContextualPrecisionTemplateConfig,
  ContextualPrecisionTemplateData,
} from '@server/connectors/evaluations/contextual-precision/types';
import { contextualPrecisionScoringText } from '@server/connectors/evaluations/contextual-precision/types';

export function getContextualPrecisionTemplate(
  data: ContextualPrecisionTemplateData,
): ContextualPrecisionTemplateConfig {
  const verboseInstruction = data.verbose_mode
    ? '\nPlease provide detailed step-by-step reasoning for your evaluation, including specific examples from the context and answer.'
    : '';

  const jsonStructure = data.include_reason
    ? `{
  "criteria": {
    "precision_score": <number between 0.0 and 1.0>,
    "uses_relevant_info": <true|false>,
    "avoids_irrelevant_info": <true|false>,
    "focused_response": <true|false>,
    "unnecessary_details": <true|false>
  },
  "score": <number between 0.0 and 1.0>,
  "reasoning": "<detailed explanation of your evaluation>",
  "overall_success": <true|false>
}`
    : `{
  "criteria": {
    "precision_score": <number between 0.0 and 1.0>,
    "uses_relevant_info": <true|false>,
    "avoids_irrelevant_info": <true|false>,
    "focused_response": <true|false>,
    "unnecessary_details": <true|false>
  },
  "score": <number between 0.0 and 1.0>,
  "overall_success": <true|false>
}`;

  const systemPrompt = `You are an expert evaluator assessing whether an AI assistant's answer demonstrates contextual precision.

Evaluate contextual precision based on the following criteria:
1. Relevant Information Usage: Does the answer only use relevant information from the context?
2. Irrelevant Information Avoidance: Does the answer avoid irrelevant details that don't contribute to answering the question?
3. Focused Response: Is the information presented in a precise and focused manner?
4. Unnecessary Details: Does the answer avoid unnecessary or tangential information?${verboseInstruction}

Contextual Precision Scoring Guidelines:
${contextualPrecisionScoringText}

Provide your evaluation as a JSON object with this exact structure:
${jsonStructure}`;

  const retrievalContextSection = data.retrieval_context
    ? `\n\nRetrieval Context:\n${data.retrieval_context}`
    : '';

  const userPrompt = `Context: ${data.context}

Answer: ${data.answer}${retrievalContextSection}

Please evaluate how precise the answer is in using only relevant information from the context.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

export default getContextualPrecisionTemplate;
